variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "subnet_id" {
  description = "ID of the subnet for Container Apps"
  type        = string
}

variable "log_analytics_workspace_id" {
  description = "ID of the Log Analytics workspace"
  type        = string
}

variable "container_image" {
  description = "Container image to deploy"
  type        = string
}

variable "cpu" {
  description = "CPU allocation for container"
  type        = number
  default     = 0.5
}

variable "memory" {
  description = "Memory allocation for container"
  type        = string
  default     = "1Gi"
}

variable "min_replicas" {
  description = "Minimum number of replicas"
  type        = number
  default     = 1
}

variable "max_replicas" {
  description = "Maximum number of replicas"
  type        = number
  default     = 3
}

variable "acr_login_server" {
  description = "ACR login server URL"
  type        = string
}

variable "acr_admin_username" {
  description = "ACR admin username"
  type        = string
  sensitive   = true
}

variable "acr_admin_password" {
  description = "ACR admin password"
  type        = string
  sensitive   = true
}

variable "database_url" {
  description = "Database connection URL"
  type        = string
  sensitive   = true
}

variable "redis_hostname" {
  description = "Redis hostname"
  type        = string
}

variable "redis_ssl_port" {
  description = "Redis SSL port"
  type        = number
  default     = 6380
}

variable "redis_password" {
  description = "Redis password"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT secret"
  type        = string
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "JWT refresh secret"
  type        = string
  sensitive   = true
}

variable "app_insights_connection_string" {
  description = "Application Insights connection string"
  type        = string
  sensitive   = true
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# Canary Deployment Variables
variable "enable_canary_deployment" {
  description = "Enable canary deployment with multiple revisions"
  type        = bool
  default     = false
}

variable "stable_revision_name" {
  description = "Name suffix of the stable revision for canary deployment"
  type        = string
  default     = ""
}

variable "canary_traffic_percentage" {
  description = "Percentage of traffic to route to canary revision (5, 25, 50, or 100)"
  type        = number
  default     = 0

  validation {
    condition     = contains([0, 5, 25, 50, 100], var.canary_traffic_percentage)
    error_message = "Canary traffic percentage must be 0, 5, 25, 50, or 100."
  }
}
