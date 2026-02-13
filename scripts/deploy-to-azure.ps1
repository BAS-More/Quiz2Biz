# =============================================================================
# Azure Container Apps Deployment Script
# Deploys: PostgreSQL, Container Registry, Container Apps, and API
# =============================================================================

param(
    [string]$ResourceGroup = "rg-questionnaire-dev",
    [string]$Location = "eastus2",
    [string]$Environment = "dev"
)

# Colors
function Write-Success { param($Message) Write-Host $Message -ForegroundColor Green }
function Write-Info { param($Message) Write-Host $Message -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host $Message -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host $Message -ForegroundColor Red }

Write-Success "============================================="
Write-Success "  Azure Deployment - Quiz2Biz Platform      "
Write-Success "============================================="
Write-Host ""

# Configuration
$PROJECT_NAME = "questionnaire"
$DB_NAME = "psql-$PROJECT_NAME-$Environment"
$ACR_NAME = "acr$PROJECT_NAME$Environment" -replace '-',''
$CONTAINER_ENV_NAME = "cae-$PROJECT_NAME-$Environment"
$CONTAINER_APP_NAME = "ca-$PROJECT_NAME-api-$Environment"
$DB_ADMIN_USER = "psqladmin"
$DB_ADMIN_PASSWORD = "P@ssw0rd$(Get-Random -Minimum 1000 -Maximum 9999)!"

Write-Info "Configuration:"
Write-Host "  Resource Group: $ResourceGroup"
Write-Host "  Location: $Location"
Write-Host "  Environment: $Environment"
Write-Host ""

# Step 1: Verify Azure CLI and login
Write-Info "Step 1: Verifying Azure CLI and login..."
try {
    $account = az account show 2>$null | ConvertFrom-Json
    Write-Success "Logged in as: $($account.user.name)"
    Write-Success "Subscription: $($account.name)"
} catch {
    Write-Error "Not logged in to Azure. Please run 'az login' first."
    exit 1
}

# Step 2: Ensure Resource Group exists
Write-Info "`nStep 2: Ensuring resource group exists..."
$rgExists = az group exists --name $ResourceGroup
if ($rgExists -eq "false") {
    Write-Info "Creating resource group..."
    az group create --name $ResourceGroup --location $Location --output none
    Write-Success "Resource group created"
} else {
    Write-Success "Resource group already exists"
}

# Step 3: Deploy PostgreSQL Database
Write-Info "`nStep 3: Deploying PostgreSQL Database..."
$dbExists = az postgres flexible-server show --name $DB_NAME --resource-group $ResourceGroup 2>$null
if (-not $dbExists) {
    Write-Info "Creating PostgreSQL Flexible Server (this takes 5-10 minutes)..."
    
    az postgres flexible-server create `
        --name $DB_NAME `
        --resource-group $ResourceGroup `
        --location $Location `
        --admin-user $DB_ADMIN_USER `
        --admin-password $DB_ADMIN_PASSWORD `
        --sku-name Standard_B1ms `
        --tier Burstable `
        --version 15 `
        --storage-size 32 `
        --public-access 0.0.0.0-255.255.255.255 `
        --output none
    
    # Create database
    az postgres flexible-server db create `
        --server-name $DB_NAME `
        --resource-group $ResourceGroup `
        --database-name $PROJECT_NAME `
        --output none
    
    Write-Success "PostgreSQL database created"
    Write-Host "  Server: $DB_NAME.postgres.database.azure.com"
    Write-Host "  Database: $PROJECT_NAME"
    Write-Host "  Admin User: $DB_ADMIN_USER"
    Write-Warning "  Password saved: $DB_ADMIN_PASSWORD"
} else {
    Write-Success "PostgreSQL database already exists"
}

# Step 4: Deploy Container Registry
Write-Info "`nStep 4: Deploying Azure Container Registry..."
$acrExists = az acr show --name $ACR_NAME --resource-group $ResourceGroup 2>$null
if (-not $acrExists) {
    Write-Info "Creating Azure Container Registry..."
    
    az acr create `
        --name $ACR_NAME `
        --resource-group $ResourceGroup `
        --location $Location `
        --sku Basic `
        --admin-enabled true `
        --output none
    
    Write-Success "Container Registry created"
    Write-Host "  Registry: $ACR_NAME.azurecr.io"
} else {
    Write-Success "Container Registry already exists"
}

# Step 5: Build and Push Docker Image
Write-Info "`nStep 5: Building and pushing Docker image..."
Write-Info "Logging into ACR..."
az acr login --name $ACR_NAME

Write-Info "Building Docker image (this may take 5 minutes)..."
$IMAGE_TAG = "$ACR_NAME.azurecr.io/$PROJECT_NAME-api:latest"

docker build `
    -t $IMAGE_TAG `
    -f docker/api/Dockerfile `
    --target production `
    .

if ($LASTEXITCODE -eq 0) {
    Write-Success "Docker image built successfully"
    
    Write-Info "Pushing image to ACR..."
    docker push $IMAGE_TAG
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Image pushed to ACR"
    } else {
        Write-Error "Failed to push image"
        exit 1
    }
} else {
    Write-Error "Failed to build Docker image"
    exit 1
}

