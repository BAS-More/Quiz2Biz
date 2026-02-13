variable "project_name" {
  description = "Name of the project, used in resource naming"
  type        = string
  default     = "questionnaire"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "westus2"
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "Adaptive Questionnaire System"
    ManagedBy   = "Terraform"
    Environment = "Development"
  }
}

# Networking
variable "vnet_address_space" {
  description = "Address space for the virtual network"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "subnet_app_prefix" {
  description = "Address prefix for the application subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "subnet_db_prefix" {
  description = "Address prefix for the database subnet"
  type        = string
  default     = "10.0.2.0/24"
}

variable "subnet_cache_prefix" {
  description = "Address prefix for the cache subnet"
  type        = string
  default     = "10.0.3.0/24"
}

# Database
variable "postgresql_sku_name" {
  description = "SKU name for PostgreSQL Flexible Server"
  type        = string
  default     = "B_Standard_B1ms"
}

variable "postgresql_storage_mb" {
  description = "Storage size in MB for PostgreSQL"
  type        = number
  default     = 32768
}

variable "postgresql_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "15"
}

variable "db_name" {
  description = "Name of the application database"
  type        = string
  default     = "questionnaire"
}

# Redis
variable "redis_sku_name" {
  description = "SKU name for Redis Cache"
  type        = string
  default     = "Standard"
}

variable "redis_capacity" {
  description = "Redis cache capacity (0-6 for Basic/Standard)"
  type        = number
  default     = 0
}

variable "redis_family" {
  description = "Redis cache family (C for Basic/Standard)"
  type        = string
  default     = "C"
}

# Container Apps
variable "container_cpu" {
  description = "CPU allocation for container (in cores)"
  type        = number
  default     = 0.5
}

variable "container_memory" {
  description = "Memory allocation for container"
  type        = string
  default     = "1Gi"
}

variable "container_min_replicas" {
  description = "Minimum number of container replicas"
  type        = number
  default     = 1
}

variable "container_max_replicas" {
  description = "Maximum number of container replicas"
  type        = number
  default     = 3
}

# Container Registry
variable "acr_sku" {
  description = "SKU for Azure Container Registry"
  type        = string
  default     = "Basic"
}
