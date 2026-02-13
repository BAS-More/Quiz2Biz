output "vnet_id" {
  description = "ID of the virtual network"
  value       = azurerm_virtual_network.main.id
}

output "vnet_name" {
  description = "Name of the virtual network"
  value       = azurerm_virtual_network.main.name
}

output "subnet_app_id" {
  description = "ID of the application subnet"
  value       = azurerm_subnet.app.id
}

output "subnet_db_id" {
  description = "ID of the database subnet"
  value       = azurerm_subnet.db.id
}

output "subnet_cache_id" {
  description = "ID of the cache subnet"
  value       = azurerm_subnet.cache.id
}

output "private_dns_zone_postgres_id" {
  description = "ID of the PostgreSQL private DNS zone"
  value       = azurerm_private_dns_zone.postgres.id
}

output "private_dns_zone_postgres_name" {
  description = "Name of the PostgreSQL private DNS zone"
  value       = azurerm_private_dns_zone.postgres.name
}
