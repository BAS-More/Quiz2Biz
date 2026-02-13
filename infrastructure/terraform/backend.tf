terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stquestterraform34cdae54"
    container_name       = "tfstate"
    key                  = "questionnaire.dev.tfstate"
  }
}
