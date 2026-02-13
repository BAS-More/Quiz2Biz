#!/bin/bash
# =============================================================================
# Custom Domain and HTTPS Setup Script for Azure Container Apps
# Domain: quiz2biz.com (GoDaddy)
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  Custom Domain & HTTPS Setup                ${NC}"
echo -e "${GREEN}  Domain: quiz2biz.com                       ${NC}"
echo -e "${GREEN}=============================================${NC}"

# Configuration
CUSTOM_DOMAIN="quiz2biz.com"
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-questionnaire-prod}"
CONTAINER_APP_NAME="${CONTAINER_APP_NAME:-ca-questionnaire-api-prod}"
ENVIRONMENT="${ENVIRONMENT:-prod}"

# Check prerequisites
echo -e "\n${YELLOW}Step 1: Checking prerequisites...${NC}"

if ! command -v az &> /dev/null; then
    echo -e "${RED}Error: Azure CLI is not installed.${NC}"
    exit 1
fi

if ! az account show &> /dev/null; then
    echo -e "${RED}Error: Not logged in to Azure. Run 'az login' first.${NC}"
    exit 1
fi

echo -e "${GREEN}Prerequisites check passed.${NC}"

# Get Container App details
echo -e "\n${YELLOW}Step 2: Getting Container App information...${NC}"

CONTAINER_APP_EXISTS=$(az containerapp show \
    --name "$CONTAINER_APP_NAME" \
    --resource_group "$RESOURCE_GROUP" \
    --query name -o tsv 2>/dev/null || echo "")

if [ -z "$CONTAINER_APP_EXISTS" ]; then
    echo -e "${RED}Error: Container App '$CONTAINER_APP_NAME' not found in resource group '$RESOURCE_GROUP'${NC}"
    echo -e "${YELLOW}Available container apps:${NC}"
    az containerapp list --resource-group "$RESOURCE_GROUP" --query "[].name" -o table
    exit 1
fi

