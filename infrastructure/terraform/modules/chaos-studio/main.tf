/**
 * Azure Chaos Studio Terraform Module
 * 
 * Provisions chaos engineering infrastructure including:
 * - Chaos Studio targets
 * - Chaos experiments
 * - RBAC assignments for chaos execution
 * - Monitoring integration
 */

# =============================================================================
# VARIABLES
# =============================================================================

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region for resources"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "quiz2biz"
}

variable "container_app_ids" {
  description = "List of Container App resource IDs to target"
  type        = list(string)
  default     = []
}

variable "virtual_network_id" {
  description = "Virtual Network ID for network chaos experiments"
  type        = string
  default     = ""
}

variable "key_vault_id" {
  description = "Key Vault ID for storing secrets"
  type        = string
  default     = ""
}

variable "log_analytics_workspace_id" {
  description = "Log Analytics Workspace ID for monitoring"
  type        = string
}

variable "enable_chaos_experiments" {
  description = "Enable chaos experiments (should be false in production unless specifically enabled)"
  type        = bool
  default     = false
}

variable "notification_email" {
  description = "Email address for chaos experiment notifications"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# =============================================================================
# LOCALS
# =============================================================================

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = merge(var.tags, {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Module      = "chaos-studio"
  })

  # Chaos targets for Container Apps
  container_app_targets = var.enable_chaos_experiments ? var.container_app_ids : []
}

# =============================================================================
# USER ASSIGNED MANAGED IDENTITY FOR CHAOS
# =============================================================================

resource "azurerm_user_assigned_identity" "chaos_identity" {
  count               = var.enable_chaos_experiments ? 1 : 0
  name                = "${local.name_prefix}-chaos-identity"
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = local.common_tags
}

# =============================================================================
# CHAOS STUDIO TARGETS
# =============================================================================

# Container App Chaos Targets
resource "azurerm_chaos_studio_target" "container_app_targets" {
  count              = length(local.container_app_targets)
  location           = var.location
  target_resource_id = local.container_app_targets[count.index]
  target_type        = "Microsoft-ContainerApp"

  depends_on = [azurerm_user_assigned_identity.chaos_identity]
}

# Network Chaos Target (if VNet provided)
resource "azurerm_chaos_studio_target" "network_target" {
  count              = var.enable_chaos_experiments && var.virtual_network_id != "" ? 1 : 0
  location           = var.location
  target_resource_id = var.virtual_network_id
  target_type        = "Microsoft-VirtualNetwork"

  depends_on = [azurerm_user_assigned_identity.chaos_identity]
}

# =============================================================================
# CHAOS STUDIO CAPABILITIES
# =============================================================================

# Container App CPU Pressure Capability
resource "azurerm_chaos_studio_capability" "cpu_pressure" {
  count                  = length(local.container_app_targets)
  chaos_studio_target_id = azurerm_chaos_studio_target.container_app_targets[count.index].id
  capability_type        = "CPUPressure-1.0"
}

# Container App Memory Pressure Capability
resource "azurerm_chaos_studio_capability" "memory_pressure" {
  count                  = length(local.container_app_targets)
  chaos_studio_target_id = azurerm_chaos_studio_target.container_app_targets[count.index].id
  capability_type        = "MemoryPressure-1.0"
}

# Container App Network Isolation Capability
resource "azurerm_chaos_studio_capability" "network_isolation" {
  count                  = length(local.container_app_targets)
  chaos_studio_target_id = azurerm_chaos_studio_target.container_app_targets[count.index].id
  capability_type        = "NetworkIsolation-1.0"
}

# Network Disconnect Capability (for VNet)
resource "azurerm_chaos_studio_capability" "network_disconnect" {
  count                  = var.enable_chaos_experiments && var.virtual_network_id != "" ? 1 : 0
  chaos_studio_target_id = azurerm_chaos_studio_target.network_target[0].id
  capability_type        = "Disconnect-1.0"
}

# =============================================================================
# CHAOS EXPERIMENTS
# =============================================================================

