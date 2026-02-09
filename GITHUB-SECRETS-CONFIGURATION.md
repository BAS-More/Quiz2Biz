# GitHub Secrets Configuration for Production Deployment

To enable production deployment via GitHub Actions, configure the following secrets in your GitHub repository:

## Required Secrets

### 1. AZURE_CREDENTIALS
Azure Service Principal credentials for authenticating GitHub Actions to Azure.

**To generate:**
```bash
az ad sp create-for-rbac --name "github-actions-quiz2biz" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/rg-questionnaire-prod \
  --sdk-auth
```

**Configuration:**
- Go to GitHub repository > Settings > Secrets and variables > Actions
- Click "New repository secret"
- Name: `AZURE_CREDENTIALS`
- Value: Paste the entire JSON output from the az command above

### 2. AZURE_ACR_USERNAME
Username for accessing Azure Container Registry (acrquestionnaireprod).

**Configuration:**
- Go to GitHub repository > Settings > Secrets and variables > Actions
- Click "New repository secret"
- Name: `AZURE_ACR_USERNAME`
- Value: Username for Azure Container Registry (usually the registry name itself: `acrquestionnaireprod`)

### 3. AZURE_ACR_PASSWORD
Password/Access Key for accessing Azure Container Registry.

**To generate:**
1. Go to Azure Portal > acrquestionnaireprod
2. Navigate to "Access Keys"
3. Enable Admin User (if not already enabled)
4. Copy the password

**Configuration:**
- Go to GitHub repository > Settings > Secrets and variables > Actions
- Click "New repository secret"
- Name: `AZURE_ACR_PASSWORD`
- Value: Copy the password from Azure Portal Access Keys

## Verification
After configuring these secrets, the deploy.yml workflow should be able to:
- Authenticate to Azure
- Push Docker images to Azure Container Registry
- Deploy to Azure Container Apps

## Security Best Practices
- Rotate secrets regularly
- Use principle of least privilege when creating the Service Principal
- Disable Admin User in ACR after setting up more secure authentication if desired