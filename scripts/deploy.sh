#!/bin/bash
# =============================================================================
# Azure Deployment Script (Cloud Build)
# Deploys Adaptive Questionnaire System without local Docker dependency.
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  Azure Deployment (Cloud Build)             ${NC}"
echo -e "${GREEN}  Adaptive Questionnaire System               ${NC}"
echo -e "${GREEN}=============================================${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."
TERRAFORM_DIR="$PROJECT_ROOT/infrastructure/terraform"

echo -e "\n${YELLOW}Step 1: Checking prerequisites...${NC}"
if ! command -v az >/dev/null 2>&1; then
  echo -e "${RED}Error: Azure CLI is not installed.${NC}"
  exit 1
fi

if ! command -v terraform >/dev/null 2>&1; then
  echo -e "${RED}Error: Terraform is not installed.${NC}"
  exit 1
fi

if ! az account show >/dev/null 2>&1; then
  echo -e "${RED}Error: Not logged in to Azure. Run 'az login' first.${NC}"
  exit 1
fi

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)
if [ -z "$SUBSCRIPTION_ID" ] || [ -z "$TENANT_ID" ]; then
  echo -e "${RED}Error: Could not resolve subscription or tenant from Azure CLI context.${NC}"
  exit 1
fi

# azurerm v4 requires explicit subscription context for plan/apply.
export ARM_SUBSCRIPTION_ID="$SUBSCRIPTION_ID"
export ARM_TENANT_ID="$TENANT_ID"

if [ ! -f "$TERRAFORM_DIR/terraform.tfvars" ]; then
  echo -e "${RED}Error: terraform.tfvars not found. Run ./scripts/setup-azure.sh first.${NC}"
  exit 1
fi

if [ ! -f "$TERRAFORM_DIR/backend.tf" ]; then
  echo -e "${RED}Error: backend.tf not found. Run ./scripts/setup-azure.sh first.${NC}"
  exit 1
fi

BACKEND_RG=$(sed -n 's/.*resource_group_name[[:space:]]*=[[:space:]]*"\([^"]*\)".*/\1/p' "$TERRAFORM_DIR/backend.tf" | head -n 1)
BACKEND_STORAGE=$(sed -n 's/.*storage_account_name[[:space:]]*=[[:space:]]*"\([^"]*\)".*/\1/p' "$TERRAFORM_DIR/backend.tf" | head -n 1)
BACKEND_CONTAINER=$(sed -n 's/.*container_name[[:space:]]*=[[:space:]]*"\([^"]*\)".*/\1/p' "$TERRAFORM_DIR/backend.tf" | head -n 1)
BACKEND_KEY=$(sed -n 's/.*key[[:space:]]*=[[:space:]]*"\([^"]*\)".*/\1/p' "$TERRAFORM_DIR/backend.tf" | head -n 1)

TF_PROJECT=$(sed -n 's/^[[:space:]]*project_name[[:space:]]*=[[:space:]]*"\([^"]*\)".*/\1/p' "$TERRAFORM_DIR/terraform.tfvars" | head -n 1)
TF_ENV=$(sed -n 's/^[[:space:]]*environment[[:space:]]*=[[:space:]]*"\([^"]*\)".*/\1/p' "$TERRAFORM_DIR/terraform.tfvars" | head -n 1)
TF_PROJECT=${TF_PROJECT:-questionnaire}
TF_ENV=${TF_ENV:-dev}
EXPECTED_STATE_KEY="${TF_PROJECT}.${TF_ENV}.tfstate"
TARGET_RG="rg-${TF_PROJECT}-${TF_ENV}"

if [ -z "$BACKEND_RG" ] || [ -z "$BACKEND_STORAGE" ] || [ -z "$BACKEND_CONTAINER" ] || [ -z "$BACKEND_KEY" ]; then
  echo -e "${RED}Error: backend.tf is missing required azurerm backend values.${NC}"
  echo -e "${YELLOW}Run ./scripts/setup-azure.sh to regenerate backend.tf.${NC}"
  exit 1
fi

if [ "$BACKEND_KEY" != "$EXPECTED_STATE_KEY" ]; then
  echo -e "${RED}Error: backend state key '${BACKEND_KEY}' does not match active environment '${TF_ENV}'.${NC}"
  echo -e "${YELLOW}Expected key: ${EXPECTED_STATE_KEY}${NC}"
  echo -e "${YELLOW}Run ./scripts/setup-azure.sh to align backend state with terraform.tfvars.${NC}"
  exit 1
fi

if ! az group show --name "$BACKEND_RG" >/dev/null 2>&1; then
  echo -e "${RED}Error: Terraform state resource group '${BACKEND_RG}' does not exist in the current subscription.${NC}"
  echo -e "${YELLOW}Run ./scripts/setup-azure.sh to recreate remote state storage.${NC}"
  exit 1
fi

if ! az storage account show --name "$BACKEND_STORAGE" --resource-group "$BACKEND_RG" >/dev/null 2>&1; then
  echo -e "${RED}Error: Terraform state storage account '${BACKEND_STORAGE}' was not found in '${BACKEND_RG}'.${NC}"
  echo -e "${YELLOW}Run ./scripts/setup-azure.sh to recreate remote state storage.${NC}"
  exit 1