# CPU Pressure Experiment
resource "azurerm_chaos_studio_experiment" "cpu_pressure_experiment" {
  count               = var.enable_chaos_experiments && length(local.container_app_targets) > 0 ? 1 : 0
  name                = "${local.name_prefix}-cpu-pressure-exp"
  resource_group_name = var.resource_group_name
  location            = var.location

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.chaos_identity[0].id]
  }

  selectors {
    name                    = "api-selector"
    chaos_studio_target_ids = [for t in azurerm_chaos_studio_target.container_app_targets : t.id]
  }

  steps {
    name = "CPU Pressure Step"
    branch {
      name = "CPU Pressure Branch"
      actions {
        urn           = "urn:csci:microsoft:containerApp:cpuPressure/1.0"
        selector_name = "api-selector"
        duration      = "PT5M"
        parameters = {
          pressureLevel = "90"
        }
        action_type = "continuous"
      }
    }
  }

  depends_on = [
    azurerm_chaos_studio_capability.cpu_pressure
  ]
}

# Memory Pressure Experiment
resource "azurerm_chaos_studio_experiment" "memory_pressure_experiment" {
  count               = var.enable_chaos_experiments && length(local.container_app_targets) > 0 ? 1 : 0
  name                = "${local.name_prefix}-memory-pressure-exp"
  resource_group_name = var.resource_group_name
  location            = var.location

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.chaos_identity[0].id]
  }

  selectors {
    name                    = "api-selector"
    chaos_studio_target_ids = [for t in azurerm_chaos_studio_target.container_app_targets : t.id]
  }

  steps {
    name = "Memory Pressure Step"
    branch {
      name = "Memory Pressure Branch"
      actions {
        urn           = "urn:csci:microsoft:containerApp:memoryPressure/1.0"
        selector_name = "api-selector"
        duration      = "PT5M"
        parameters = {
          pressureLevel = "90"
        }
        action_type = "continuous"
      }
    }
  }

  depends_on = [
    azurerm_chaos_studio_capability.memory_pressure
  ]
}

# Network Latency Experiment
resource "azurerm_chaos_studio_experiment" "network_latency_experiment" {
  count               = var.enable_chaos_experiments && var.virtual_network_id != "" ? 1 : 0
  name                = "${local.name_prefix}-network-latency-exp"
  resource_group_name = var.resource_group_name
  location            = var.location

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.chaos_identity[0].id]
  }

  selectors {
    name                    = "network-selector"
    chaos_studio_target_ids = [azurerm_chaos_studio_target.network_target[0].id]
  }

  steps {
    name = "Network Latency Step"
    branch {
      name = "Moderate Latency"
      actions {
        urn           = "urn:csci:microsoft:virtualNetwork:disconnect/1.0"
        selector_name = "network-selector"
        duration      = "PT10M"
        parameters = {
          latencyInMilliseconds = "500"
          destinationFilters    = "[\"*\"]"
        }
        action_type = "continuous"
      }
    }
  }

  depends_on = [
    azurerm_chaos_studio_capability.network_disconnect
  ]
}

# Pod Kill Simulation Experiment
resource "azurerm_chaos_studio_experiment" "pod_kill_experiment" {
  count               = var.enable_chaos_experiments && length(local.container_app_targets) > 0 ? 1 : 0
  name                = "${local.name_prefix}-pod-kill-exp"
  resource_group_name = var.resource_group_name
  location            = var.location

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.chaos_identity[0].id]
  }

  selectors {
    name                    = "api-selector"
    chaos_studio_target_ids = [for t in azurerm_chaos_studio_target.container_app_targets : t.id]
  }

  steps {
    name = "Network Isolation Step"
    branch {
      name = "Isolate Pod"
      actions {
        urn           = "urn:csci:microsoft:containerApp:networkIsolation/1.0"
        selector_name = "api-selector"
        duration      = "PT1M"
        parameters    = {}
        action_type   = "continuous"
      }
    }
  }

  depends_on = [
    azurerm_chaos_studio_capability.network_isolation
  ]
}

