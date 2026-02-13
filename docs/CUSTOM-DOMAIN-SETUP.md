# Custom Domain and HTTPS Setup Guide

## Overview
This guide explains how to configure your custom domain **quiz2biz.com** from GoDaddy with Azure Container Apps and enable HTTPS with a free managed SSL certificate.

## Prerequisites
- ✅ Azure Container Apps deployed
- ✅ Domain purchased from GoDaddy (quiz2biz.com)
- ✅ Azure CLI installed and authenticated
- ✅ Access to GoDaddy DNS management

## Quick Setup (Automated Script)

### Option 1: Run the Automated Script
```bash
# Make the script executable
chmod +x scripts/setup-custom-domain.sh

# Run the script
./scripts/setup-custom-domain.sh
```

The script will:
1. Validate your Azure setup
2. Generate domain verification token
3. Provide DNS configuration instructions
4. Bind the custom domain
5. Enable managed SSL certificate
6. Verify HTTPS is working

---

## Manual Setup (Step-by-Step)

### Step 1: Get Azure Container App Information

```bash
# Set your variables
RESOURCE_GROUP="rg-questionnaire-prod"
CONTAINER_APP_NAME="ca-questionnaire-api-prod"
CUSTOM_DOMAIN="quiz2biz.com"

# Get the default Azure domain
az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn -o tsv
```

Example output: `ca-questionnaire-api-prod.niceriver-abc12345.eastus.azurecontainerapps.io`

### Step 2: Add Custom Domain and Get Verification Token

```bash
# Add the custom domain (this generates the verification token)
az containerapp hostname add \
  --hostname $CUSTOM_DOMAIN \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_APP_NAME

# Get the verification token
VALIDATION_TOKEN=$(az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.customDomainVerificationId -o tsv)

echo "Verification Token: $VALIDATION_TOKEN"
```

### Step 3: Configure DNS in GoDaddy

#### Login to GoDaddy
1. Go to https://dcc.godaddy.com/
2. Navigate to **My Products** > **Domains**
3. Click on **quiz2biz.com** 
4. Click **DNS** or **Manage DNS**

#### Add TXT Record (Domain Verification)
| Type | Name | Value | TTL |
|------|------|-------|-----|
| TXT | `asuid` | `<your-validation-token>` | 600 |

**Note**: Some interfaces may require `asuid.quiz2biz.com` for the full name.

#### Add CNAME Record (Domain Mapping)

**For www subdomain:**
| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `www` | `<your-azure-default-domain>` | 3600 |

**For root domain (@):**

GoDaddy may not allow CNAME for root domain. Use one of these options:

**Option A - CNAME (if allowed):**
| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `@` | `<your-azure-default-domain>` | 3600 |

**Option B - A Record (if CNAME not allowed):**
```bash
# Get the outbound IP address
az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.outboundIpAddresses[0] -o tsv
```

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` | `<your-container-app-ip>` | 3600 |

**Option C - URL Forwarding (GoDaddy specific):**
1. In GoDaddy DNS management, find **Forwarding**
2. Add domain forwarding from `quiz2biz.com` to `www.quiz2biz.com`
3. Enable **Forward with masking** and **HTTPS**

### Step 4: Wait for DNS Propagation

DNS changes typically take **5-15 minutes** but can take up to **48 hours**.

**Verify DNS propagation:**
```bash
# Check TXT record
dig TXT asuid.quiz2biz.com +short

# Check CNAME/A record
dig quiz2biz.com +short
```

### Step 5: Bind Custom Domain in Azure

Once DNS is propagated:

```bash
# Bind the custom domain
az containerapp hostname bind \
  --hostname $CUSTOM_DOMAIN \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_APP_NAME \
  --validation-method CNAME
```

### Step 6: Enable Managed SSL Certificate

Azure Container Apps provides **free managed SSL certificates** that auto-renew:

```bash
# Enable managed certificate (HTTPS)
az containerapp hostname bind \
  --hostname $CUSTOM_DOMAIN \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_APP_NAME \
  --validation-method CNAME
```

Certificate provisioning takes **5-10 minutes**.

**Check certificate status:**
```bash
az containerapp hostname list \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "[?name=='$CUSTOM_DOMAIN']" -o table
```

Look for `bindingType: SniEnabled` which indicates SSL is active.

### Step 7: Verify HTTPS is Working

```bash
# Test HTTPS endpoint
curl -I https://quiz2biz.com/health

