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

variable "database_url" {
  description = "Database connection URL to store"
  type        = string
  sensitive   = true
}

variable "redis_password" {
  description = "Redis password to store"
  type        = string
  sensitive   = true
}

variable "container_app_identity_id" {
  description = "Object ID of the Container App managed identity"
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
