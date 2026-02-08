# Quick Deployment Checklist

This is a quick reference checklist for deploying the Quiz2Biz platform. For detailed instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Pre-Deployment Checklist

- [ ] **Azure Account Setup**
  - [ ] Azure subscription active
  - [ ] Azure CLI installed and logged in (`az login`)
  - [ ] Contributor access to subscription

- [ ] **GitHub Repository Setup**
  - [ ] Repository cloned locally
  - [ ] Admin access to repository settings
  - [ ] GitHub Actions enabled

- [ ] **Environment Files**
  - [ ] `.env.production` created from `.env.production.example`
  - [ ] All `YOUR_*` placeholders replaced with actual values
  - [ ] Secrets generated (JWT, API keys, etc.)

## Infrastructure Setup Checklist

Choose one method:

### Method 1: Terraform (Recommended)
- [ ] Navigate to `infrastructure/terraform`
- [ ] Run `terraform init`
- [ ] Review plan: `terraform plan`
- [ ] Apply: `terraform apply`
- [ ] Save outputs: `terraform output > outputs.txt`

### Method 2: PowerShell Script
- [ ] Run `.\scripts\deploy-to-azure.ps1 -Environment "dev"`
- [ ] Note generated database password
- [ ] Verify all resources created in Azure Portal

### Method 3: Bash Script
- [ ] Run `chmod +x scripts/setup-azure.sh`
- [ ] Run `./scripts/setup-azure.sh`
- [ ] Verify resources in Azure Portal

## GitHub Secrets Setup Checklist

Configure in `Settings > Secrets and variables > Actions`:

- [ ] **AZURE_CREDENTIALS**
  ```bash
  az ad sp create-for-rbac --name "github-actions-quiz2biz" \
    --role contributor \
    --scopes /subscriptions/<sub-id>/resourceGroups/rg-questionnaire-dev \
    --sdk-auth
  ```
  Copy entire JSON output

- [ ] **AZURE_ACR_USERNAME**
  - From: Azure Portal > Container Registry > Access keys
  
- [ ] **AZURE_ACR_PASSWORD**
  - From: Azure Portal > Container Registry > Access keys > password

## Container App Secrets Checklist

Configure in Azure Container App:

```bash
az containerapp secret set \
  --name ca-questionnaire-api-dev \
  --resource-group rg-questionnaire-dev \
  --secrets \
    database-url="<postgres-connection-string>" \
    redis-host="<redis-hostname>" \
    redis-port="6380" \
    redis-password="<redis-password>" \
    jwt-secret="<generated-secret>" \
    jwt-refresh-secret="<generated-refresh-secret>"
```

- [ ] `database-url` - PostgreSQL connection string
- [ ] `redis-host` - Redis cache hostname
- [ ] `redis-port` - Redis port (usually 6380 for Azure)
- [ ] `redis-password` - Redis password from Azure Portal
- [ ] `jwt-secret` - Generate: `openssl rand -base64 64`
- [ ] `jwt-refresh-secret` - Generate: `openssl rand -base64 64`

## First Deployment Checklist

- [ ] **Trigger Deployment**
  - [ ] Push to `main` branch, OR
  - [ ] Manually trigger workflow: Actions > Deploy to Azure > Run workflow

- [ ] **Monitor Deployment**
  - [ ] Watch GitHub Actions logs
  - [ ] Check for errors in Build step
  - [ ] Check for errors in Docker build step
  - [ ] Check for errors in Deploy step

- [ ] **Verify Deployment**
  - [ ] Health check passes (`/health` endpoint)
  - [ ] Database migrations completed successfully
  - [ ] Application URL accessible
  - [ ] API docs available at `/api/v1/docs`

## Post-Deployment Verification Checklist

```bash
# Get app URL
APP_URL=$(az containerapp show \
  --name ca-questionnaire-api-dev \
  --resource-group rg-questionnaire-dev \
  --query properties.configuration.ingress.fqdn -o tsv)

echo "Application URL: https://${APP_URL}"
```

- [ ] **Health Check**
  ```bash
  curl https://${APP_URL}/health
  ```
  Expected: `{"status":"ok","info":{...}}`

