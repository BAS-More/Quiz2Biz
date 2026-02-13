# Container Registry Module - Azure Container Registry

resource "azurerm_container_registry" "main" {
  name                = "acr${var.project_name}${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = var.sku
  admin_enabled       = true # Enable for simplicity in dev; use managed identity in prod

  tags = var.tags
}
