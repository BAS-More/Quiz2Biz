#!/bin/bash
# =============================================================================
# Azure Deployment Setup Script
# Creates or validates Terraform remote state resources in Azure.
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/../infrastructure/terraform"
BACKEND_FILE="$TERRAFORM_DIR/backend.tf"
TFVARS_FILE="$TERRAFORM_DIR/terraform.tfvars"

# Reuse terraform.tfvars values when present so backend key tracks the active env.
TFVARS_PROJECT=""
TFVARS_ENV=""
TFVARS_LOCATION=""
if [ -f "$TFVARS_FILE" ]; then
  TFVARS_PROJECT=$(sed -n 's/^[[:space:]]*project_name[[:space:]]*=[[:space:]]*"\([^"]*\)".*/\1/p' "$TFVARS_FILE" | head -n 1)
  TFVARS_ENV=$(sed -n 's/^[[:space:]]*environment[[:space:]]*=[[:space:]]*"\([^"]*\)".*/\1/p' "$TFVARS_FILE" | head -n 1)
  TFVARS_LOCATION=$(sed -n 's/^[[:space:]]*location[[:space:]]*=[[:space:]]*"\([^"]*\)".*/\1/p' "$TFVARS_FILE" | head -n 1)
fi

PROJECT_NAME="${PROJECT_NAME:-${TFVARS_PROJECT:-questionnaire}}"
DEPLOY_ENV="${DEPLOY_ENV:-${TFVARS_ENV:-dev}}"
LOCATION="${AZURE_LOCATION:-${TFVARS_LOCATION:-eastus}}"
STATE_RESOURCE_GROUP="${STATE_RESOURCE_GROUP:-rg-terraform-state}"
STATE_CONTAINER="${STATE_CONTAINER:-tfstate}"
STATE_KEY="${STATE_KEY:-${PROJECT_NAME}.${DEPLOY_ENV}.tfstate}"

echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  Azure Deployment Setup                      ${NC}"
echo -e "${GREEN}  Adaptive Questionnaire System               ${NC}"
echo -e "${GREEN}=============================================${NC}"

echo -e "\n${YELLOW}Checking prerequisites...${NC}"
if ! command -v az >/dev/null 2>&1; then
  echo -e "${RED}Error: Azure CLI is not installed.${NC}"
  exit 1
fi

if ! command -v terraform >/dev/null 2>&1; then
  echo -e "${RED}Error: Terraform is not installed.${NC}"
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo -e "${RED}Error: openssl is required to generate storage account suffixes.${NC}"
  exit 1
fi

echo -e "${GREEN}Prerequisites check passed.${NC}"

echo -e "\n${YELLOW}Checking Azure login status...${NC}"
if ! az account show >/dev/null 2>&1; then
  echo -e "${YELLOW}Not logged in to Azure. Initiating login...${NC}"
  az login >/dev/null
fi

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
SUBSCRIPTION_NAME=$(az account show --query name -o tsv)
echo -e "${GREEN}Logged in to subscription: ${SUBSCRIPTION_NAME} (${SUBSCRIPTION_ID})${NC}"

# Reuse existing backend storage account from backend.tf if present, unless overridden.
if [ -z "${STATE_STORAGE_ACCOUNT:-}" ] && [ -f "$BACKEND_FILE" ]; then
  EXISTING_STORAGE=$(sed -n 's/.*storage_account_name[[:space:]]*=[[:space:]]*"\([^"]*\)".*/\1/p' "$BACKEND_FILE" | head -n 1)
  if [ -n "$EXISTING_STORAGE" ]; then
    STATE_STORAGE_ACCOUNT="$EXISTING_STORAGE"
  fi
fi

if [ -z "${STATE_STORAGE_ACCOUNT:-}" ]; then
  STATE_STORAGE_ACCOUNT="stquestterraform$(openssl rand -hex 4)"
fi

echo -e "\n${YELLOW}Ensuring Terraform state resource group exists...${NC}"
if [ "$(az group exists --name "$STATE_RESOURCE_GROUP" -o tsv)" = "true" ]; then
  EXISTING_RG_LOCATION=$(az group show --name "$STATE_RESOURCE_GROUP" --query location -o tsv)
  if [ -n "$EXISTING_RG_LOCATION" ]; then
    LOCATION="$EXISTING_RG_LOCATION"
  fi
  az group update \
    --name "$STATE_RESOURCE_GROUP" \
    --set tags.Purpose=TerraformState tags.Project=Questionnaire \
    --output none