- [ ] **API Docs**
  - [ ] Visit: `https://${APP_URL}/api/v1/docs`
  - [ ] Swagger UI loads correctly
  - [ ] All endpoints listed

- [ ] **Test Registration**
  ```bash
  curl -X POST https://${APP_URL}/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'
  ```

- [ ] **Test Login**
  ```bash
  curl -X POST https://${APP_URL}/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"Test123!"}'
  ```

- [ ] **Check Logs**
  ```bash
  az containerapp logs show \
    --name ca-questionnaire-api-dev \
    --resource-group rg-questionnaire-dev \
    --follow
  ```

## Monitoring Setup Checklist

- [ ] **Application Insights**
  - [ ] Create App Insights resource
  - [ ] Add instrumentation key to secrets
  - [ ] Verify telemetry flowing

- [ ] **Alerts**
  - [ ] CPU usage alert (>80%)
  - [ ] Memory usage alert (>90%)
  - [ ] Error rate alert (>50/min)
  - [ ] Response time alert (>2s)

- [ ] **Log Analytics**
  - [ ] Container app logs streaming
  - [ ] Query for errors
  - [ ] Set up dashboard

## Custom Domain Setup Checklist (Optional)

- [ ] **DNS Configuration**
  - [ ] Add CNAME record in DNS provider
  - [ ] Point to Container App FQDN
  - [ ] Wait for DNS propagation

- [ ] **SSL Certificate**
  - [ ] Enable managed certificate in Container App
  - [ ] Verify HTTPS working
  - [ ] Test redirect from HTTP to HTTPS

- [ ] **Update CORS**
  - [ ] Update `CORS_ORIGIN` in secrets
  - [ ] Restart container app

## Troubleshooting Quick Reference

### Deployment Fails

1. Check GitHub Actions logs
2. Verify all secrets are configured
3. Check Azure Container Registry access
4. Verify service principal permissions

### Health Check Fails

1. Check container logs: `az containerapp logs show`
2. Verify database connection string
3. Check Redis connection
4. Verify all secrets are set

### Database Connection Issues

1. Check firewall rules
2. Verify connection string format
3. Test from local machine
4. Check SSL requirement

### Need to Rollback

```bash
# List revisions
az containerapp revision list \
  --name ca-questionnaire-api-dev \
  --resource-group rg-questionnaire-dev -o table

# Activate previous revision
az containerapp revision activate \
  --revision <previous-revision-name> \
  --resource-group rg-questionnaire-dev
```

## Continuous Deployment Status

Once set up, deployments happen automatically:

- ✅ **Push to `main`** → Automatic deployment to production
- ✅ **Push to `develop`** → Automatic CI checks
- ✅ **Pull Request** → Automatic CI checks
- ✅ **Manual Trigger** → Deploy to any environment

## Quick Commands Reference

```bash
# View deployments
az containerapp revision list --name ca-questionnaire-api-dev -g rg-questionnaire-dev -o table

# View logs
az containerapp logs show --name ca-questionnaire-api-dev -g rg-questionnaire-dev --follow

# Restart app
az containerapp revision restart --revision <revision-name> -g rg-questionnaire-dev

# Scale app
az containerapp update --name ca-questionnaire-api-dev -g rg-questionnaire-dev \
  --min-replicas 1 --max-replicas 3

# Run migrations
az containerapp exec --name ca-questionnaire-api-dev -g rg-questionnaire-dev \
  --command "npx prisma migrate deploy"

# Check health
APP_URL=$(az containerapp show --name ca-questionnaire-api-dev -g rg-questionnaire-dev \
  --query properties.configuration.ingress.fqdn -o tsv)
curl https://${APP_URL}/health
```

## Support

- 📖 [Full Deployment Guide](DEPLOYMENT.md)
- 📋 [Troubleshooting Section](DEPLOYMENT.md#troubleshooting)
- 🔧 [Azure Container Apps Docs](https://docs.microsoft.com/azure/container-apps/)
- 🚀 [GitHub Actions Docs](https://docs.github.com/actions)

---

**Status:** Ready for deployment ✅  
**Last Updated:** February 7, 2026
