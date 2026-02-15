# Quick Start: First Deployment

Follow these steps to deploy the Quiz2Biz platform for the first time.

## Prerequisites Check

Before you begin, ensure you have:
- [ ] Azure CLI installed
- [ ] Access to Azure subscription
- [ ] GitHub repository admin access
- [ ] ~30 minutes for initial setup

## Step 1: Azure Infrastructure Setup (15 minutes)

Choose **ONE** of these methods:

### Method A: Quick Deploy (Recommended for Testing)
```bash
# Login to Azure
az login

# Run the PowerShell deployment script
pwsh scripts/deploy-to-azure.ps1 -Environment "dev" -Location "eastus2"

# Save the generated credentials shown at the end!
```

### Method B: Production-Ready (Recommended for Production)
```bash
# Navigate to Terraform directory
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Review what will be created
terraform plan

# Create infrastructure
terraform apply

# Save important outputs
terraform output > outputs.txt
cd ../..
```

After either method, you should have:
- ✅ Resource Group created
- ✅ PostgreSQL Database running
- ✅ Redis Cache created
- ✅ Container Registry ready
- ✅ Container Apps Environment set up

## Step 2: Configure GitHub Secrets (5 minutes)

### 2.1 Create Azure Service Principal

```bash
# Get your subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Create service principal for GitHub Actions
az ad sp create-for-rbac \
  --name "github-actions-quiz2biz" \
  --role contributor \
  --scopes /subscriptions/${SUBSCRIPTION_ID}/resourceGroups/rg-questionnaire-dev \
  --sdk-auth

# Copy the ENTIRE JSON output - you'll need it next
```

### 2.2 Add Secrets to GitHub

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these three secrets:

**Secret 1: AZURE_CREDENTIALS**
- Name: `AZURE_CREDENTIALS`
- Value: Paste the entire JSON from step 2.1

**Secret 2: AZURE_ACR_USERNAME**
```bash
# Get ACR username
az acr credential show --name acrquestionnairedev --query username -o tsv
```
- Name: `AZURE_ACR_USERNAME`
- Value: Paste the username from command above

**Secret 3: AZURE_ACR_PASSWORD**
```bash
# Get ACR password
az acr credential show --name acrquestionnairedev --query passwords[0].value -o tsv
```
- Name: `AZURE_ACR_PASSWORD`
- Value: Paste the password from command above

## Step 3: Configure Container App Secrets (5 minutes)

### 3.1 Generate JWT Secrets
```bash
# Generate JWT secret
openssl rand -base64 64

# Generate JWT refresh secret
openssl rand -base64 64

# Save both outputs - you'll need them next
```

### 3.2 Get Database and Redis Details
```bash
# Get PostgreSQL connection string
POSTGRES_HOST=$(az postgres flexible-server show \
  --name psql-questionnaire-dev \
  --resource-group rg-questionnaire-dev \
  --query fullyQualifiedDomainName -o tsv)

# Get Redis details
REDIS_HOST=$(az redis show \
  --name redis-questionnaire-dev \
  --resource-group rg-questionnaire-dev \
  --query hostName -o tsv)

REDIS_PASSWORD=$(az redis list-keys \
  --name redis-questionnaire-dev \
  --resource-group rg-questionnaire-dev \
  --query primaryKey -o tsv)

echo "Database Host: ${POSTGRES_HOST}"
echo "Redis Host: ${REDIS_HOST}"
echo "Redis Password: ${REDIS_PASSWORD}"
```

### 3.3 Set Container App Secrets
```bash
# Replace placeholders with your actual values:
# - <DB_PASSWORD> from deployment script output or Azure Portal
# - <JWT_SECRET> from step 3.1 (first output)
# - <JWT_REFRESH_SECRET> from step 3.1 (second output)

az containerapp secret set \
  --name ca-questionnaire-api-dev \
  --resource-group rg-questionnaire-dev \
  --secrets \
    database-url="postgresql://psqladmin:<DB_PASSWORD>@${POSTGRES_HOST}:5432/questionnaire?sslmode=require" \
    redis-host="${REDIS_HOST}" \
    redis-port="6380" \
    redis-password="${REDIS_PASSWORD}" \
    jwt-secret="<JWT_SECRET>" \
    jwt-refresh-secret="<JWT_REFRESH_SECRET>"
```

## Step 4: Deploy Application (5 minutes)

You have two options:

### Option A: Automatic Deploy (Push to Main)
```bash
# Make sure you're on main branch
git checkout main

# Push to trigger deployment
git push origin main

# Watch the deployment
# Go to GitHub → Actions tab → Watch the "Deploy to Azure" workflow
```

