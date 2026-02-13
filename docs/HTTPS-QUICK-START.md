# HTTPS Setup - Quick Start Guide for quiz2biz.com

## 🚀 Quick Setup (5 Steps)

### Step 1: Run the Setup Script

**Windows (PowerShell):**
```powershell
.\scripts\setup-custom-domain.ps1
```

**Linux/Mac (Bash):**
```bash
chmod +x scripts/setup-custom-domain.sh
./scripts/setup-custom-domain.sh
```

The script will display your validation token and DNS configuration requirements.

---

### Step 2: Configure DNS in GoDaddy

1. Go to https://dcc.godaddy.com/
2. Navigate to **My Products** > **Domains** > **quiz2biz.com** > **DNS**

**Add these 2 records:**

#### Record 1: Domain Verification (TXT)
```
Type:  TXT
Name:  asuid
Value: <your-validation-token-from-script>
TTL:   600
```

#### Record 2: Domain Mapping (CNAME or A)

**Option A - CNAME (preferred):**
```
Type:  CNAME
Name:  @
Value: <your-azure-domain>.azurecontainerapps.io
TTL:   3600
```

**Option B - If CNAME not allowed for root domain:**
Use GoDaddy's **Domain Forwarding** feature:
- Forward: `quiz2biz.com` → `www.quiz2biz.com`
- Enable: **Forward with masking** + **HTTPS**

Then add CNAME for www:
```
Type:  CNAME
Name:  www
Value: <your-azure-domain>.azurecontainerapps.io
TTL:   3600
```

---

### Step 3: Wait for DNS Propagation

- **Typical time:** 5-15 minutes
- **Maximum time:** 48 hours (rare)

**Check DNS status:**
```powershell
# Windows PowerShell
Resolve-DnsName asuid.quiz2biz.com -Type TXT
Resolve-DnsName quiz2biz.com
```

Or use online tools:
- https://dnschecker.org
- https://www.whatsmydns.net

---

### Step 4: Press Enter in the Script

Once DNS is configured, press **Enter** in the running script. It will:
- Bind the custom domain to Azure
- Enable free managed SSL certificate
- Verify HTTPS is working

---

### Step 5: Update Environment Variables

Update your Azure Container App environment with:

```bash
az containerapp update \
  --name ca-questionnaire-api-prod \
  --resource-group rg-questionnaire-prod \
  --set-env-vars CORS_ORIGIN="https://quiz2biz.com,https://www.quiz2biz.com"
```

Or update via Azure Portal:
1. Go to Container App
2. Settings > Environment variables
3. Update `CORS_ORIGIN` to: `https://quiz2biz.com,https://www.quiz2biz.com`

---

## ✅ Verification Checklist

After setup, verify these URLs work:

- [ ] https://quiz2biz.com/health *(should return 200 OK)*
- [ ] https://quiz2biz.com/api/v1/health *(API health check)*
- [ ] https://quiz2biz.com/docs *(Swagger documentation)*
- [ ] http://quiz2biz.com *(should redirect to HTTPS)*
- [ ] Browser shows valid SSL certificate (green padlock)

---

## 🔒 Security Features Enabled

✅ **HTTPS Everywhere** - Automatic HTTP → HTTPS redirect  
✅ **HSTS Headers** - Force HTTPS for 1 year  
✅ **Managed SSL Certificate** - Free Let's Encrypt cert, auto-renews  
✅ **Helmet.js Security** - XSS, clickjacking, and other protections  
✅ **CORS Configuration** - Only allow quiz2biz.com origins  

---

## 📊 Certificate Information

- **Issuer:** Let's Encrypt
- **Validity:** 90 days
- **Auto-Renewal:** 45 days before expiration
- **Cost:** Free (Azure managed)
- **No manual renewal needed**

---

## 🐛 Troubleshooting

### DNS not propagating?
```powershell
# Flush local DNS cache
ipconfig /flushdns

# Check from Google DNS
nslookup quiz2biz.com 8.8.8.8
```

### SSL certificate not provisioning?
```bash
# Check certificate status
az containerapp hostname list \
  --name ca-questionnaire-api-prod \
  --resource-group rg-questionnaire-prod -o table

# If stuck, remove and re-add
az containerapp hostname delete \
  --hostname quiz2biz.com \
  --resource-group rg-questionnaire-prod \
  --name ca-questionnaire-api-prod

# Wait 5 minutes, then run setup script again
```

### Site not accessible after setup?
```bash
# Check Container App logs
az containerapp logs show \
  --name ca-questionnaire-api-prod \
  --resource-group rg-questionnaire-prod \
  --follow

# Restart the app
az containerapp revision restart \
  --name ca-questionnaire-api-prod \
  --resource-group rg-questionnaire-prod
```

---

## 📞 Support Resources

- **Full Documentation:** [docs/CUSTOM-DOMAIN-SETUP.md](../docs/CUSTOM-DOMAIN-SETUP.md)
- **Azure Custom Domains:** https://learn.microsoft.com/en-us/azure/container-apps/custom-domains
- **GoDaddy DNS Help:** https://www.godaddy.com/help/manage-dns-records-680
- **SSL Test:** https://www.ssllabs.com/ssltest/

---

## 🎯 Next Steps

1. ✅ HTTPS is working
2. Test API endpoints with Postman/Insomnia
3. Update frontend app to use `https://quiz2biz.com`
4. Monitor SSL certificate auto-renewal (Azure handles this)
5. Consider adding `www.quiz2biz.com` if needed

---

**Setup Time:** ~15 minutes (including DNS propagation)  
**Cost:** $0 (free managed SSL certificate)  
**Maintenance:** Zero (auto-renewal)

Good luck! 🚀