# Game Day - Combined Experiment
resource "azurerm_chaos_studio_experiment" "game_day_experiment" {
  count               = var.enable_chaos_experiments && length(local.container_app_targets) > 0 ? 1 : 0
  name                = "${local.name_prefix}-game-day-exp"
  resource_group_name = var.resource_group_name
  location            = var.location

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.chaos_identity[0].id]
  }

  selectors {
    name                    = "api-selector"
    chaos_studio_target_ids = [for t in azurerm_chaos_studio_target.container_app_targets : t.id]
  }

  # Step 1: CPU Pressure
  steps {
    name = "Step 1 - CPU Pressure"
    branch {
      name = "CPU Pressure"
      actions {
        urn           = "urn:csci:microsoft:containerApp:cpuPressure/1.0"
        selector_name = "api-selector"
        duration      = "PT3M"
        parameters = {
          pressureLevel = "80"
        }
        action_type = "continuous"
      }
    }
  }

  # Step 2: Memory Pressure
  steps {
    name = "Step 2 - Memory Pressure"
    branch {
      name = "Memory Pressure"
      actions {
        urn           = "urn:csci:microsoft:containerApp:memoryPressure/1.0"
        selector_name = "api-selector"
        duration      = "PT3M"
        parameters = {
          pressureLevel = "80"
        }
        action_type = "continuous"
      }
    }
  }

  # Step 3: Network Isolation
  steps {
    name = "Step 3 - Network Isolation"
    branch {
      name = "Network Isolation"
      actions {
        urn           = "urn:csci:microsoft:containerApp:networkIsolation/1.0"
        selector_name = "api-selector"
        duration      = "PT1M"
        parameters    = {}
        action_type   = "continuous"
      }
    }
  }

  depends_on = [
    azurerm_chaos_studio_capability.cpu_pressure,
    azurerm_chaos_studio_capability.memory_pressure,
    azurerm_chaos_studio_capability.network_isolation
  ]
}

# =============================================================================
# ROLE ASSIGNMENTS FOR CHAOS EXECUTION
# =============================================================================

# Role assignment for chaos identity to access Container Apps
resource "azurerm_role_assignment" "chaos_contributor" {
  count                = var.enable_chaos_experiments && length(local.container_app_targets) > 0 ? length(local.container_app_targets) : 0
  scope                = local.container_app_targets[count.index]
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.chaos_identity[0].principal_id
}

# Role assignment for VNet chaos
resource "azurerm_role_assignment" "chaos_network_contributor" {
  count                = var.enable_chaos_experiments && var.virtual_network_id != "" ? 1 : 0
  scope                = var.virtual_network_id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_user_assigned_identity.chaos_identity[0].principal_id
}

# =============================================================================
# ALERT RULES FOR CHAOS EXPERIMENTS
# =============================================================================

resource "azurerm_monitor_action_group" "chaos_alerts" {
  count               = var.enable_chaos_experiments ? 1 : 0
  name                = "${local.name_prefix}-chaos-alerts"
  resource_group_name = var.resource_group_name
  short_name          = "chaos"

  dynamic "email_receiver" {
    for_each = var.notification_email != "" ? [1] : []
    content {
      name          = "chaos-admin"
      email_address = var.notification_email
    }
  }

  tags = local.common_tags
}

# Alert: Chaos Experiment Started
resource "azurerm_monitor_activity_log_alert" "chaos_experiment_started" {
  count               = var.enable_chaos_experiments ? 1 : 0
  name                = "${local.name_prefix}-chaos-started-alert"
  resource_group_name = var.resource_group_name
  location            = var.location
  scopes              = ["/subscriptions/${data.azurerm_client_config.current.subscription_id}/resourceGroups/${var.resource_group_name}"]
  description         = "Alert when a chaos experiment starts"

  criteria {
    resource_type  = "Microsoft.Chaos/experiments"
    operation_name = "Microsoft.Chaos/experiments/start/action"
    category       = "Administrative"
  }

  action {
    action_group_id = azurerm_monitor_action_group.chaos_alerts[0].id
  }

  tags = local.common_tags
}