fi

echo -e "${GREEN}Prerequisites check passed.${NC}"

echo -e "\n${YELLOW}Step 2: Initializing Terraform...${NC}"
cd "$TERRAFORM_DIR"
terraform init -upgrade -reconfigure

# Existing resource group outside state is a common first-run migration case.
echo -e "\n${YELLOW}Preflight: Reconciling existing Azure resources with Terraform state...${NC}"
if az group show --name "$TARGET_RG" >/dev/null 2>&1; then
  if ! terraform state show azurerm_resource_group.main >/dev/null 2>&1; then
    RG_ID="/subscriptions/${ARM_SUBSCRIPTION_ID}/resourceGroups/${TARGET_RG}"
    echo -e "${YELLOW}Importing existing resource group into Terraform state: ${RG_ID}${NC}"
    terraform import azurerm_resource_group.main "$RG_ID"
  fi
fi

echo -e "\n${YELLOW}Step 3: Validating Terraform configuration...${NC}"
terraform validate

echo -e "\n${YELLOW}Step 4: Planning infrastructure changes...${NC}"
terraform plan -out=tfplan

echo -e "\n${BLUE}Review the plan above. Continue with deployment? (yes/no)${NC}"
read -r CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo -e "${YELLOW}Deployment cancelled.${NC}"
  exit 0
fi

echo -e "\n${YELLOW}Step 5: Applying infrastructure changes...${NC}"
echo -e "${YELLOW}This may take 10-15 minutes...${NC}"
terraform apply tfplan

echo -e "\n${YELLOW}Step 6: Retrieving deployment outputs...${NC}"
ACR_NAME=$(terraform output -raw acr_name)
ACR_LOGIN_SERVER=$(terraform output -raw acr_login_server)
RESOURCE_GROUP=$(terraform output -raw resource_group_name)
CONTAINER_APP_NAME=$(terraform output -raw api_container_app_name)
API_URL=$(terraform output -raw api_url)
echo -e "${GREEN}Infrastructure deployed successfully!${NC}"

IMAGE_TAG="${IMAGE_TAG:-$(date -u +%Y%m%d%H%M%S)}"
IMAGE_REPOSITORY="questionnaire-api"
IMAGE_REF="${ACR_LOGIN_SERVER}/${IMAGE_REPOSITORY}:${IMAGE_TAG}"
LATEST_IMAGE_REF="${ACR_LOGIN_SERVER}/${IMAGE_REPOSITORY}:latest"

echo -e "\n${YELLOW}Step 7: Building container image in ACR (no local Docker)...${NC}"
az acr build \
  --registry "$ACR_NAME" \
  --file docker/api/Dockerfile \
  --target production \
  --image "${IMAGE_REPOSITORY}:${IMAGE_TAG}" \
  --image "${IMAGE_REPOSITORY}:latest" \
  "$PROJECT_ROOT"

echo -e "\n${YELLOW}Step 8: Updating Container App image...${NC}"
az containerapp update \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --image "$IMAGE_REF"

echo -e "\n${YELLOW}Step 9: Waiting for deployment rollout...${NC}"
sleep 30

echo -e "\n${YELLOW}Step 10: Running database migrations...${NC}"
az containerapp exec \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --command "npx prisma migrate deploy" || {
  echo -e "${YELLOW}Warning: Could not run migrations via exec. Run manually if needed.${NC}"
}

echo -e "\n${YELLOW}Step 11: Performing health check...${NC}"
HTTP_CODE="000"
for i in {1..12}; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/health" || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}Health check passed.${NC}"
    break
  fi
  echo "Attempt $i/12: HTTP $HTTP_CODE, waiting 10 seconds..."
  sleep 10
done

if [ "$HTTP_CODE" != "200" ]; then
  echo -e "${YELLOW}Warning: Health endpoint did not return 200 yet.${NC}"
fi

echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}  Deployment Complete!                        ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e "\n${BLUE}Application URLs:${NC}"
echo -e "  API Base:     ${API_URL}"
echo -e "  Health Check: ${API_URL}/api/v1/health"
echo -e "  Swagger Docs: ${API_URL}/api/v1/docs"
echo -e "\n${BLUE}Image references:${NC}"
echo -e "  Deployed:     ${IMAGE_REF}"
echo -e "  Latest tag:   ${LATEST_IMAGE_REF}"
echo -e "\n${BLUE}Azure Resources:${NC}"
echo -e "  Resource Group:  ${RESOURCE_GROUP}"
echo -e "  Container App:   ${CONTAINER_APP_NAME}"
echo -e "  Registry:        ${ACR_LOGIN_SERVER}"
echo -e "\n${BLUE}Useful commands:${NC}"
echo -e "  View logs:       az containerapp logs show --name ${CONTAINER_APP_NAME} --resource-group ${RESOURCE_GROUP} --follow"
echo -e "  View revisions:  az containerapp revision list --name ${CONTAINER_APP_NAME} --resource-group ${RESOURCE_GROUP}"
echo -e "  Exec into app:   az containerapp exec --name ${CONTAINER_APP_NAME} --resource-group ${RESOURCE_GROUP}"
