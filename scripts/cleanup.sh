#!/bin/bash
# =============================================================================
# Azure Cleanup Script
# Destroys all Azure resources created for the Adaptive Questionnaire System
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${RED}=============================================${NC}"
echo -e "${RED}  Azure Resource Cleanup                      ${NC}"
echo -e "${RED}  WARNING: This will DESTROY all resources!  ${NC}"
echo -e "${RED}=============================================${NC}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/../infrastructure/terraform"

# Confirm destruction
echo -e "\n${RED}This will permanently destroy all Azure resources.${NC}"
echo -e "${RED}Type 'destroy' to confirm:${NC}"
read -r CONFIRM
if [ "$CONFIRM" != "destroy" ]; then
    echo -e "${YELLOW}Cleanup cancelled.${NC}"
    exit 0
fi

# Destroy Terraform resources
echo -e "\n${YELLOW}Destroying infrastructure...${NC}"
cd "$TERRAFORM_DIR"
terraform destroy -auto-approve

echo -e "\n${GREEN}Infrastructure destroyed.${NC}"

# Optionally destroy state storage
echo -e "\n${YELLOW}Do you also want to destroy the Terraform state storage? (yes/no)${NC}"
read -r DESTROY_STATE
if [ "$DESTROY_STATE" = "yes" ]; then
    echo -e "${YELLOW}Destroying state storage...${NC}"
    az group delete --name rg-terraform-state --yes --no-wait
    echo -e "${GREEN}State storage deletion initiated.${NC}"
fi

echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}  Cleanup Complete                            ${NC}"
echo -e "${GREEN}=============================================${NC}"
#!/bin/bash
# =============================================================================
# Azure Cleanup Script
# Destroys all Azure resources created for the Adaptive Questionnaire System
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${RED}=============================================${NC}"
echo -e "${RED}  Azure Resource Cleanup                      ${NC}"
echo -e "${RED}  WARNING: This will DESTROY all resources!  ${NC}"
echo -e "${RED}=============================================${NC}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/../infrastructure/terraform"

# Confirm destruction
echo -e "\n${RED}This will permanently destroy all Azure resources.${NC}"
echo -e "${RED}Type 'destroy' to confirm:${NC}"
read -r CONFIRM
if [ "$CONFIRM" != "destroy" ]; then
    echo -e "${YELLOW}Cleanup cancelled.${NC}"
    exit 0
fi

# Destroy Terraform resources
echo -e "\n${YELLOW}Destroying infrastructure...${NC}"
cd "$TERRAFORM_DIR"
terraform destroy -auto-approve

echo -e "\n${GREEN}Infrastructure destroyed.${NC}"

# Optionally destroy state storage
echo -e "\n${YELLOW}Do you also want to destroy the Terraform state storage? (yes/no)${NC}"
read -r DESTROY_STATE
if [ "$DESTROY_STATE" = "yes" ]; then
    echo -e "${YELLOW}Destroying state storage...${NC}"
    az group delete --name rg-terraform-state --yes --no-wait
    echo -e "${GREEN}State storage deletion initiated.${NC}"
fi

echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}  Cleanup Complete                            ${NC}"
echo -e "${GREEN}=============================================${NC}"
