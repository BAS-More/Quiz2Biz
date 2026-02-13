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

variable "sku_name" {
  description = "SKU name for Redis"
  type        = string
  default     = "Standard"
}

variable "capacity" {
  description = "Redis capacity"
  type        = number
  default     = 0
}

variable "family" {
  description = "Redis family"
  type        = string
  default     = "C"
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
