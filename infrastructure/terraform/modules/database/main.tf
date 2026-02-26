# Database Module - Azure Database for PostgreSQL Flexible Server

resource "random_password" "postgres" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "azurerm_postgresql_flexible_server" "main" {
  name                = "psql-${var.project_name}-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  version             = var.postgresql_version

  # VNet integration - enable for production private networking
  delegated_subnet_id = var.enable_vnet_integration ? var.subnet_id : null
  private_dns_zone_id = var.enable_vnet_integration ? var.private_dns_zone_id : null

  administrator_login    = "psqladmin"
  administrator_password = random_password.postgres.result
  storage_mb             = var.storage_mb
  sku_name               = var.sku_name
  backup_retention_days  = 7

  # High Availability - enable for production zone-redundant failover
  dynamic "high_availability" {
    for_each = var.enable_high_availability ? [1] : []
    content {
      mode = "ZoneRedundant"
    }
  }

  tags = var.tags

  lifecycle {
    ignore_changes = [
      zone,
      high_availability[0].standby_availability_zone
    ]
  }
}

resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = var.db_name
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "UTF8"
}

# Allow Azure services to connect to the database
resource "azurerm_postgresql_flexible_server_firewall_rule" "azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# Configure server parameters for better performance
resource "azurerm_postgresql_flexible_server_configuration" "timezone" {
  name      = "timezone"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "UTC"
}

resource "azurerm_postgresql_flexible_server_configuration" "log_connections" {
  name      = "log_connections"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "on"
}

resource "azurerm_postgresql_flexible_server_configuration" "log_disconnections" {
  name      = "log_disconnections"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "on"
}


