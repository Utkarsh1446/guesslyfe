# ==============================================================================
# Terraform Variables for GuessLyfe GCP Infrastructure
# ==============================================================================

# ==============================================================================
# General Configuration
# ==============================================================================

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone for resources"
  type        = string
  default     = "us-central1-a"
}

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  default     = "production"
}

# ==============================================================================
# Network Configuration
# ==============================================================================

variable "use_default_network" {
  description = "Whether to use the default network or create a custom one"
  type        = bool
  default     = false
}

# ==============================================================================
# Cloud Run Configuration
# ==============================================================================

variable "container_image" {
  description = "Container image to deploy (e.g., us-central1-docker.pkg.dev/PROJECT_ID/guessly/guessly-api:latest)"
  type        = string
}

variable "min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 1
}

variable "max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 10
}

variable "cpu" {
  description = "Number of CPUs for each instance"
  type        = string
  default     = "2"
}

variable "memory" {
  description = "Memory allocation for each instance"
  type        = string
  default     = "2Gi"
}

variable "request_timeout" {
  description = "Request timeout in seconds"
  type        = number
  default     = 300
}

variable "concurrency" {
  description = "Maximum number of concurrent requests per instance"
  type        = number
  default     = 80
}

# ==============================================================================
# Cloud SQL Configuration
# ==============================================================================

variable "db_tier" {
  description = "Cloud SQL instance tier"
  type        = string
  default     = "db-f1-micro"  # Change to db-custom-2-7680 for production
}

variable "db_password" {
  description = "Database password (use Secret Manager in production)"
  type        = string
  sensitive   = true
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for Cloud SQL"
  type        = bool
  default     = true
}

# ==============================================================================
# Memorystore (Redis) Configuration
# ==============================================================================

variable "redis_tier" {
  description = "Redis tier (BASIC or STANDARD_HA)"
  type        = string
  default     = "BASIC"  # Use STANDARD_HA for production
}

variable "redis_memory_size_gb" {
  description = "Redis memory size in GB"
  type        = number
  default     = 1
}

# ==============================================================================
# Labels
# ==============================================================================

variable "labels" {
  description = "Labels to apply to resources"
  type        = map(string)
  default = {
    app       = "guessly"
    managed_by = "terraform"
  }
}
