# ==============================================================================
# Terraform Outputs for GuessLyfe GCP Infrastructure
# ==============================================================================

# ==============================================================================
# Cloud Run Outputs
# ==============================================================================

output "cloud_run_url" {
  description = "URL of the deployed Cloud Run service"
  value       = google_cloud_run_v2_service.api.uri
}

output "cloud_run_service_name" {
  description = "Name of the Cloud Run service"
  value       = google_cloud_run_v2_service.api.name
}

output "service_account_email" {
  description = "Email of the Cloud Run service account"
  value       = google_service_account.api_service_account.email
}

# ==============================================================================
# Cloud SQL Outputs
# ==============================================================================

output "database_instance_name" {
  description = "Name of the Cloud SQL instance"
  value       = google_sql_database_instance.postgres.name
}

output "database_connection_name" {
  description = "Connection name for Cloud SQL instance"
  value       = google_sql_database_instance.postgres.connection_name
}

output "database_name" {
  description = "Name of the database"
  value       = google_sql_database.database.name
}

output "database_username" {
  description = "Database username"
  value       = google_sql_user.user.name
}

output "database_private_ip" {
  description = "Private IP address of the Cloud SQL instance"
  value       = google_sql_database_instance.postgres.private_ip_address
}

# ==============================================================================
# Redis Outputs
# ==============================================================================

output "redis_instance_name" {
  description = "Name of the Redis instance"
  value       = google_redis_instance.cache.name
}

output "redis_host" {
  description = "Host address of the Redis instance"
  value       = google_redis_instance.cache.host
}

output "redis_port" {
  description = "Port of the Redis instance"
  value       = google_redis_instance.cache.port
}

output "redis_connection_string" {
  description = "Redis connection string"
  value       = "${google_redis_instance.cache.host}:${google_redis_instance.cache.port}"
}

# ==============================================================================
# Network Outputs
# ==============================================================================

output "vpc_network_name" {
  description = "Name of the VPC network"
  value       = google_compute_network.vpc_network.name
}

output "vpc_connector_name" {
  description = "Name of the VPC connector"
  value       = google_vpc_access_connector.connector.name
}

output "vpc_connector_id" {
  description = "ID of the VPC connector"
  value       = google_vpc_access_connector.connector.id
}

# ==============================================================================
# Artifact Registry Outputs
# ==============================================================================

output "artifact_registry_repository" {
  description = "Name of the Artifact Registry repository"
  value       = google_artifact_registry_repository.docker_repo.name
}

output "artifact_registry_url" {
  description = "URL of the Artifact Registry repository"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.name}"
}

# ==============================================================================
# Deployment Information
# ==============================================================================

output "deployment_summary" {
  description = "Summary of deployed resources"
  value = {
    project_id     = var.project_id
    region         = var.region
    api_url        = google_cloud_run_v2_service.api.uri
    database       = "${google_sql_database_instance.postgres.connection_name}/${google_sql_database.database.name}"
    redis          = "${google_redis_instance.cache.host}:${google_redis_instance.cache.port}"
    artifact_registry = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.name}"
  }
}

# ==============================================================================
# Next Steps
# ==============================================================================

output "next_steps" {
  description = "Next steps after infrastructure deployment"
  value = <<-EOT
    Infrastructure deployment complete!

    Next steps:
    1. Build and push Docker image:
       docker build -t ${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.name}/guessly-api:latest .
       docker push ${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.name}/guessly-api:latest

    2. Update secrets in Secret Manager:
       ./deploy/setup-secrets.sh ${var.project_id}

    3. Access the API:
       curl ${google_cloud_run_v2_service.api.uri}/api/v1/health

    4. View logs:
       gcloud run services logs read ${google_cloud_run_v2_service.api.name} --region ${var.region}

    5. Update service:
       gcloud run services update ${google_cloud_run_v2_service.api.name} --region ${var.region} --image NEW_IMAGE
  EOT
}