DEFAULT_DOMAIN=$(az containerapp show \
    --name "$CONTAINER_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query properties.configuration.ingress.fqdn -o tsv)

echo -e "${GREEN}Container App found: $CONTAINER_APP_NAME${NC}"
echo -e "${GREEN}Default domain: $DEFAULT_DOMAIN${NC}"

# Get validation token for domain
echo -e "\n${YELLOW}Step 3: Adding custom domain and getting validation token...${NC}"

VALIDATION_TOKEN=$(az containerapp hostname add \
    --hostname "$CUSTOM_DOMAIN" \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CONTAINER_APP_NAME" \
    --query customDomainVerificationId -o tsv 2>&1)

if [[ $VALIDATION_TOKEN == *"error"* ]] || [[ $VALIDATION_TOKEN == *"ERROR"* ]]; then
    echo -e "${YELLOW}Domain may already exist, retrieving verification token...${NC}"
    VALIDATION_TOKEN=$(az containerapp show \
        --name "$CONTAINER_APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query properties.customDomainVerificationId -o tsv)
fi

echo -e "${GREEN}Domain Validation Token: ${VALIDATION_TOKEN}${NC}"

# Display DNS configuration instructions
echo -e "\n${BLUE}=============================================${NC}"
echo -e "${BLUE}  DNS CONFIGURATION REQUIRED (GoDaddy)      ${NC}"
echo -e "${BLUE}=============================================${NC}"
echo -e ""
echo -e "${YELLOW}Please configure the following DNS records in GoDaddy:${NC}"
echo -e ""
echo -e "${GREEN}1. TXT Record for Domain Verification:${NC}"
echo -e "   Type:     ${BLUE}TXT${NC}"
echo -e "   Name:     ${BLUE}asuid.quiz2biz.com${NC} (or just 'asuid' if GoDaddy auto-adds domain)"
echo -e "   Value:    ${BLUE}${VALIDATION_TOKEN}${NC}"
echo -e "   TTL:      ${BLUE}600${NC} (10 minutes)"
echo -e ""
echo -e "${GREEN}2. CNAME Record for Domain Mapping:${NC}"
echo -e "   Type:     ${BLUE}CNAME${NC}"
echo -e "   Name:     ${BLUE}@${NC} (for root domain) or ${BLUE}www${NC} (for www subdomain)"
echo -e "   Value:    ${BLUE}${DEFAULT_DOMAIN}${NC}"
echo -e "   TTL:      ${BLUE}3600${NC} (1 hour)"
echo -e ""
echo -e "${YELLOW}Note: For root domain (@), some DNS providers require an A record instead.${NC}"
echo -e "${YELLOW}If CNAME is not allowed for root, add:${NC}"
echo -e "   Type:     ${BLUE}A${NC}"
echo -e "   Name:     ${BLUE}@${NC}"
echo -e "   Value:    ${BLUE}[Get IP from: az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query properties.outboundIpAddresses -o tsv | head -1]${NC}"
echo -e ""
echo -e "${BLUE}=============================================${NC}"
echo -e ""

# Wait for DNS propagation
echo -e "${YELLOW}Waiting for DNS propagation...${NC}"
echo -e "${YELLOW}This usually takes 5-15 minutes but can take up to 48 hours.${NC}"
echo -e ""
read -p "Press Enter once you've configured DNS records in GoDaddy and want to verify..."

# Verify DNS configuration
echo -e "\n${YELLOW}Step 4: Verifying DNS configuration...${NC}"

echo -e "Checking TXT record for domain verification..."
TXT_CHECK=$(dig +short TXT asuid.${CUSTOM_DOMAIN} | tr -d '"' || echo "")

if [ -z "$TXT_CHECK" ]; then
    echo -e "${YELLOW}Warning: TXT record not found yet. DNS may still be propagating.${NC}"
else
    echo -e "${GREEN}TXT record found: $TXT_CHECK${NC}"
fi

echo -e "Checking CNAME record..."
CNAME_CHECK=$(dig +short CNAME ${CUSTOM_DOMAIN} || dig +short A ${CUSTOM_DOMAIN} || echo "")

if [ -z "$CNAME_CHECK" ]; then
    echo -e "${YELLOW}Warning: CNAME/A record not found yet. DNS may still be propagating.${NC}"
    echo -e "${YELLOW}You can proceed, but the binding may fail if DNS isn't ready.${NC}"
    read -p "Continue anyway? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        echo -e "${YELLOW}Exiting. Please wait for DNS propagation and try again.${NC}"
        exit 0
    fi
else
    echo -e "${GREEN}CNAME/A record found: $CNAME_CHECK${NC}"
fi

# Bind custom domain
echo -e "\n${YELLOW}Step 5: Binding custom domain to Container App...${NC}"

az containerapp hostname bind \
    --hostname "$CUSTOM_DOMAIN" \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CONTAINER_APP_NAME" \
    --environment "$ENVIRONMENT" \
    --validation-method CNAME

echo -e "${GREEN}Custom domain bound successfully!${NC}"

# Enable managed certificate (automatic HTTPS)
echo -e "\n${YELLOW}Step 6: Enabling managed SSL certificate...${NC}"

az containerapp hostname bind \
    --hostname "$CUSTOM_DOMAIN" \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CONTAINER_APP_NAME" \
    --environment "$ENVIRONMENT" \
    --validation-method CNAME

echo -e "${GREEN}Managed SSL certificate provisioning initiated!${NC}"
echo -e "${YELLOW}Certificate provisioning can take 5-10 minutes.${NC}"

# Wait and check certificate status
echo -e "\n${YELLOW}Step 7: Checking certificate status...${NC}"

for i in {1..20}; do
    CERT_STATUS=$(az containerapp hostname list \
        --name "$CONTAINER_APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "[?name=='$CUSTOM_DOMAIN'].bindingType" -o tsv)
    
    if [ "$CERT_STATUS" = "SniEnabled" ]; then
        echo -e "${GREEN}SSL certificate is active!${NC}"
        break
    fi
    
    echo "Attempt $i/20: Certificate status: $CERT_STATUS, waiting 30 seconds..."
    sleep 30
done

# Verify HTTPS
echo -e "\n${YELLOW}Step 8: Verifying HTTPS configuration...${NC}"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -L "https://${CUSTOM_DOMAIN}/health" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}HTTPS verification successful!${NC}"
else
    echo -e "${YELLOW}HTTPS verification returned HTTP $HTTP_CODE${NC}"
    echo -e "${YELLOW}The site may need more time to be fully accessible.${NC}"
fi

# Summary
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}  Setup Complete!                            ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e ""
echo -e "${BLUE}Your application URLs:${NC}"
echo -e "  Primary:      ${GREEN}https://${CUSTOM_DOMAIN}${NC}"
echo -e "  Health Check: ${GREEN}https://${CUSTOM_DOMAIN}/health${NC}"
echo -e "  API Docs:     ${GREEN}https://${CUSTOM_DOMAIN}/docs${NC}"
echo -e "  API v1:       ${GREEN}https://${CUSTOM_DOMAIN}/api/v1${NC}"
echo -e ""
echo -e "${BLUE}Default Azure URL (still accessible):${NC}"
echo -e "  ${DEFAULT_DOMAIN}"
echo -e ""
echo -e "${YELLOW}Note: SSL certificate auto-renews before expiration.${NC}"
echo -e "${YELLOW}Both HTTP and HTTPS are supported, with automatic redirect to HTTPS.${NC}"
echo -e ""
echo -e "${GREEN}=============================================${NC}"
