# Terraform Outputs - Adaptive Questionnaire System

# Resource Group
output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "resource_group_location" {
  description = "Location of the resource group"
  value       = azurerm_resource_group.main.location
}

# Networking
output "vnet_id" {
  description = "ID of the Virtual Network"
  value       = module.networking.vnet_id
}

output "vnet_name" {
  description = "Name of the Virtual Network"
  value       = module.networking.vnet_name
}

# Container Registry
output "acr_login_server" {
  description = "ACR login server URL"
  value       = module.registry.acr_login_server
}

output "acr_name" {
  description = "Name of the Container Registry"
  value       = module.registry.acr_name
}

# Database
output "postgresql_server_name" {
  description = "Name of the PostgreSQL server"
  value       = module.database.server_name
}

output "postgresql_server_fqdn" {
  description = "FQDN of the PostgreSQL server"
  value       = module.database.server_fqdn
}

output "postgresql_database_name" {
  description = "Name of the database"
  value       = module.database.database_name
}

# Redis
output "redis_hostname" {
  description = "Redis hostname"
  value       = module.cache.redis_hostname
}

output "redis_ssl_port" {
  description = "Redis SSL port"
  value       = module.cache.redis_ssl_port
}

# Key Vault
output "key_vault_name" {
  description = "Name of the Key Vault"
  value       = module.keyvault.key_vault_name
}

output "key_vault_uri" {
  description = "URI of the Key Vault"
  value       = module.keyvault.key_vault_uri
}

# Monitoring
output "log_analytics_workspace_name" {
  description = "Name of the Log Analytics workspace"
  value       = module.monitoring.log_analytics_workspace_name
}

output "application_insights_name" {
  description = "Name of Application Insights"
  value       = module.monitoring.application_insights_name
}

# Container Apps
output "container_app_environment_name" {
  description = "Name of the Container App Environment"
  value       = module.container_apps.environment_name
}

output "api_container_app_name" {
  description = "Name of the API Container App"
  value       = module.container_apps.api_name
}

output "api_url" {
  description = "URL of the API"
  value       = module.container_apps.api_url
}

output "api_fqdn" {
  description = "FQDN of the API"
  value       = module.container_apps.api_fqdn
}

# Connection Info (for developers)
output "connection_info" {
  description = "Connection information for local development"
  value = {
    api_url        = module.container_apps.api_url
    health_check   = "${module.container_apps.api_url}/health"
    swagger_docs   = "${module.container_apps.api_url}/docs"
    acr_repository = "${module.registry.acr_login_server}/questionnaire-api"
  }
}
