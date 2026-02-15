# GitHub Actions Secrets Configuration

This document provides step-by-step instructions for configuring all required GitHub secrets for the Quiz2Biz deployment workflows.

## How to Add Secrets

1. Navigate to your GitHub repository
2. Click on **Settings** tab
3. Click on **Secrets and variables** > **Actions**
4. Click **New repository secret**
5. Enter the secret name and value
6. Click **Add secret**

## Required Secrets

### 1. AZURE_CREDENTIALS

**Description:** Azure service principal credentials for GitHub Actions to authenticate with Azure.

**How to generate:**

```bash
# Login to Azure CLI
az login

# Get your subscription ID
az account show --query id -o tsv

# Create service principal with contributor role
# Replace <subscription-id> with your actual subscription ID
az ad sp create-for-rbac \
  --name "github-actions-quiz2biz" \
  --role contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/rg-questionnaire-dev \
  --sdk-auth
```

**Expected output format:**
```json
{
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

**What to add to GitHub:**
- **Name:** `AZURE_CREDENTIALS`
- **Value:** The entire JSON output from the command above

---

### 2. AZURE_ACR_USERNAME

**Description:** Username for Azure Container Registry authentication.

**How to get:**

1. **Via Azure Portal:**
   - Go to [Azure Portal](https://portal.azure.com)
   - Navigate to your Container Registry (e.g., `acrquestionnairedev`)
   - Click on **Access keys** in the left menu
   - Enable **Admin user** if not already enabled
   - Copy the **Username**

2. **Via Azure CLI:**
   ```bash
   # Enable admin user
   az acr update --name acrquestionnairedev --admin-enabled true
   
   # Get username
   az acr credential show --name acrquestionnairedev --query username -o tsv
   ```

**What to add to GitHub:**
- **Name:** `AZURE_ACR_USERNAME`
- **Value:** The username from Container Registry (usually the ACR name)

---

### 3. AZURE_ACR_PASSWORD

**Description:** Password for Azure Container Registry authentication.

**How to get:**

1. **Via Azure Portal:**
   - Go to [Azure Portal](https://portal.azure.com)
   - Navigate to your Container Registry (e.g., `acrquestionnairedev`)
   - Click on **Access keys** in the left menu
   - Copy **password** (or **password2**)

2. **Via Azure CLI:**
   ```bash
   # Get password
   az acr credential show --name acrquestionnairedev --query passwords[0].value -o tsv
   ```

**What to add to GitHub:**
- **Name:** `AZURE_ACR_PASSWORD`
- **Value:** The password from Container Registry

---

## Secrets Configuration for Container Apps

These secrets are stored in Azure Container Apps, not GitHub. Configure them using Azure CLI:

```bash
# Set all Container App secrets at once
az containerapp secret set \
  --name ca-questionnaire-api-dev \
  --resource-group rg-questionnaire-dev \
  --secrets \
    database-url="<your-database-url>" \
    redis-host="<your-redis-host>" \
    redis-port="6380" \
    redis-password="<your-redis-password>" \
    jwt-secret="<your-jwt-secret>" \
    jwt-refresh-secret="<your-jwt-refresh-secret>"
```

### How to Get Values for Container App Secrets

#### database-url
```bash
# Get PostgreSQL connection string
# Format: postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require

# Get hostname
az postgres flexible-server show \
  --name psql-questionnaire-dev \
  --resource-group rg-questionnaire-dev \
  --query fullyQualifiedDomainName -o tsv

# Combine to create connection string:
# postgresql://psqladmin:YOUR_PASSWORD@psql-questionnaire-dev.postgres.database.azure.com:5432/questionnaire?sslmode=require
```

#### redis-host, redis-port, redis-password
```bash
# Get Redis hostname
az redis show \
  --name redis-questionnaire-dev \
  --resource-group rg-questionnaire-dev \
  --query hostName -o tsv

# Get Redis port (usually 6380 for SSL)
az redis show \
  --name redis-questionnaire-dev \
  --resource-group rg-questionnaire-dev \
  --query sslPort -o tsv

# Get Redis password
az redis list-keys \
  --name redis-questionnaire-dev \
  --resource-group rg-questionnaire-dev \
  --query primaryKey -o tsv
```

#### jwt-secret and jwt-refresh-secret
```bash
# Generate secure random secrets (64 characters base64)
openssl rand -base64 64

# Run this command twice to generate both secrets
# Use first output for jwt-secret
# Use second output for jwt-refresh-secret
```

---

## Verification

After adding all secrets, verify they're configured:

### GitHub Secrets Verification

1. Go to repository **Settings** > **Secrets and variables** > **Actions**
2. You should see:
   - ✅ AZURE_CREDENTIALS
   - ✅ AZURE_ACR_USERNAME
   - ✅ AZURE_ACR_PASSWORD

### Container App Secrets Verification

```bash
# List all secrets in Container App
az containerapp secret list \
  --name ca-questionnaire-api-dev \
  --resource-group rg-questionnaire-dev \
  -o table

# Expected output should show:
# - database-url
# - redis-host
# - redis-port
# - redis-password
# - jwt-secret
# - jwt-refresh-secret
```

---

## Environment-Specific Configuration

If you have multiple environments (dev, staging, production), you can:

### Option 1: Use GitHub Environments

1. Go to repository **Settings** > **Environments**
2. Create environments: `development`, `staging`, `production`
3. Add environment-specific secrets to each environment
4. The deployment workflow will use the appropriate environment's secrets

### Option 2: Use Different Resource Groups

Use different resource groups for each environment:
- Development: `rg-questionnaire-dev`
- Staging: `rg-questionnaire-staging`
- Production: `rg-questionnaire-prod`

Update the workflow environment variables accordingly.

---

## Security Best Practices

1. **Rotate Secrets Regularly**
   - Rotate service principal secrets every 90 days
   - Rotate JWT secrets periodically
   - Update GitHub secrets after rotation

2. **Limit Service Principal Permissions**
   - Use Resource Group scope, not Subscription scope
   - Use least privilege principle
   - Review permissions quarterly

3. **Monitor Secret Usage**
   - Check GitHub Actions logs for authentication issues
   - Monitor Azure Activity Logs for service principal access
   - Set up alerts for suspicious activity

4. **Backup Service Principal**
   ```bash
   # Save service principal details securely
   az ad sp show --id <client-id> > sp-backup.json
   # Store sp-backup.json in a secure location (NOT in git)
   ```

---

## Troubleshooting

### Error: "Azure authentication failed"

**Cause:** AZURE_CREDENTIALS is invalid or expired

**Solution:**
1. Regenerate service principal
2. Update GitHub secret
3. Retry workflow

### Error: "Failed to push to ACR"

**Cause:** ACR credentials are invalid

**Solution:**
1. Verify ACR admin user is enabled
2. Get new credentials from Azure Portal
3. Update GitHub secrets
4. Retry workflow

### Error: "Container App update failed"

**Cause:** Service principal lacks permissions

**Solution:**
```bash
# Grant contributor role to resource group
az role assignment create \
  --assignee <client-id> \
  --role Contributor \
  --scope /subscriptions/<subscription-id>/resourceGroups/rg-questionnaire-dev
```

---

## Additional Resources

- [Azure Service Principal Documentation](https://docs.microsoft.com/azure/active-directory/develop/app-objects-and-service-principals)
- [GitHub Encrypted Secrets](https://docs.github.com/actions/security-guides/encrypted-secrets)
- [Azure Container Registry Authentication](https://docs.microsoft.com/azure/container-registry/container-registry-authentication)

---

**Last Updated:** February 7, 2026  
**Version:** 1.0.0
