output "key_vault_id" {
  description = "ID of the Key Vault"
  value       = azurerm_key_vault.main.id
}

output "key_vault_name" {
  description = "Name of the Key Vault"
  value       = azurerm_key_vault.main.name
}

output "key_vault_uri" {
  description = "URI of the Key Vault"
  value       = azurerm_key_vault.main.vault_uri
}

output "secret_database_url_id" {
  description = "ID of the DATABASE_URL secret"
  value       = azurerm_key_vault_secret.database_url.id
}

output "secret_jwt_secret_id" {
  description = "ID of the JWT_SECRET secret"
  value       = azurerm_key_vault_secret.jwt_secret.id
}

output "secret_jwt_refresh_secret_id" {
  description = "ID of the JWT_REFRESH_SECRET secret"
  value       = azurerm_key_vault_secret.jwt_refresh_secret.id
}

output "jwt_secret" {
  description = "JWT secret value"
  value       = random_password.jwt_secret.result
  sensitive   = true
}

output "jwt_refresh_secret" {
  description = "JWT refresh secret value"
  value       = random_password.jwt_refresh_secret.result
  sensitive   = true
}
