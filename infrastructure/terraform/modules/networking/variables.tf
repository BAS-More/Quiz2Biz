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

variable "address_space" {
  description = "Address space for the VNet"
  type        = list(string)
}

variable "subnet_app_prefix" {
  description = "Address prefix for app subnet"
  type        = string
}

variable "subnet_db_prefix" {
  description = "Address prefix for database subnet"
  type        = string
}

variable "subnet_cache_prefix" {
  description = "Address prefix for cache subnet"
  type        = string
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
