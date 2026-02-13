output "environment_id" {
  description = "ID of the Container App Environment"
  value       = azurerm_container_app_environment.main.id
}

output "environment_name" {
  description = "Name of the Container App Environment"
  value       = azurerm_container_app_environment.main.name
}

output "api_id" {
  description = "ID of the API Container App"
  value       = azurerm_container_app.api.id
}

output "api_name" {
  description = "Name of the API Container App"
  value       = azurerm_container_app.api.name
}

output "api_fqdn" {
  description = "FQDN of the API Container App"
  value       = azurerm_container_app.api.ingress[0].fqdn
}

output "api_url" {
  description = "URL of the API Container App"
  value       = "https://${azurerm_container_app.api.ingress[0].fqdn}"
}

output "api_identity_principal_id" {
  description = "Principal ID of the API managed identity"
  value       = azurerm_container_app.api.identity[0].principal_id
}

output "api_latest_revision_name" {
  description = "Name of the latest revision"
  value       = azurerm_container_app.api.latest_revision_name
}

# Canary Deployment Outputs
output "api_revision_mode" {
  description = "Revision mode of the API Container App"
  value       = azurerm_container_app.api.revision_mode
}

output "canary_deployment_enabled" {
  description = "Whether canary deployment is enabled"
  value       = var.enable_canary_deployment
}

output "canary_traffic_percentage" {
  description = "Current percentage of traffic routed to canary"
  value       = var.canary_traffic_percentage
}
