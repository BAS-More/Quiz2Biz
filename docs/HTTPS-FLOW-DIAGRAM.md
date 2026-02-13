# HTTPS Setup Flow Diagram

## High-Level Architecture

```
                                    ┌─────────────────────┐
                                    │   GoDaddy DNS       │
                                    │   quiz2biz.com      │
                                    └──────────┬──────────┘
                                               │
                                    1. DNS Resolution
                                               │
                                               ▼
┌──────────────────┐            ┌──────────────────────────────┐
│   User Browser   │──HTTPS────▶│  Azure Container Apps        │
│                  │            │  quiz2biz.com                │
└──────────────────┘            │                              │
                                │  ┌────────────────────────┐  │
                                │  │  SSL/TLS Termination   │  │
                                │  │  (Let's Encrypt Cert)  │  │
                                │  └───────────┬────────────┘  │
                                │              │               │
                                │              ▼               │
                                │  ┌────────────────────────┐  │
                                │  │  NestJS API Container  │  │
                                │  │  (Your Application)    │  │
                                │  └────────────────────────┘  │
                                └──────────────────────────────┘
```

## Setup Process Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    HTTPS Setup Process                          │
└────────────────────────────────────────────────────────────────┘

Step 1: Run Setup Script
│
├─▶ Login to Azure (az login)
├─▶ Get Container App details
├─▶ Generate validation token
└─▶ Display DNS configuration
    │
    │ PAUSE ⏸️  (waiting for DNS configuration)
    │
    ▼

Step 2: Configure DNS in GoDaddy
│
├─▶ Add TXT record (asuid.quiz2biz.com = token)
├─▶ Add CNAME record (@ → azure-domain)
└─▶ Save changes
    │
    │ WAIT ⏳ (5-15 minutes DNS propagation)
    │
    ▼

Step 3: Press Enter in Script
│
├─▶ Verify DNS propagation
├─▶ Bind custom domain to Container App
├─▶ Request managed SSL certificate
└─▶ Wait for certificate provisioning
    │
    │ WAIT ⏳ (5-10 minutes certificate)
    │
    ▼

Step 4: Verification
│
├─▶ Check certificate status (SniEnabled)
├─▶ Test HTTPS endpoint (curl)
└─▶ Display success summary
    │
    ▼

✅ COMPLETE: https://quiz2biz.com is live!
```

## DNS Configuration Detail

```
                    GoDaddy DNS Manager
                    ═══════════════════

Record 1: Domain Verification (TXT)
┌─────────────────────────────────────────────┐
│ Type:  TXT                                  │
│ Name:  asuid                                │
│ Value: <azure-validation-token>            │
│ TTL:   600 seconds                          │
└─────────────────────────────────────────────┘
         │
         │ Purpose: Proves you own the domain
         ▼
    Azure validates ownership


Record 2: Domain Mapping (CNAME)
┌─────────────────────────────────────────────┐
│ Type:  CNAME                                │
│ Name:  @ (root domain)                      │
│ Value: ca-xxx-xxx.azurecontainerapps.io    │
│ TTL:   3600 seconds                         │
└─────────────────────────────────────────────┘
         │
         │ Purpose: Routes traffic to Azure
         ▼
    User traffic goes to Azure Container Apps
```

## SSL Certificate Lifecycle

```
Certificate Provisioning Timeline
═════════════════════════════════

Day 0: Setup Complete
│
├─▶ Certificate requested from Let's Encrypt
├─▶ Domain validation completed
└─▶ Certificate issued (valid 90 days)
    │
    │ ⏰ Certificate active
    │
Day 45: Auto-Renewal Trigger
│
├─▶ Azure detects certificate expiring in 45 days
├─▶ Automatically requests new certificate
└─▶ New certificate issued seamlessly
    │
    │ ⏰ No downtime, no action needed
    │
Day 90: Old cert expires (new one already active)
│
└─▶ Cycle repeats every 90 days

