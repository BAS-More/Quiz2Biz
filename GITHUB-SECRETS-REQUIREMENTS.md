# GitHub Secrets Configuration Requirements

## Required Secrets for Production Deployment

This document lists all GitHub Secrets that MUST be configured before deployment.

### Critical Deployment Secrets (BLOCKING)

#### Azure Authentication
- **`AZURE_CREDENTIALS`** - Azure Service Principal JSON
  - Format: `{"clientId":"xxx","clientSecret":"xxx","subscriptionId":"xxx","tenantId":"xxx"}`
  - Used by: `deploy.yml`, `deploy-web.yml`
  - Priority: **CRITICAL** - Deployment will fail without this

- **`AZURE_ACR_USERNAME`** - Azure Container Registry admin username
  - Used by: `deploy.yml`, `deploy-web.yml`
  - Priority: **CRITICAL**

- **`AZURE_ACR_PASSWORD`** - Azure Container Registry admin password
  - Used by: `deploy.yml`, `deploy-web.yml`
  - Priority: **CRITICAL**

#### Database & Cache
- **`DATABASE_URL`** - PostgreSQL connection string
  - Format: `postgresql://user:password@host:5432/database?sslmode=require`
  - Used by: `deploy.yml`
  - Priority: **CRITICAL**

- **`REDIS_HOST`** - Azure Redis Cache hostname
  - Example: `redis-questionnaire-prod.redis.cache.windows.net`
  - Used by: `deploy.yml`
  - Priority: **CRITICAL**

- **`REDIS_PORT`** - Azure Redis Cache port
  - Example: `6380` (TLS required)
  - Used by: `deploy.yml`
  - Priority: **CRITICAL**

- **`REDIS_PASSWORD`** - Azure Redis Cache primary key
  - Used by: `deploy.yml`
  - Priority: **CRITICAL**

#### Authentication
- **`JWT_SECRET`** - JWT access token secret (minimum 64 characters)
  - Generate: `openssl rand -base64 64`
  - Used by: `deploy.yml`
  - Priority: **CRITICAL**

- **`JWT_REFRESH_SECRET`** - JWT refresh token secret (minimum 64 characters)
  - Generate: `openssl rand -base64 64`
  - Used by: `deploy.yml`
  - Priority: **CRITICAL**

#### Frontend OAuth (Required for web deployment)
- **`VITE_MICROSOFT_CLIENT_ID`** - Microsoft OAuth client ID
  - Used by: `deploy-web.yml`
  - Priority: **HIGH**

- **`VITE_GOOGLE_CLIENT_ID`** - Google OAuth client ID
  - Used by: `deploy-web.yml`
  - Priority: **HIGH**

### Optional Secrets (Enhanced Features)

#### Docker Hub (Optional - for public image distribution)
- **`DOCKERHUB_USERNAME`** - Docker Hub username
  - Used by: `docker-hub.yml`
  - Priority: **LOW**

- **`DOCKERHUB_TOKEN`** - Docker Hub access token
  - Used by: `docker-hub.yml`
  - Priority: **LOW**

---

## GitHub Secrets Configuration Steps

### 1. Navigate to Repository Settings
```
https://github.com/BAS-More/Quiz-to-build/settings/secrets/actions
```

### 2. Add Each Secret
Click **"New repository secret"** for each required secret listed above.

### 3. Verify Configuration
Run the following workflow to validate secrets:
```bash
gh workflow run deploy.yml --ref main
```

---

## Environment Variable Mapping

| GitHub Secret | Azure Key Vault Equivalent | Container App Environment Variable |
|---------------|---------------------------|-----------------------------------|
| `DATABASE_URL` | `database-url` | `DATABASE_URL` (secretref) |
| `REDIS_HOST` | `redis-host` | `REDIS_HOST` (secretref) |
| `REDIS_PORT` | `redis-port` | `REDIS_PORT` (secretref) |
| `REDIS_PASSWORD` | `redis-password` | `REDIS_PASSWORD` (secretref) |
| `JWT_SECRET` | `jwt-secret` | `JWT_SECRET` (secretref) |
| `JWT_REFRESH_SECRET` | `jwt-refresh-secret` | `JWT_REFRESH_SECRET` (secretref) |

---

## Security Best Practices

1. **Never commit secrets to version control**
2. **Rotate secrets every 90 days**
3. **Use Azure Key Vault for production secrets**
4. **Enable secret scanning in GitHub**
5. **Restrict access to repository secrets**
6. **Audit secret usage regularly**

---

## Troubleshooting

### Deployment fails with "Missing secret DATABASE_URL"
**Solution**: Add the secret in GitHub Actions secrets settings.

### Deployment succeeds but app won't start
**Solution**: Verify secrets are properly formatted and contain valid values.

### OAuth login fails in web app
**Solution**: Ensure `VITE_MICROSOFT_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` are configured.

---

**Last Updated**: 2026-02-24  
**Audit Status**: ✅ All secrets validated and documented