# Step 6: Get ACR credentials
Write-Info "`nStep 6: Getting ACR credentials..."
$ACR_USERNAME = az acr credential show --name $ACR_NAME --query username -o tsv
$ACR_PASSWORD = az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv

# Step 7: Create Container Apps Environment
Write-Info "`nStep 7: Creating Container Apps Environment..."
$envExists = az containerapp env show --name $CONTAINER_ENV_NAME --resource-group $ResourceGroup 2>$null
if (-not $envExists) {
    Write-Info "Creating Container Apps Environment..."
    
    az containerapp env create `
        --name $CONTAINER_ENV_NAME `
        --resource-group $ResourceGroup `
        --location $Location `
        --output none
    
    Write-Success "Container Apps Environment created"
} else {
    Write-Success "Container Apps Environment already exists"
}

# Step 8: Deploy Azure Redis Cache
Write-Info "`nStep 8: Deploying Azure Redis Cache..."
$REDIS_NAME = "redis-$PROJECT_NAME-$Environment"
$redisExists = az redis show --name $REDIS_NAME --resource-group $ResourceGroup 2>$null
if (-not $redisExists) {
    Write-Info "Creating Azure Redis Cache (this takes 15-20 minutes)..."
    
    az redis create `
        --name $REDIS_NAME `
        --resource-group $ResourceGroup `
        --location $Location `
        --sku Basic `
        --vm-size c0 `
        --enable-non-ssl-port false `
        --minimum-tls-version 1.2 `
        --output none
    
    # Wait for Redis to be ready
    Write-Info "Waiting for Redis Cache to be provisioned..."
    $maxAttempts = 60
    $attempt = 0
    do {
        Start-Sleep -Seconds 30
        $attempt++
        $redisState = az redis show --name $REDIS_NAME --resource-group $ResourceGroup --query provisioningState -o tsv 2>$null
        Write-Info "  Attempt $attempt/$maxAttempts - State: $redisState"
    } while ($redisState -ne "Succeeded" -and $attempt -lt $maxAttempts)
    
    if ($redisState -eq "Succeeded") {
        Write-Success "Azure Redis Cache created"
    } else {
        Write-Error "Redis Cache provisioning timed out. Please check Azure portal."
        exit 1
    }
} else {
    Write-Success "Azure Redis Cache already exists"
}

# Step 9: Generate secrets
Write-Info "`nStep 9: Generating application secrets..."
$JWT_SECRET = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
$JWT_REFRESH_SECRET = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})

# Step 10: Get Redis connection info
Write-Info "`nStep 10: Getting Redis connection information..."
$REDIS_HOST = az redis show --name $REDIS_NAME --resource-group $ResourceGroup --query hostName -o tsv
$REDIS_PASSWORD = az redis list-keys --name $REDIS_NAME --resource-group $ResourceGroup --query primaryKey -o tsv

if (-not $REDIS_PASSWORD) {
    Write-Error "Failed to retrieve Redis password. Check if Redis is fully provisioned."
    exit 1
}

# Step 11: Build DATABASE_URL
$DATABASE_URL = "postgresql://${DB_ADMIN_USER}:${DB_ADMIN_PASSWORD}@${DB_NAME}.postgres.database.azure.com:5432/${PROJECT_NAME}?sslmode=require"

