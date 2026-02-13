# Cache Module - Azure Cache for Redis

resource "azurerm_redis_cache" "main" {
  name                = "redis-${var.project_name}-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  capacity            = var.capacity
  family              = var.family
  sku_name            = var.sku_name
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"

  redis_configuration {
    maxmemory_reserved = 10
    maxmemory_delta    = 10
    maxmemory_policy   = "allkeys-lru"
  }

  tags = var.tags
}