# Expected: HTTP/2 200 OK
```

---

## DNS Configuration Summary

### Required DNS Records in GoDaddy

#### For quiz2biz.com (root domain):
```
Type: TXT
Name: asuid
Value: <your-azure-validation-token>
TTL: 600

Type: CNAME (or A if CNAME not supported)
Name: @
Value: <your-azure-default-domain>.azurecontainerapps.io
TTL: 3600
```

#### For www.quiz2biz.com (optional):
```
Type: CNAME
Name: www
Value: <your-azure-default-domain>.azurecontainerapps.io
TTL: 3600
```

---

## Troubleshooting

### DNS Not Propagating
```bash
# Force flush DNS cache (Windows)
ipconfig /flushdns

# Check DNS from different servers
dig @8.8.8.8 quiz2biz.com
dig @1.1.1.1 quiz2biz.com

# Use online tools
# - https://dnschecker.org
# - https://www.whatsmydns.net
```

### Domain Verification Failing
1. Ensure TXT record is exactly `asuid` (without the domain)
2. Wait 15-30 minutes for propagation
3. Verify token matches:
```bash
az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.customDomainVerificationId -o tsv
```

### SSL Certificate Not Provisioning
```bash
# Check hostname bindings
az containerapp hostname list \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP -o table

# Remove and re-add if stuck
az containerapp hostname delete \
  --hostname $CUSTOM_DOMAIN \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_APP_NAME

# Wait 5 minutes, then re-add
az containerapp hostname bind \
  --hostname $CUSTOM_DOMAIN \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_APP_NAME \
  --validation-method CNAME
```

### Mixed Content Warnings
Ensure your application serves all resources over HTTPS:
- Update API base URLs to use `https://`
- Check CORS settings allow HTTPS origins
- Verify environment variables use HTTPS

---

## Security Best Practices

### 1. Force HTTPS Redirect
Azure Container Apps automatically redirects HTTP to HTTPS.

### 2. HSTS (HTTP Strict Transport Security)
Add HSTS headers in your NestJS application:

```typescript
// apps/api/src/main.ts
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

### 3. Update CORS Configuration
```typescript
// apps/api/src/main.ts
app.enableCors({
  origin: [
    'https://quiz2biz.com',
    'https://www.quiz2biz.com',
  ],
  credentials: true,
});
```

### 4. Update Environment Variables
```bash
# Update .env.production
CORS_ORIGIN=https://quiz2biz.com
PUBLIC_URL=https://quiz2biz.com
API_URL=https://quiz2biz.com/api/v1
```

---

## Certificate Management

### Auto-Renewal
- Azure managed certificates **automatically renew** 45 days before expiration
- No action required from you
- Renewal happens transparently

### Certificate Information
```bash
# View certificate details
az containerapp hostname list \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "[?name=='$CUSTOM_DOMAIN'].{Name:name, Binding:bindingType}" -o table
```

### Certificate Types
Azure Container Apps uses **Let's Encrypt** certificates:
- Free
- Valid for 90 days
- Auto-renewed at 45 days
- Trusted by all modern browsers

---

## Testing Checklist

After setup, verify:

- [ ] `https://quiz2biz.com/health` returns 200 OK
- [ ] `http://quiz2biz.com` redirects to HTTPS
- [ ] SSL certificate is valid (check browser padlock icon)
- [ ] `https://quiz2biz.com/api/v1/health` works
- [ ] `https://quiz2biz.com/docs` shows API documentation
- [ ] No mixed content warnings in browser console
- [ ] Certificate shows "Let's Encrypt" as issuer

---

## Additional Resources

- [Azure Container Apps Custom Domains](https://learn.microsoft.com/en-us/azure/container-apps/custom-domains-managed-certificates)
- [GoDaddy DNS Management](https://www.godaddy.com/help/manage-dns-records-680)
- [SSL Labs Server Test](https://www.ssllabs.com/ssltest/)
- [DNS Checker Tool](https://dnschecker.org)

---

## Support

If you encounter issues:

1. Check Azure Container Apps logs:
```bash
az containerapp logs show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --follow
```

2. Verify DNS configuration:
```bash
./scripts/setup-custom-domain.sh
```

3. Contact Azure Support or open an issue in the repository.

---

**Last Updated**: January 27, 2026
**Domain**: quiz2biz.com
**Provider**: GoDaddy
**Platform**: Azure Container Apps
