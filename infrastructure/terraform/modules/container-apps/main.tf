# Container Apps Module - Azure Container Apps Environment and API Service

# Container App Environment
resource "azurerm_container_app_environment" "main" {
  name                       = "cae-${var.project_name}-${var.environment}"
  location                   = var.location
  resource_group_name        = var.resource_group_name
  log_analytics_workspace_id = var.log_analytics_workspace_id
  infrastructure_subnet_id   = var.subnet_id != "" ? var.subnet_id : null

  tags = var.tags

  lifecycle {
    ignore_changes = [
      infrastructure_resource_group_name
    ]
  }
}

# Container App - API Service
resource "azurerm_container_app" "api" {
  name                         = "ca-${var.project_name}-api-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = var.resource_group_name
  revision_mode                = var.enable_canary_deployment ? "Multiple" : "Single"

  identity {
    type = "SystemAssigned"
  }

  template {
    min_replicas = var.min_replicas
    max_replicas = var.max_replicas

    container {
      name   = "api"
      image  = var.container_image
      cpu    = var.cpu
      memory = var.memory

      # Environment variables
      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "PORT"
        value = "3000"
      }

      env {
        name  = "API_PREFIX"
        value = "api/v1"
      }

      env {
        name  = "REDIS_HOST"
        value = var.redis_hostname
      }

      env {
        name  = "REDIS_PORT"
        value = tostring(var.redis_ssl_port)
      }

      env {
        name        = "REDIS_PASSWORD"
        secret_name = "redis-password"
      }

      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }

      env {
        name        = "JWT_SECRET"
        secret_name = "jwt-secret"
      }

      env {
        name        = "JWT_REFRESH_SECRET"
        secret_name = "jwt-refresh-secret"
      }

      env {
        name  = "JWT_EXPIRES_IN"
        value = "15m"
      }

      env {
        name  = "JWT_REFRESH_EXPIRES_IN"
        value = "7d"
      }

      env {
        name  = "BCRYPT_ROUNDS"
        value = "12"
      }

      env {
        name  = "LOG_LEVEL"
        value = "info"
      }

      env {
        name  = "APPLICATIONINSIGHTS_CONNECTION_STRING"
        value = var.app_insights_connection_string
      }

      # Liveness probe — uses global prefix api/v1
      liveness_probe {
        transport = "HTTP"
        path      = "/api/v1/health/live"
        port      = 3000

        initial_delay           = 15
        interval_seconds        = 30
        timeout                 = 5
        failure_count_threshold = 5
      }

      # Readiness probe — uses global prefix api/v1
      readiness_probe {
        transport = "HTTP"
        path      = "/api/v1/health/ready"
        port      = 3000

        interval_seconds        = 10
        timeout                 = 5
        failure_count_threshold = 5
      }

      # Startup probe — uses global prefix api/v1
      startup_probe {
        transport = "HTTP"
        path      = "/api/v1/health/live"
        port      = 3000

        interval_seconds        = 5
        timeout                 = 3
        failure_count_threshold = 10
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 3000
    transport        = "auto"

    # Stable revision traffic weight
    dynamic "traffic_weight" {
      for_each = var.enable_canary_deployment && var.stable_revision_name != "" ? [1] : []
      content {
        label           = "stable"
        revision_suffix = var.stable_revision_name
        percentage      = 100 - var.canary_traffic_percentage
      }
    }

    # Canary revision traffic weight (latest)
    traffic_weight {
      label           = var.enable_canary_deployment ? "canary" : null
      percentage      = var.enable_canary_deployment ? var.canary_traffic_percentage : 100
      latest_revision = true
    }
  }

  registry {
    server               = var.acr_login_server
    username             = var.acr_admin_username
    password_secret_name = "acr-password"
  }

  secret {
    name  = "acr-password"
    value = var.acr_admin_password
  }

  secret {
    name  = "database-url"
    value = var.database_url
  }

  secret {
    name  = "redis-password"
    value = var.redis_password
  }

  secret {
    name  = "jwt-secret"
    value = var.jwt_secret
  }

  secret {
    name  = "jwt-refresh-secret"
    value = var.jwt_refresh_secret
  }

  tags = var.tags

  lifecycle {
    ignore_changes = [
      template[0].container[0].image,
      template[0].container[0].env
    ]
  }
}

# Container App - Web Frontend
resource "azurerm_container_app" "web" {
  count                        = var.deploy_web && var.web_container_image != "" ? 1 : 0
  name                         = "ca-${var.project_name}-web-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"

  template {
    min_replicas = var.web_min_replicas
    max_replicas = var.web_max_replicas

    container {
      name   = "web"
      image  = var.web_container_image
      cpu    = var.web_cpu
      memory = var.web_memory

      # Environment variables for the React frontend
      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "VITE_API_URL"
        value = var.api_url != "" ? var.api_url : "https://ca-${var.project_name}-api-${var.environment}.${azurerm_container_app_environment.main.default_domain}"
      }

      # Liveness probe
      liveness_probe {
        transport = "HTTP"
        path      = "/"
        port      = 80

        initial_delay           = 10
        interval_seconds        = 30
        timeout                 = 5
        failure_count_threshold = 3
      }

      # Readiness probe
      readiness_probe {
        transport = "HTTP"
        path      = "/"
        port      = 80

        interval_seconds        = 10
        timeout                 = 5
        failure_count_threshold = 3
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 80
    transport        = "auto"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  registry {
    server               = var.acr_login_server
    username             = var.acr_admin_username
    password_secret_name = "acr-password"
  }

  secret {
    name  = "acr-password"
    value = var.acr_admin_password
  }

  tags = var.tags

  lifecycle {
    ignore_changes = [
      template[0].container[0].image,
      template[0].container[0].env
    ]
  }
}