else
  az group create \
    --name "$STATE_RESOURCE_GROUP" \
    --location "$LOCATION" \
    --tags "Purpose=TerraformState" "Project=Questionnaire" \
    --output none
fi

echo -e "${GREEN}State resource group ready: ${STATE_RESOURCE_GROUP}${NC}"

echo -e "\n${YELLOW}Ensuring Terraform state storage account exists...${NC}"
if az storage account show --name "$STATE_STORAGE_ACCOUNT" --resource-group "$STATE_RESOURCE_GROUP" >/dev/null 2>&1; then
  echo -e "${GREEN}Storage account exists: ${STATE_STORAGE_ACCOUNT}${NC}"
else
  az storage account create \
    --name "$STATE_STORAGE_ACCOUNT" \
    --resource-group "$STATE_RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku Standard_LRS \
    --kind StorageV2 \
    --https-only true \
    --min-tls-version TLS1_2 \
    --allow-blob-public-access false \
    --output none
  echo -e "${GREEN}Storage account created: ${STATE_STORAGE_ACCOUNT}${NC}"
fi

echo -e "\n${YELLOW}Ensuring Terraform state container exists...${NC}"

# Prefer account key auth for blob data-plane operations to avoid RBAC delays.
STORAGE_AUTH_ARGS=()
if ACCOUNT_KEY=$(az storage account keys list \
  --resource-group "$STATE_RESOURCE_GROUP" \
  --account-name "$STATE_STORAGE_ACCOUNT" \
  --query '[0].value' -o tsv 2>/dev/null) && [ -n "$ACCOUNT_KEY" ]; then
  STORAGE_AUTH_ARGS=(--account-key "$ACCOUNT_KEY")
else
  echo -e "${YELLOW}Warning: Could not get storage account key, falling back to Azure login auth.${NC}"
  STORAGE_AUTH_ARGS=(--auth-mode login)
fi

CONTAINER_EXISTS=$(az storage container exists \
  --name "$STATE_CONTAINER" \
  --account-name "$STATE_STORAGE_ACCOUNT" \
  "${STORAGE_AUTH_ARGS[@]}" \
  --query exists -o tsv)

if [ "$CONTAINER_EXISTS" != "true" ]; then
  az storage container create \
    --name "$STATE_CONTAINER" \
    --account-name "$STATE_STORAGE_ACCOUNT" \
    "${STORAGE_AUTH_ARGS[@]}" \
    --output none
  echo -e "${GREEN}State container created: ${STATE_CONTAINER}${NC}"
else
  echo -e "${GREEN}State container exists: ${STATE_CONTAINER}${NC}"
fi

echo -e "\n${YELLOW}Updating Terraform backend configuration...${NC}"
cat > "$BACKEND_FILE" <<BACKEND_EOF
terraform {
  backend "azurerm" {
    resource_group_name  = "${STATE_RESOURCE_GROUP}"
    storage_account_name = "${STATE_STORAGE_ACCOUNT}"
    container_name       = "${STATE_CONTAINER}"
    key                  = "${STATE_KEY}"
  }
}
BACKEND_EOF

echo -e "${GREEN}backend.tf updated.${NC}"

if [ ! -f "$TFVARS_FILE" ]; then
  echo -e "\n${YELLOW}Creating terraform.tfvars...${NC}"
  cat > "$TFVARS_FILE" <<TFVARS_EOF
# Generated by setup script on $(date)
project_name = "questionnaire"
environment  = "dev"
location     = "${LOCATION}"

tags = {
  Project     = "Adaptive Questionnaire System"
  Environment = "Development"
  ManagedBy   = "Terraform"
}
TFVARS_EOF
  echo -e "${GREEN}terraform.tfvars created.${NC}"
else
  echo -e "\n${GREEN}terraform.tfvars already exists; leaving it unchanged.${NC}"
fi

echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}  Setup Complete                              ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e "\n${BLUE}Configuration:${NC}"
echo -e "  Subscription:         ${SUBSCRIPTION_NAME}"
echo -e "  Location:             ${LOCATION}"
echo -e "  State Resource Group: ${STATE_RESOURCE_GROUP}"
echo -e "  State Storage:        ${STATE_STORAGE_ACCOUNT}"
echo -e "  State Container:      ${STATE_CONTAINER}"
echo -e "  State Key:            ${STATE_KEY}"
echo -e "\n${BLUE}Next steps:${NC}"
echo -e "  1. Run: ${YELLOW}./scripts/deploy.sh${NC}"
