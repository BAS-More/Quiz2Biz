# Deployment Guide - Quiz2Biz Platform

This guide provides instructions for deploying the Quiz2Biz platform to Azure using GitHub Actions CI/CD.

## Table of Contents

- [Prerequisites](#prerequisites)
- [GitHub Actions Workflows](#github-actions-workflows)
- [Required Secrets](#required-secrets)
- [Deployment Environments](#deployment-environments)
- [Manual Deployment](#manual-deployment)
- [Deployment Verification](#deployment-verification)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure you have:

1. **Azure Account** with an active subscription
2. **Azure CLI** installed locally (for manual deployments)
3. **GitHub Repository** with admin access to configure secrets
4. **Azure Resources** created (see [Infrastructure Setup](#infrastructure-setup))

## GitHub Actions Workflows

The repository includes two main workflows:

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**
- Pull requests to `main` or `develop` branches
- Pushes to `develop` branch

**Jobs:**
- Lint and format checking
- API unit tests (with PostgreSQL & Redis services)
- Web unit tests
- E2E tests (Playwright)
- Build verification
- Docker build test
- Security scanning

### 2. Deploy Workflow (`.github/workflows/deploy.yml`)

**Triggers:**
- Push to `main` branch (automatic deployment)
- Manual trigger via workflow_dispatch (choose environment)

**Jobs:**
1. **Build and Test** - Run tests and create build artifacts
2. **Build Docker Image** - Build and push to Azure Container Registry
3. **Deploy** - Deploy to Azure Container Apps with database migrations

## Required Secrets

> 📖 **Detailed Guide:** See [GITHUB-SECRETS.md](GITHUB-SECRETS.md) for step-by-step instructions on configuring all secrets.

Configure the following secrets in GitHub repository settings (`Settings > Secrets and variables > Actions`):

### Azure Credentials

1. **AZURE_CREDENTIALS**
   ```json
   {
     "clientId": "<your-client-id>",
     "clientSecret": "<your-client-secret>",
     "subscriptionId": "<your-subscription-id>",
     "tenantId": "<your-tenant-id>"
   }
   ```
   
   To create Azure credentials:
   ```bash
   # Login to Azure
   az login
   
   # Create service principal
   az ad sp create-for-rbac \
     --name "github-actions-quiz2biz" \
     --role contributor \
     --scopes /subscriptions/<subscription-id>/resourceGroups/rg-questionnaire-dev \
     --sdk-auth
   
   # Copy the entire JSON output to GitHub secrets
   ```

2. **AZURE_ACR_USERNAME**
   - Azure Container Registry admin username
   - Found in: Azure Portal > Container Registry > Access keys
   
3. **AZURE_ACR_PASSWORD**
   - Azure Container Registry admin password
   - Found in: Azure Portal > Container Registry > Access keys

### Container App Secrets

These secrets are configured in Azure Container Apps as secret references:

- `database-url` - PostgreSQL connection string
- `redis-host` - Redis cache hostname
- `redis-port` - Redis cache port
- `redis-password` - Redis cache password
- `jwt-secret` - JWT signing secret
- `jwt-refresh-secret` - JWT refresh token secret

To add secrets to Container App:
```bash
az containerapp secret set \
  --name ca-questionnaire-api-dev \
  --resource-group rg-questionnaire-dev \
  --secrets \
    database-url="<your-database-url>" \
    redis-host="<your-redis-host>" \
    redis-port="6380" \
    redis-password="<your-redis-password>" \
    jwt-secret="<your-jwt-secret>" \
    jwt-refresh-secret="<your-refresh-secret>"
```

## Deployment Environments

### Development
- **Branch:** `develop`
- **Resource Group:** `rg-questionnaire-dev`
- **Container App:** `ca-questionnaire-api-dev`
- **Auto-deploy:** On push to develop

### Staging
- **Branch:** N/A (manual trigger)
- **Resource Group:** `rg-questionnaire-staging`
- **Container App:** `ca-questionnaire-api-staging`
- **Auto-deploy:** Manual workflow dispatch

### Production
- **Branch:** `main`
- **Resource Group:** `rg-questionnaire-prod`
- **Container App:** `ca-questionnaire-api-prod`
- **Auto-deploy:** On push to main (requires approval)

## Infrastructure Setup

### Option 1: Using Terraform (Recommended)

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Review planned changes
terraform plan

# Apply infrastructure
terraform apply

# Save important outputs
terraform output > ../outputs.txt
```

### Option 2: Using PowerShell Script

```powershell
# Run the deployment script
.\scripts\deploy-to-azure.ps1 -Environment "dev" -Location "eastus2"

# The script will:
# 1. Create Resource Group
# 2. Deploy PostgreSQL Database
# 3. Create Azure Container Registry
# 4. Create Container Apps Environment
# 5. Deploy Container App
```

### Option 3: Using Bash Script

```bash
chmod +x scripts/setup-azure.sh
./scripts/setup-azure.sh
```

## Manual Deployment

If you need to deploy manually without GitHub Actions:

### Build Docker Image Locally

```bash
# Build the image
docker build -f docker/api/Dockerfile -t questionnaire-api:latest .

# Tag for ACR
docker tag questionnaire-api:latest acrquestionnairedev.azurecr.io/questionnaire-api:latest

# Login to ACR
az acr login --name acrquestionnairedev

# Push to ACR
docker push acrquestionnairedev.azurecr.io/questionnaire-api:latest
```

### Deploy to Container Apps

```bash
# Deploy using Azure CLI
az containerapp update \
  --name ca-questionnaire-api-dev \
  --resource-group rg-questionnaire-dev \
  --image acrquestionnairedev.azurecr.io/questionnaire-api:latest

# Run database migrations
az containerapp exec \
  --name ca-questionnaire-api-dev \
  --resource-group rg-questionnaire-dev \
  --command "npx prisma migrate deploy"
```

## Deployment Verification

After deployment, verify the application is running correctly:

### 1. Health Check

```bash
# Get the app URL
APP_URL=$(az containerapp show \
  --name ca-questionnaire-api-dev \
  --resource-group rg-questionnaire-dev \
  --query properties.configuration.ingress.fqdn \
  -o tsv)

# Check health endpoint
curl https://${APP_URL}/health
```

Expected response:
```json
{
  "status": "ok",
  "info": {
    "database": {"status": "up"},
    "redis": {"status": "up"}
  }
}
```

### 2. API Documentation

Visit: `https://<your-app-url>/api/v1/docs`

### 3. Test Key Endpoints

```bash
# Register a test user
curl -X POST https://${APP_URL}/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "name": "Test User"
  }'

# Login
curl -X POST https://${APP_URL}/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### 4. Monitor Logs

```bash
# View application logs
az containerapp logs show \
  --name ca-questionnaire-api-dev \
  --resource-group rg-questionnaire-dev \
  --follow

# View specific revision logs
az containerapp revision list \
  --name ca-questionnaire-api-dev \
  --resource-group rg-questionnaire-dev \
  -o table
```

## Monitoring and Alerts

### Application Insights

Enable Application Insights for comprehensive monitoring:

```bash
# Create Application Insights
az monitor app-insights component create \
  --app quiz2biz-insights \
  --location eastus2 \
  --resource-group rg-questionnaire-dev

# Get instrumentation key
az monitor app-insights component show \
  --app quiz2biz-insights \
  --resource-group rg-questionnaire-dev \
  --query instrumentationKey -o tsv
```

Add the instrumentation key to your Container App secrets.

### Set Up Alerts

```bash
# CPU alert
az monitor metrics alert create \
  --name high-cpu-alert \
  --resource-group rg-questionnaire-dev \
  --scopes <container-app-resource-id> \
  --condition "avg UsageNanoCores > 80" \
  --description "Alert when CPU usage exceeds 80%"

# Memory alert
az monitor metrics alert create \
  --name high-memory-alert \
  --resource-group rg-questionnaire-dev \
  --scopes <container-app-resource-id> \
  --condition "avg WorkingSetBytes > 90" \
  --description "Alert when memory usage exceeds 90%"
```

## Troubleshooting

### Common Issues

#### 1. Deployment Fails - Authentication Error

**Problem:** Azure credentials are invalid or expired

**Solution:**
```bash
# Recreate service principal
az ad sp create-for-rbac \
  --name "github-actions-quiz2biz" \
  --role contributor \
  --scopes /subscriptions/<subscription-id> \
  --sdk-auth

# Update AZURE_CREDENTIALS secret in GitHub
```

#### 2. Database Connection Fails

**Problem:** Container App cannot connect to PostgreSQL

**Solution:**
- Verify firewall rules allow Container Apps subnet
- Check connection string format
- Ensure SSL is enabled (`sslmode=require`)

```bash
# Update firewall rule
az postgres flexible-server firewall-rule create \
  --name allow-azure-services \
  --resource-group rg-questionnaire-dev \
  --server-name psql-questionnaire-dev \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

#### 3. Docker Build Fails

**Problem:** Build fails during Docker image creation

**Solution:**
```bash
# Build locally to debug
docker build -f docker/api/Dockerfile -t questionnaire-api:debug .

# Check for missing dependencies
npm ci

# Verify Prisma client generation
npm run db:generate
```

#### 4. Health Check Fails After Deployment

**Problem:** Application deployed but health check returns 500

**Solution:**
```bash
# Check application logs
az containerapp logs show \
  --name ca-questionnaire-api-dev \
  --resource-group rg-questionnaire-dev \
  --follow

# Verify environment variables
az containerapp show \
  --name ca-questionnaire-api-dev \
  --resource-group rg-questionnaire-dev \
  --query properties.template.containers[0].env
```

#### 5. Database Migrations Fail

**Problem:** Migration command fails during deployment

**Solution:**
```bash
# Run migrations manually
az containerapp exec \
  --name ca-questionnaire-api-dev \
  --resource-group rg-questionnaire-dev \
  --command "npx prisma migrate deploy"

# Check migration status
az containerapp exec \
  --name ca-questionnaire-api-dev \
  --resource-group rg-questionnaire-dev \
  --command "npx prisma migrate status"
```

## Rollback

If deployment fails and you need to rollback:

```bash
# List revisions
az containerapp revision list \
  --name ca-questionnaire-api-dev \
  --resource-group rg-questionnaire-dev \
  -o table

# Activate previous revision
az containerapp revision activate \
  --revision <previous-revision-name> \
  --resource-group rg-questionnaire-dev

# Deactivate failed revision
az containerapp revision deactivate \
  --revision <failed-revision-name> \
  --resource-group rg-questionnaire-dev
```

## Additional Resources

- [Azure Container Apps Documentation](https://docs.microsoft.com/azure/container-apps/)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Docker Multi-stage Builds](https://docs.docker.com/develop/develop-images/multistage-build/)

## Support

For deployment issues:
1. Check GitHub Actions workflow logs
2. Review Azure Container Apps logs
3. Consult this troubleshooting guide
4. Contact the DevOps team

---

**Last Updated:** February 7, 2026  
**Version:** 1.0.0