# Alert: Chaos Experiment Completed
resource "azurerm_monitor_activity_log_alert" "chaos_experiment_completed" {
  count               = var.enable_chaos_experiments ? 1 : 0
  name                = "${local.name_prefix}-chaos-completed-alert"
  resource_group_name = var.resource_group_name
  location            = var.location
  scopes              = ["/subscriptions/${data.azurerm_client_config.current.subscription_id}/resourceGroups/${var.resource_group_name}"]
  description         = "Alert when a chaos experiment completes"

  criteria {
    resource_type  = "Microsoft.Chaos/experiments"
    operation_name = "Microsoft.Chaos/experiments/stop/action"
    category       = "Administrative"
  }

  action {
    action_group_id = azurerm_monitor_action_group.chaos_alerts[0].id
  }

  tags = local.common_tags
}

# =============================================================================
# DATA SOURCES
# =============================================================================

data "azurerm_client_config" "current" {}

# =============================================================================
# OUTPUTS
# =============================================================================

output "chaos_identity_id" {
  description = "ID of the chaos engineering managed identity"
  value       = var.enable_chaos_experiments ? azurerm_user_assigned_identity.chaos_identity[0].id : null
}

output "chaos_identity_principal_id" {
  description = "Principal ID of the chaos engineering managed identity"
  value       = var.enable_chaos_experiments ? azurerm_user_assigned_identity.chaos_identity[0].principal_id : null
}

output "cpu_pressure_experiment_id" {
  description = "ID of the CPU pressure chaos experiment"
  value       = var.enable_chaos_experiments && length(local.container_app_targets) > 0 ? azurerm_chaos_studio_experiment.cpu_pressure_experiment[0].id : null
}

output "memory_pressure_experiment_id" {
  description = "ID of the memory pressure chaos experiment"
  value       = var.enable_chaos_experiments && length(local.container_app_targets) > 0 ? azurerm_chaos_studio_experiment.memory_pressure_experiment[0].id : null
}

output "network_latency_experiment_id" {
  description = "ID of the network latency chaos experiment"
  value       = var.enable_chaos_experiments && var.virtual_network_id != "" ? azurerm_chaos_studio_experiment.network_latency_experiment[0].id : null
}

output "pod_kill_experiment_id" {
  description = "ID of the pod kill chaos experiment"
  value       = var.enable_chaos_experiments && length(local.container_app_targets) > 0 ? azurerm_chaos_studio_experiment.pod_kill_experiment[0].id : null
}

output "game_day_experiment_id" {
  description = "ID of the game day chaos experiment"
  value       = var.enable_chaos_experiments && length(local.container_app_targets) > 0 ? azurerm_chaos_studio_experiment.game_day_experiment[0].id : null
}

output "chaos_experiments" {
  description = "Map of all chaos experiments"
  value = var.enable_chaos_experiments ? {
    cpu_pressure    = length(local.container_app_targets) > 0 ? azurerm_chaos_studio_experiment.cpu_pressure_experiment[0].id : null
    memory_pressure = length(local.container_app_targets) > 0 ? azurerm_chaos_studio_experiment.memory_pressure_experiment[0].id : null
    network_latency = var.virtual_network_id != "" ? azurerm_chaos_studio_experiment.network_latency_experiment[0].id : null
    pod_kill        = length(local.container_app_targets) > 0 ? azurerm_chaos_studio_experiment.pod_kill_experiment[0].id : null
    game_day        = length(local.container_app_targets) > 0 ? azurerm_chaos_studio_experiment.game_day_experiment[0].id : null
  } : {}
}

output "chaos_alert_action_group_id" {
  description = "ID of the chaos alerts action group"
  value       = var.enable_chaos_experiments ? azurerm_monitor_action_group.chaos_alerts[0].id : null
}
