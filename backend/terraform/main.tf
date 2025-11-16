# ==============================================================================
# Terraform Configuration for GuessLyfe GCP Infrastructure
# ==============================================================================
#
# This Terraform configuration provisions all GCP resources for GuessLyfe:
# - Cloud Run service
# - Cloud SQL (PostgreSQL)
# - Memorystore (Redis)
# - VPC Connector
# - Service Account
# - Artifact Registry
# - Secret Manager secrets
#
# Usage:
#   terraform init
#   terraform plan
#   terraform apply
#
# ==============================================================================

terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Uncomment to use GCS backend for state storage
  # backend "gcs" {
  #   bucket = "your-terraform-state-bucket"
  #   prefix = "terraform/state"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ==============================================================================
# Enable Required APIs
# ==============================================================================

resource "google_project_service" "required_apis" {
  for_each = toset([
    "cloudbuild.googleapis.com",
    "run.googleapis.com",
    "sql-component.googleapis.com",
    "sqladmin.googleapis.com",
    "redis.googleapis.com",
    "vpcaccess.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "compute.googleapis.com",
    "servicenetworking.googleapis.com",
  ])

  project = var.project_id
  service = each.value

  disable_on_destroy = false
}

# ==============================================================================
# Service Account
# ==============================================================================

resource "google_service_account" "api_service_account" {
  account_id   = "guessly-api"
  display_name = "GuessLyfe API Service Account"
  description  = "Service account for GuessLyfe API Cloud Run service"
  project      = var.project_id
}

resource "google_project_iam_member" "api_service_account_roles" {
  for_each = toset([
    "roles/cloudsql.client",
    "roles/secretmanager.secretAccessor",
    "roles/logging.logWriter",
    "roles/cloudtrace.agent",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.api_service_account.email}"
}

# ==============================================================================
# Artifact Registry
# ==============================================================================

resource "google_artifact_registry_repository" "docker_repo" {
  location      = var.region
  repository_id = "guessly"
  description   = "Docker images for GuessLyfe API"
  format        = "DOCKER"
  project       = var.project_id

  labels = {
    app       = "guessly"
    component = "repository"
  }

  depends_on = [google_project_service.required_apis]
}

# ==============================================================================
# VPC Connector
# ==============================================================================

resource "google_vpc_access_connector" "connector" {
  name    = "guessly-connector"
  region  = var.region
  project = var.project_id

  subnet {
    name = google_compute_subnetwork.vpc_subnet.name
  }

  machine_type  = "f1-micro"
  min_instances = 2
  max_instances = 10

  depends_on = [google_project_service.required_apis]
}

resource "google_compute_network" "vpc_network" {
  name                    = var.use_default_network ? "default" : "guessly-network"
  auto_create_subnetworks = false
  project                 = var.project_id
}

resource "google_compute_subnetwork" "vpc_subnet" {
  name          = "guessly-subnet"
  ip_cidr_range = "10.8.0.0/28"
  region        = var.region
  network       = google_compute_network.vpc_network.id
  project       = var.project_id
}

# ==============================================================================
# Cloud SQL (PostgreSQL)
# ==============================================================================

resource "google_sql_database_instance" "postgres" {
  name             = "guessly-db"
  database_version = "POSTGRES_15"
  region           = var.region
  project          = var.project_id

  settings {
    tier = var.db_tier

    backup_configuration {
      enabled            = true
      start_time         = "03:00"
      point_in_time_recovery_enabled = true
    }

    maintenance_window {
      day          = 7  # Sunday
      hour         = 4
      update_track = "stable"
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc_network.id
      require_ssl     = true
    }

    database_flags {
      name  = "max_connections"
      value = "100"
    }
  }

  deletion_protection = var.enable_deletion_protection

  depends_on = [
    google_project_service.required_apis,
    google_service_networking_connection.private_vpc_connection,
  ]
}

resource "google_sql_database" "database" {
  name     = "guessly"
  instance = google_sql_database_instance.postgres.name
  project  = var.project_id
}

resource "google_sql_user" "user" {
  name     = "guessly"
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
  project  = var.project_id
}

# Private Service Connection for Cloud SQL
resource "google_compute_global_address" "private_ip_address" {
  name          = "guessly-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc_network.id
  project       = var.project_id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc_network.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]

  depends_on = [google_project_service.required_apis]
}

# ==============================================================================
# Memorystore (Redis)
# ==============================================================================

resource "google_redis_instance" "cache" {
  name           = "guessly-redis"
  tier           = var.redis_tier
  memory_size_gb = var.redis_memory_size_gb
  region         = var.region
  project        = var.project_id

  redis_version = "REDIS_7_0"

  authorized_network = google_compute_network.vpc_network.id

  labels = {
    app       = "guessly"
    component = "cache"
  }

  depends_on = [google_project_service.required_apis]
}

# ==============================================================================
# Secret Manager Secrets
# ==============================================================================

resource "google_secret_manager_secret" "secrets" {
  for_each = toset([
    "jwt-secret",
    "jwt-refresh-secret",
    "db-password",
    "blockchain-private-key",
    "twitter-client-id",
    "twitter-client-secret",
    "twitter-bearer-token",
    "sendgrid-api-key",
    "sentry-dsn",
    "admin-password",
  ])

  secret_id = each.value
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    app = "guessly"
  }

  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret_iam_member" "secret_access" {
  for_each = google_secret_manager_secret.secrets

  secret_id = each.value.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api_service_account.email}"
  project   = var.project_id
}

# ==============================================================================
# Cloud Run Service
# ==============================================================================

resource "google_cloud_run_v2_service" "api" {
  name     = "guessly-api"
  location = var.region
  project  = var.project_id

  template {
    service_account = google_service_account.api_service_account.email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = var.container_image

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
      }

      ports {
        container_port = 3000
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "PORT"
        value = "3000"
      }

      env {
        name  = "API_PREFIX"
        value = "api/v1"
      }

      env {
        name  = "DB_HOST"
        value = "/cloudsql/${google_sql_database_instance.postgres.connection_name}"
      }

      env {
        name  = "DB_PORT"
        value = "5432"
      }

      env {
        name  = "DB_USERNAME"
        value = google_sql_user.user.name
      }

      env {
        name  = "DB_DATABASE"
        value = google_sql_database.database.name
      }

      env {
        name  = "REDIS_HOST"
        value = google_redis_instance.cache.host
      }

      env {
        name  = "REDIS_PORT"
        value = tostring(google_redis_instance.cache.port)
      }

      # Secrets
      dynamic "env" {
        for_each = {
          JWT_SECRET                    = "jwt-secret"
          JWT_REFRESH_SECRET            = "jwt-refresh-secret"
          DB_PASSWORD                   = "db-password"
          BLOCKCHAIN_PROVIDER_PRIVATE_KEY = "blockchain-private-key"
          TWITTER_CLIENT_ID             = "twitter-client-id"
          TWITTER_CLIENT_SECRET         = "twitter-client-secret"
          TWITTER_BEARER_TOKEN          = "twitter-bearer-token"
          SENDGRID_API_KEY              = "sendgrid-api-key"
          SENTRY_DSN                    = "sentry-dsn"
        }

        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.secrets[env.value].secret_id
              version = "latest"
            }
          }
        }
      }
    }

    timeout = "${var.request_timeout}s"
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_project_service.required_apis,
    google_sql_database_instance.postgres,
    google_redis_instance.cache,
    google_vpc_access_connector.connector,
  ]
}

# Allow unauthenticated access
resource "google_cloud_run_service_iam_member" "public_access" {
  location = google_cloud_run_v2_service.api.location
  service  = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
  project  = var.project_id
}