✅ ZERO manual intervention required!
```

## Security Headers Flow

```
User Request: http://quiz2biz.com/api/v1/health
│
├─▶ Azure Container Apps receives request
│   │
│   ├─▶ HTTP → HTTPS Redirect (301)
│   └─▶ User browser: https://quiz2biz.com/api/v1/health
│
├─▶ SSL/TLS Handshake
│   │
│   ├─▶ Certificate verification (Let's Encrypt)
│   └─▶ Encrypted connection established
│
├─▶ Request reaches NestJS application
│   │
│   ├─▶ Helmet.js adds security headers:
│   │   ├─ X-Content-Type-Options: nosniff
│   │   ├─ X-Frame-Options: DENY
│   │   ├─ X-XSS-Protection: 1; mode=block
│   │   └─ Strict-Transport-Security: max-age=31536000
│   │
│   ├─▶ CORS validation
│   │   └─ Allow: https://quiz2biz.com only
│   │
│   └─▶ Application logic processes request
│
└─▶ Encrypted response sent to user

✅ Secure end-to-end communication!
```

## Troubleshooting Decision Tree

```
HTTPS Not Working?
│
├─▶ Can't reach site at all?
│   │
│   ├─▶ Check DNS propagation
│   │   └─▶ Resolve-DnsName quiz2biz.com
│   │
│   └─▶ DNS correct but still fails?
│       └─▶ Check Container App is running
│           └─▶ az containerapp show --name xxx
│
├─▶ SSL certificate error?
│   │
│   ├─▶ Check certificate status
│   │   └─▶ az containerapp hostname list
│   │
│   └─▶ Certificate pending?
│       └─▶ Wait 10 mins or delete & re-add
│
├─▶ Site loads but CORS error?
│   │
│   └─▶ Update CORS_ORIGIN env variable
│       └─▶ az containerapp update --set-env-vars
│
└─▶ 404 or 500 errors?
    │
    └─▶ Check application logs
        └─▶ az containerapp logs show --follow
```

## Complete Setup Checklist

```
Pre-Setup
☐ Azure CLI installed
☐ Logged in to Azure (az login)
☐ Container App deployed
☐ GoDaddy DNS access

Setup Execution
☐ Run: .\scripts\setup-custom-domain.ps1
☐ Copy validation token from script
☐ Add TXT record in GoDaddy
☐ Add CNAME record in GoDaddy
☐ Wait for DNS propagation (5-15 min)
☐ Press Enter in script
☐ Wait for SSL certificate (5-10 min)

Post-Setup
☐ Test: https://quiz2biz.com/health
☐ Test: https://quiz2biz.com/api/v1/health
☐ Update CORS_ORIGIN environment variable
☐ Verify SSL certificate in browser
☐ Check no mixed content warnings
☐ Test API documentation: /docs

Monitoring
☐ Set up Azure Alerts for cert expiration
☐ Monitor Container App logs
☐ Test SSL rating: ssllabs.com
```

## File Structure After Setup

```
Quiz-to-build/
│
├── scripts/
│   ├── setup-custom-domain.ps1        ← Run this for Windows
│   └── setup-custom-domain.sh         ← Run this for Linux/Mac
│
├── docs/
│   ├── HTTPS-QUICK-START.md           ← START HERE 📖
│   ├── HTTPS-SETUP-SUMMARY.md         ← Overview
│   ├── CUSTOM-DOMAIN-SETUP.md         ← Complete guide
│   └── HTTPS-FLOW-DIAGRAM.md          ← This file
│
├── apps/api/src/
│   ├── main.ts                        ← ✅ HSTS & security headers
│   └── config/configuration.ts        ← ✅ Fixed duplicates
│
└── .env.production.example            ← ✅ Updated with quiz2biz.com
```

## Quick Command Reference

```powershell
# Setup
.\scripts\setup-custom-domain.ps1

# Check DNS
Resolve-DnsName quiz2biz.com
Resolve-DnsName asuid.quiz2biz.com -Type TXT

# Check Container App
az containerapp show --name ca-questionnaire-api-prod --resource-group rg-questionnaire-prod

# Check Certificates
az containerapp hostname list --name ca-questionnaire-api-prod --resource-group rg-questionnaire-prod

# Update Environment
az containerapp update --name ca-questionnaire-api-prod --resource-group rg-questionnaire-prod --set-env-vars CORS_ORIGIN="https://quiz2biz.com"

# View Logs
az containerapp logs show --name ca-questionnaire-api-prod --resource-group rg-questionnaire-prod --follow

# Test HTTPS
curl -I https://quiz2biz.com/health
Invoke-WebRequest https://quiz2biz.com/health
```

---

**Ready to start?** → [HTTPS-QUICK-START.md](./HTTPS-QUICK-START.md)