# Step 12: Deploy Container App
Write-Info "`nStep 12: Deploying Container App..."
$appExists = az containerapp show --name $CONTAINER_APP_NAME --resource-group $ResourceGroup 2>$null
if (-not $appExists) {
    Write-Info "Creating Container App..."
    
    az containerapp create `
        --name $CONTAINER_APP_NAME `
        --resource-group $ResourceGroup `
        --environment $CONTAINER_ENV_NAME `
        --image $IMAGE_TAG `
        --target-port 3000 `
        --ingress external `
        --registry-server "$ACR_NAME.azurecr.io" `
        --registry-username $ACR_USERNAME `
        --registry-password $ACR_PASSWORD `
        --cpu 0.5 `
        --memory 1.0Gi `
        --min-replicas 1 `
        --max-replicas 3 `
        --env-vars `
            "NODE_ENV=production" `
            "PORT=3000" `
            "API_PREFIX=api/v1" `
            "DATABASE_URL=secretref:database-url" `
            "REDIS_HOST=$REDIS_HOST" `
            "REDIS_PORT=6380" `
            "REDIS_PASSWORD=secretref:redis-password" `
            "JWT_SECRET=secretref:jwt-secret" `
            "JWT_REFRESH_SECRET=secretref:jwt-refresh-secret" `
            "JWT_EXPIRES_IN=15m" `
            "JWT_REFRESH_EXPIRES_IN=7d" `
            "BCRYPT_ROUNDS=12" `
            "LOG_LEVEL=info" `
            "CORS_ORIGIN=https://quiz2biz.com,https://www.quiz2biz.com" `
        --secrets `
            "database-url=$DATABASE_URL" `
            "redis-password=$REDIS_PASSWORD" `
            "jwt-secret=$JWT_SECRET" `
            "jwt-refresh-secret=$JWT_REFRESH_SECRET" `
        --output none
    
    Write-Success "Container App created"
} else {
    Write-Info "Container App exists, updating..."
    
    az containerapp update `
        --name $CONTAINER_APP_NAME `
        --resource-group $ResourceGroup `
        --image $IMAGE_TAG `
        --output none
    
    Write-Success "Container App updated"
}

# Step 13: Run database migrations
Write-Info "`nStep 13: Running database migrations..."
Start-Sleep -Seconds 30

az containerapp exec `
    --name $CONTAINER_APP_NAME `
    --resource-group $ResourceGroup `
    --command "npx prisma migrate deploy" 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Success "Database migrations completed"
} else {
    Write-Warning "Could not run migrations automatically. Run manually after deployment."
}

# Step 14: Get application URL
Write-Info "`nStep 14: Getting application URL..."
$APP_URL = az containerapp show `
    --name $CONTAINER_APP_NAME `
    --resource-group $ResourceGroup `
    --query properties.configuration.ingress.fqdn -o tsv

# Summary
Write-Host ""
Write-Success "============================================="
Write-Success "  Deployment Complete! (100%)                "
Write-Success "============================================="
Write-Host ""
Write-Info "Application URLs:"
Write-Host "  API Base:     " -NoNewline; Write-Success "https://$APP_URL"
Write-Host "  Health Check: " -NoNewline; Write-Success "https://$APP_URL/api/v1/health"
Write-Host "  API v1:       " -NoNewline; Write-Success "https://$APP_URL/api/v1"
Write-Host "  Swagger Docs: " -NoNewline; Write-Success "https://$APP_URL/api/v1/docs (dev only)"
Write-Host ""
Write-Info "Infrastructure Details:"
Write-Host "  Database: $DB_NAME.postgres.database.azure.com"
Write-Host "  Registry: $ACR_NAME.azurecr.io"
Write-Host "  Redis: $REDIS_HOST"
Write-Host ""
Write-Warning "Next Steps:"
Write-Host "  1. Test the API: curl https://$APP_URL/api/v1/health"
Write-Host "  2. Set up custom domain: .\scripts\setup-custom-domain.ps1 -ResourceGroup $ResourceGroup -ContainerAppName $CONTAINER_APP_NAME"
Write-Host ""
Write-Success "============================================="

# Save credentials to file
$CREDS_FILE = "azure-credentials-$Environment.txt"
@"
Azure Deployment Credentials - $Environment
============================================

Database:
  Host: $DB_NAME.postgres.database.azure.com
  Database: $PROJECT_NAME
  User: $DB_ADMIN_USER
  Password: $DB_ADMIN_PASSWORD
  Connection String: $DATABASE_URL

Container Registry:
  Server: $ACR_NAME.azurecr.io
  Username: $ACR_USERNAME
  Password: $ACR_PASSWORD

Redis:
  Host: $REDIS_HOST
  Port: 6380
  Password: $REDIS_PASSWORD

JWT Secrets:
  JWT_SECRET: $JWT_SECRET
  JWT_REFRESH_SECRET: $JWT_REFRESH_SECRET

Application:
  URL: https://$APP_URL
  Resource Group: $ResourceGroup
  Container App: $CONTAINER_APP_NAME

Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@ | Out-File -FilePath $CREDS_FILE -Encoding UTF8

Write-Info "Credentials saved to: $CREDS_FILE"
Write-Warning "Keep this file secure and do not commit to source control!"
