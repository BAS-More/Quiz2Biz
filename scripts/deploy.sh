#!/bin/bash
# =============================================================================
# Azure Deployment Script
# Deploys the Adaptive Questionnaire System to Azure
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  Azure Deployment                            ${NC}"
echo -e "${GREEN}  Adaptive Questionnaire System               ${NC}"
echo -e "${GREEN}=============================================${NC}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."
TERRAFORM_DIR="$PROJECT_ROOT/infrastructure/terraform"

# Check prerequisites
echo -e "\n${YELLOW}Step 1: Checking prerequisites...${NC}"

if ! az account show &> /dev/null; then
    echo -e "${RED}Error: Not logged in to Azure. Run 'az login' first.${NC}"
    exit 1
fi

if [ ! -f "$TERRAFORM_DIR/terraform.tfvars" ]; then
    echo -e "${RED}Error: terraform.tfvars not found. Run ./scripts/setup-azure.sh first.${NC}"
    exit 1
fi

echo -e "${GREEN}Prerequisites check passed.${NC}"

# Initialize Terraform
echo -e "\n${YELLOW}Step 2: Initializing Terraform...${NC}"
cd "$TERRAFORM_DIR"
terraform init -upgrade

# Validate Terraform configuration
echo -e "\n${YELLOW}Step 3: Validating Terraform configuration...${NC}"
terraform validate

# Plan Terraform changes
echo -e "\n${YELLOW}Step 4: Planning infrastructure changes...${NC}"
terraform plan -out=tfplan

# Prompt for confirmation
echo -e "\n${BLUE}Review the plan above. Continue with deployment? (yes/no)${NC}"
read -r CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Deployment cancelled.${NC}"
    exit 0
fi

# Apply Terraform changes
echo -e "\n${YELLOW}Step 5: Applying infrastructure changes...${NC}"
echo -e "${YELLOW}This may take 10-15 minutes...${NC}"
terraform apply tfplan

# Get outputs
echo -e "\n${YELLOW}Step 6: Retrieving deployment outputs...${NC}"
ACR_NAME=$(terraform output -raw acr_name)
ACR_LOGIN_SERVER=$(terraform output -raw acr_login_server)
RESOURCE_GROUP=$(terraform output -raw resource_group_name)
CONTAINER_APP_NAME=$(terraform output -raw api_container_app_name)
API_URL=$(terraform output -raw api_url)

echo -e "${GREEN}Infrastructure deployed successfully!${NC}"

# Build Docker image
echo -e "\n${YELLOW}Step 7: Building Docker image...${NC}"
cd "$PROJECT_ROOT"
docker build \
    -t "$ACR_LOGIN_SERVER/questionnaire-api:latest" \
    -f docker/api/Dockerfile \
    --target production \
    .

# Login to ACR
echo -e "\n${YELLOW}Step 8: Logging in to Azure Container Registry...${NC}"
az acr login --name "$ACR_NAME"

# Push Docker image
echo -e "\n${YELLOW}Step 9: Pushing Docker image to ACR...${NC}"
docker push "$ACR_LOGIN_SERVER/questionnaire-api:latest"

# Update Container App with new image
echo -e "\n${YELLOW}Step 10: Updating Container App...${NC}"
az containerapp update \
    --name "$CONTAINER_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --image "$ACR_LOGIN_SERVER/questionnaire-api:latest"

# Wait for deployment
echo -e "\n${YELLOW}Waiting for deployment to complete...${NC}"
sleep 30

# Run database migrations
echo -e "\n${YELLOW}Step 11: Running database migrations...${NC}"
az containerapp exec \
    --name "$CONTAINER_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --command "npx prisma migrate deploy" || {
    echo -e "${YELLOW}Warning: Could not run migrations via exec. You may need to run them manually.${NC}"
}

# Health check
echo -e "\n${YELLOW}Step 12: Performing health check...${NC}"
for i in {1..12}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/health" || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}Health check passed!${NC}"
        break
    fi
    echo "Attempt $i/12: HTTP $HTTP_CODE, waiting 10 seconds..."
    sleep 10
done

if [ "$HTTP_CODE" != "200" ]; then
    echo -e "${YELLOW}Warning: Health check did not return 200. Check the logs.${NC}"
    echo -e "${YELLOW}The deployment completed but the API may need more time to start.${NC}"
fi

# Print summary
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}  Deployment Complete!                        ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e "\n${BLUE}Application URLs:${NC}"
echo -e "  API Base:     ${API_URL}"
echo -e "  Health Check: ${API_URL}/api/v1/health"
echo -e "  Swagger Docs: ${API_URL}/docs"
echo -e "  API v1:       ${API_URL}/api/v1"
echo -e "\n${BLUE}Azure Resources:${NC}"
echo -e "  Resource Group:  ${RESOURCE_GROUP}"
echo -e "  Container App:   ${CONTAINER_APP_NAME}"
echo -e "  Registry:        ${ACR_LOGIN_SERVER}"
echo -e "\n${BLUE}Useful commands:${NC}"
echo -e "  View logs:       az containerapp logs show --name ${CONTAINER_APP_NAME} --resource-group ${RESOURCE_GROUP} --follow"
echo -e "  View revisions:  az containerapp revision list --name ${CONTAINER_APP_NAME} --resource-group ${RESOURCE_GROUP}"
echo -e "  SSH into app:    az containerapp exec --name ${CONTAINER_APP_NAME} --resource-group ${RESOURCE_GROUP}"
#!/bin/bash
# =============================================================================
# Azure Deployment Script
# Deploys the Adaptive Questionnaire System to Azure
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  Azure Deployment                            ${NC}"
echo -e "${GREEN}  Adaptive Questionnaire System               ${NC}"
echo -e "${GREEN}=============================================${NC}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."
TERRAFORM_DIR="$PROJECT_ROOT/infrastructure/terraform"