### Option B: Manual Deploy (Workflow Dispatch)
1. Go to GitHub repository
2. Click **Actions** tab
3. Click **Deploy to Azure** workflow
4. Click **Run workflow**
5. Select environment: `development`
6. Click **Run workflow**
7. Watch the deployment progress

## Step 5: Verify Deployment (2 minutes)

### 5.1 Get Application URL
```bash
APP_URL=$(az containerapp show \
  --name ca-questionnaire-api-dev \
  --resource-group rg-questionnaire-dev \
  --query properties.configuration.ingress.fqdn -o tsv)

echo "🚀 Application URL: https://${APP_URL}"
```

### 5.2 Test Health Check
```bash
curl https://${APP_URL}/health

# Expected response:
# {"status":"ok","info":{"database":{"status":"up"},"redis":{"status":"up"}}}
```

### 5.3 Open API Documentation
```bash
# Open in browser
echo "API Docs: https://${APP_URL}/api/v1/docs"

# Or use curl
curl https://${APP_URL}/api/v1/docs
```

### 5.4 Test Authentication
```bash
# Register a test user
curl -X POST https://${APP_URL}/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@quiz2biz.com",
    "password": "SecurePass123!",
    "name": "Admin User"
  }'

# Expected: User created successfully with token
```

## Success Checklist

After completing all steps, verify:
- [x] Azure resources created
- [x] GitHub secrets configured (3 secrets)
- [x] Container app secrets set (6 secrets)
- [x] Deployment workflow ran successfully
- [x] Health check returns OK
- [x] API docs accessible
- [x] Can register a user

## Next Steps

Now that your application is deployed:

1. **Set up monitoring** (see [DEPLOYMENT.md](DEPLOYMENT.md#monitoring-and-alerts))
   - Enable Application Insights
   - Configure alerts
   - Set up dashboards

2. **Configure custom domain** (optional)
   - See [DEPLOYMENT.md](DEPLOYMENT.md#custom-domain-setup-checklist)

3. **Enable continuous deployment**
   - All pushes to `main` will auto-deploy
   - Pull requests will run CI checks
   - Staging and production can be added as environments

4. **Review security**
   - Rotate secrets after initial setup
   - Review firewall rules
   - Enable Azure Defender

## Troubleshooting

### Deployment Failed?
1. Check GitHub Actions logs for errors
2. Verify all secrets are configured correctly
3. Check Azure Portal for resource status
4. See [DEPLOYMENT.md - Troubleshooting](DEPLOYMENT.md#troubleshooting)

### Health Check Failed?
```bash
# Check application logs
az containerapp logs show \
  --name ca-questionnaire-api-dev \
  --resource-group rg-questionnaire-dev \
  --follow
```

### Can't Connect to Database?
```bash
# Check firewall rules
az postgres flexible-server firewall-rule list \
  --name psql-questionnaire-dev \
  --resource-group rg-questionnaire-dev \
  -o table

# Allow Azure services if needed
az postgres flexible-server firewall-rule create \
  --name allow-azure \
  --resource-group rg-questionnaire-dev \
  --server-name psql-questionnaire-dev \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

## Quick Reference Commands

```bash
# Check deployment status
az containerapp revision list \
  --name ca-questionnaire-api-dev \
  --resource-group rg-questionnaire-dev \
  -o table

# View logs
az containerapp logs show \
  --name ca-questionnaire-api-dev \
  --resource-group rg-questionnaire-dev \
  --follow

# Restart application
az containerapp revision restart \
  --name ca-questionnaire-api-dev \
  --resource-group rg-questionnaire-dev

# Update environment variable
az containerapp update \
  --name ca-questionnaire-api-dev \
  --resource-group rg-questionnaire-dev \
  --set-env-vars "NEW_VAR=value"

# Run database migration
az containerapp exec \
  --name ca-questionnaire-api-dev \
  --resource-group rg-questionnaire-dev \
  --command "npx prisma migrate deploy"
```

## Documentation

- 📖 [Full Deployment Guide](DEPLOYMENT.md)
- 🔐 [GitHub Secrets Guide](GITHUB-SECRETS.md)
- ✅ [Deployment Checklist](DEPLOYMENT-CHECKLIST.md)
- 🚀 [Quick Start Guide](QUICK-START.md)

## Support

Need help?
1. Check the documentation links above
2. Review GitHub Actions workflow logs
3. Check Azure Container Apps logs
4. Consult Azure documentation

---

**Estimated Time:** 30-40 minutes total  
**Difficulty:** Intermediate  
**Last Updated:** February 7, 2026

🎉 **Congratulations!** Your Quiz2Biz platform should now be deployed and running in Azure!
