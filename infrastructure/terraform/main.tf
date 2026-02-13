# Main Terraform Configuration - Adaptive Questionnaire System
# Azure Infrastructure for Development Environment

locals {
  name_prefix = "${var.project_name}-${var.environment}"
  common_tags = merge(var.tags, {
    Environment = var.environment
    Project     = var.project_name
  })
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "rg-${local.name_prefix}"
  location = var.location

  tags = local.common_tags
}

# Networking Module
module "networking" {
  source = "./modules/networking"

  project_name        = var.project_name
  environment         = var.environment
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = var.vnet_address_space
  subnet_app_prefix   = var.subnet_app_prefix
  subnet_db_prefix    = var.subnet_db_prefix
  subnet_cache_prefix = var.subnet_cache_prefix
  tags                = local.common_tags
}

# Monitoring Module
module "monitoring" {
  source = "./modules/monitoring"

  project_name        = var.project_name
  environment         = var.environment
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.common_tags
}

# Container Registry Module
module "registry" {
  source = "./modules/registry"

  project_name        = var.project_name
  environment         = var.environment
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = var.acr_sku
  tags                = local.common_tags
}

# Database Module
module "database" {
  source = "./modules/database"

  project_name        = var.project_name
  environment         = var.environment
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  subnet_id           = module.networking.subnet_db_id
  private_dns_zone_id = module.networking.private_dns_zone_postgres_id
  sku_name            = var.postgresql_sku_name
  storage_mb          = var.postgresql_storage_mb
  postgresql_version  = var.postgresql_version
  db_name             = var.db_name
  tags                = local.common_tags

  depends_on = [module.networking]
}

# Cache Module
module "cache" {
  source = "./modules/cache"

  project_name        = var.project_name
  environment         = var.environment
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  sku_name            = var.redis_sku_name
  capacity            = var.redis_capacity
  family              = var.redis_family
  tags                = local.common_tags
}

# Key Vault Module
module "keyvault" {
  source = "./modules/keyvault"

  project_name        = var.project_name
  environment         = var.environment
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  database_url        = module.database.connection_string
  redis_password      = module.cache.redis_primary_access_key
  tags                = local.common_tags

  depends_on = [module.database, module.cache]
}

# Container Apps Module
module "container_apps" {
  source = "./modules/container-apps"

  project_name               = var.project_name
  environment                = var.environment
  location                   = var.location
  resource_group_name        = azurerm_resource_group.main.name
  subnet_id                  = module.networking.subnet_app_id
  log_analytics_workspace_id = module.monitoring.log_analytics_workspace_id

  # Container configuration
  container_image = "${module.registry.acr_login_server}/questionnaire-api:latest"
  cpu             = var.container_cpu
  memory          = var.container_memory
  min_replicas    = var.container_min_replicas
  max_replicas    = var.container_max_replicas

  # Registry credentials
  acr_login_server   = module.registry.acr_login_server
  acr_admin_username = module.registry.acr_admin_username
  acr_admin_password = module.registry.acr_admin_password

  # Secrets
  database_url       = module.database.connection_string
  redis_hostname     = module.cache.redis_hostname
  redis_ssl_port     = module.cache.redis_ssl_port
  redis_password     = module.cache.redis_primary_access_key
  jwt_secret         = module.keyvault.jwt_secret
  jwt_refresh_secret = module.keyvault.jwt_refresh_secret

  # Monitoring
  app_insights_connection_string = module.monitoring.application_insights_connection_string

  tags = local.common_tags

  depends_on = [
    module.networking,
    module.registry,
    module.database,
    module.cache,
    module.keyvault,
    module.monitoring
  ]
}