# Check prerequisites
echo -e "\n${YELLOW}Step 1: Checking prerequisites...${NC}"

if ! az account show &> /dev/null; then
    echo -e "${RED}Error: Not logged in to Azure. Run 'az login' first.${NC}"
    exit 1
fi

if [ ! -f "$TERRAFORM_DIR/terraform.tfvars" ]; then
    echo -e "${RED}Error: terraform.tfvars not found. Run ./scripts/setup-azure.sh first.${NC}"
    exit 1
fi

echo -e "${GREEN}Prerequisites check passed.${NC}"

# Initialize Terraform
echo -e "\n${YELLOW}Step 2: Initializing Terraform...${NC}"
cd "$TERRAFORM_DIR"
terraform init -upgrade

# Validate Terraform configuration
echo -e "\n${YELLOW}Step 3: Validating Terraform configuration...${NC}"
terraform validate

# Plan Terraform changes
echo -e "\n${YELLOW}Step 4: Planning infrastructure changes...${NC}"
terraform plan -out=tfplan

# Prompt for confirmation
echo -e "\n${BLUE}Review the plan above. Continue with deployment? (yes/no)${NC}"
read -r CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Deployment cancelled.${NC}"
    exit 0
fi

# Apply Terraform changes
echo -e "\n${YELLOW}Step 5: Applying infrastructure changes...${NC}"
echo -e "${YELLOW}This may take 10-15 minutes...${NC}"
terraform apply tfplan

# Get outputs
echo -e "\n${YELLOW}Step 6: Retrieving deployment outputs...${NC}"
ACR_NAME=$(terraform output -raw acr_name)
ACR_LOGIN_SERVER=$(terraform output -raw acr_login_server)
RESOURCE_GROUP=$(terraform output -raw resource_group_name)
CONTAINER_APP_NAME=$(terraform output -raw api_container_app_name)
API_URL=$(terraform output -raw api_url)

echo -e "${GREEN}Infrastructure deployed successfully!${NC}"

# Build Docker image
echo -e "\n${YELLOW}Step 7: Building Docker image...${NC}"
cd "$PROJECT_ROOT"
docker build \
    -t "$ACR_LOGIN_SERVER/questionnaire-api:latest" \
    -f docker/api/Dockerfile \
    --target production \
    .

# Login to ACR
echo -e "\n${YELLOW}Step 8: Logging in to Azure Container Registry...${NC}"
az acr login --name "$ACR_NAME"

# Push Docker image
echo -e "\n${YELLOW}Step 9: Pushing Docker image to ACR...${NC}"
docker push "$ACR_LOGIN_SERVER/questionnaire-api:latest"

# Update Container App with new image
echo -e "\n${YELLOW}Step 10: Updating Container App...${NC}"
az containerapp update \
    --name "$CONTAINER_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --image "$ACR_LOGIN_SERVER/questionnaire-api:latest"

# Wait for deployment
echo -e "\n${YELLOW}Waiting for deployment to complete...${NC}"
sleep 30

# Run database migrations
echo -e "\n${YELLOW}Step 11: Running database migrations...${NC}"
az containerapp exec \
    --name "$CONTAINER_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --command "npx prisma migrate deploy" || {
    echo -e "${YELLOW}Warning: Could not run migrations via exec. You may need to run them manually.${NC}"
}

# Health check
echo -e "\n${YELLOW}Step 12: Performing health check...${NC}"
for i in {1..12}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/health" || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}Health check passed!${NC}"
        break
    fi
    echo "Attempt $i/12: HTTP $HTTP_CODE, waiting 10 seconds..."
    sleep 10
done

if [ "$HTTP_CODE" != "200" ]; then
    echo -e "${YELLOW}Warning: Health check did not return 200. Check the logs.${NC}"
    echo -e "${YELLOW}The deployment completed but the API may need more time to start.${NC}"
fi

# Print summary
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}  Deployment Complete!                        ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e "\n${BLUE}Application URLs:${NC}"
echo -e "  API Base:     ${API_URL}"
echo -e "  Health Check: ${API_URL}/api/v1/health"
echo -e "  Swagger Docs: ${API_URL}/docs"
echo -e "  API v1:       ${API_URL}/api/v1"
echo -e "\n${BLUE}Azure Resources:${NC}"
echo -e "  Resource Group:  ${RESOURCE_GROUP}"
echo -e "  Container App:   ${CONTAINER_APP_NAME}"
echo -e "  Registry:        ${ACR_LOGIN_SERVER}"
echo -e "\n${BLUE}Useful commands:${NC}"
echo -e "  View logs:       az containerapp logs show --name ${CONTAINER_APP_NAME} --resource-group ${RESOURCE_GROUP} --follow"
echo -e "  View revisions:  az containerapp revision list --name ${CONTAINER_APP_NAME} --resource-group ${RESOURCE_GROUP}"
echo -e "  SSH into app:    az containerapp exec --name ${CONTAINER_APP_NAME} --resource-group ${RESOURCE_GROUP}"
