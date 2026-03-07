# Production Infrastructure Setup Script
# This script creates all Azure resources needed for production deployment

$ErrorActionPreference = "Stop"

# Configuration
$RESOURCE_GROUP = "rg-questionnaire-prod"
$LOCATION = "eastus"
$ACR_NAME = "acrquestionnaireprod"
$POSTGRES_SERVER = "psql-questionnaire-prod"
$REDIS_NAME = "redis-questionnaire-prod"
$CONTAINER_APP_ENV = "cae-questionnaire-prod"
$CONTAINER_APP_API = "ca-questionnaire-api-prod"
$CONTAINER_APP_WEB = "ca-questionnaire-web-prod"
$DB_ADMIN_USER = "psqladmin"

Write-Host "🚀 Starting Production Infrastructure Setup..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Create Resource Group
Write-Host "📦 Step 1/7: Creating Resource Group..." -ForegroundColor Yellow
az group create --name $RESOURCE_GROUP --location $LOCATION
Write-Host "✅ Resource Group created" -ForegroundColor Green
Write-Host ""

# Step 2: Create Azure Container Registry
Write-Host "🐳 Step 2/7: Creating Azure Container Registry..." -ForegroundColor Yellow
az acr create `
  --name $ACR_NAME `
  --resource-group $RESOURCE_GROUP `
  --sku Basic `
  --admin-enabled true
Write-Host "✅ ACR created" -ForegroundColor Green
Write-Host ""

# Step 3: Create PostgreSQL Flexible Server
Write-Host "🗄️  Step 3/7: Creating PostgreSQL Server..." -ForegroundColor Yellow
Write-Host "⚠️  You will be prompted for a password. Please enter a strong password and save it securely." -ForegroundColor Magenta
az postgres flexible-server create `
  --name $POSTGRES_SERVER `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION `
  --admin-user $DB_ADMIN_USER `
  --tier Burstable `
  --sku-name Standard_B1ms `
  --storage-size 32 `
  --version 15 `
  --public-access 0.0.0.0-255.255.255.255
Write-Host "✅ PostgreSQL Server created" -ForegroundColor Green
Write-Host ""

# Step 4: Create PostgreSQL Database
Write-Host "📚 Step 4/7: Creating PostgreSQL Database..." -ForegroundColor Yellow
az postgres flexible-server db create `
  --resource-group $RESOURCE_GROUP `
  --server-name $POSTGRES_SERVER `
  --database-name questionnaire
Write-Host "✅ Database created" -ForegroundColor Green
Write-Host ""

# Step 5: Create Redis Cache
Write-Host "⚡ Step 5/7: Creating Redis Cache..." -ForegroundColor Yellow
az redis create `
  --name $REDIS_NAME `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION `
  --sku Basic `
  --vm-size c0 `
  --minimum-tls-version 1.2
Write-Host "✅ Redis Cache created" -ForegroundColor Green
Write-Host ""

# Step 6: Create Container Apps Environment
Write-Host "🌐 Step 6/7: Creating Container Apps Environment..." -ForegroundColor Yellow
az containerapp env create `
  --name $CONTAINER_APP_ENV `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION
Write-Host "✅ Container Apps Environment created" -ForegroundColor Green
Write-Host ""

# Step 7: Get Credentials
Write-Host "🔑 Step 7/7: Retrieving Credentials..." -ForegroundColor Yellow
Write-Host ""

# ACR Credentials
Write-Host "=== Azure Container Registry Credentials ===" -ForegroundColor Cyan
$ACR_USERNAME = az acr credential show --name $ACR_NAME --query username -o tsv
$ACR_PASSWORD = az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv
Write-Host "Username: $ACR_USERNAME"
Write-Host "Password: $ACR_PASSWORD"
Write-Host ""

# PostgreSQL Connection String
Write-Host "=== PostgreSQL Connection ===" -ForegroundColor Cyan
$POSTGRES_HOST = az postgres flexible-server show --name $POSTGRES_SERVER --resource-group $RESOURCE_GROUP --query fullyQualifiedDomainName -o tsv
Write-Host "Host: $POSTGRES_HOST"
Write-Host "Connection String: postgresql://${DB_ADMIN_USER}:YOUR_PASSWORD@${POSTGRES_HOST}:5432/questionnaire?sslmode=require"
Write-Host ""

# Redis Connection
Write-Host "=== Redis Connection ===" -ForegroundColor Cyan
$REDIS_HOST = az redis show --name $REDIS_NAME --resource-group $RESOURCE_GROUP --query hostName -o tsv
$REDIS_PORT = az redis show --name $REDIS_NAME --resource-group $RESOURCE_GROUP --query sslPort -o tsv
$REDIS_KEY = az redis list-keys --name $REDIS_NAME --resource-group $RESOURCE_GROUP --query primaryKey -o tsv
Write-Host "Host: $REDIS_HOST"
Write-Host "Port: $REDIS_PORT"
Write-Host "Primary Key: $REDIS_KEY"
Write-Host ""

Write-Host "✅ Production infrastructure setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Update GitHub Secrets with the credentials above"
Write-Host "2. Save the PostgreSQL password securely"
Write-Host "3. Run the deployment workflow"
Write-Host ""
Write-Host "GitHub Secrets to update at:" -ForegroundColor Cyan
Write-Host "https://github.com/BAS-More/Quiz-to-build/settings/secrets/actions"
Write-Host ""
Write-Host "Required secrets:"
Write-Host "  - AZURE_ACR_USERNAME = $ACR_USERNAME"
Write-Host "  - AZURE_ACR_PASSWORD = $ACR_PASSWORD"
Write-Host "  - REDIS_PASSWORD = $REDIS_KEY"
