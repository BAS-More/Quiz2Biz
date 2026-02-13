# HTTPS Setup Summary for quiz2biz.com

## 📋 Setup Status: Ready to Execute

**Domain:** quiz2biz.com (GoDaddy)  
**Platform:** Azure Container Apps  
**SSL Provider:** Azure Managed Certificate (Let's Encrypt)  
**Cost:** $0 (Free)

---

## 🎯 What Has Been Prepared

### 1. Setup Scripts Created ✅
- **Windows:** `scripts/setup-custom-domain.ps1`
- **Linux/Mac:** `scripts/setup-custom-domain.sh`

### 2. Application Security Enhancements ✅
- HSTS headers configured (forces HTTPS)
- Helmet.js security middleware configured
- CORS updated to support multiple origins
- Environment variable examples updated

### 3. Documentation Created ✅
- **Quick Start Guide:** `docs/HTTPS-QUICK-START.md` *(START HERE)*
- **Complete Guide:** `docs/CUSTOM-DOMAIN-SETUP.md` *(Full details)*
- **Production Config:** `.env.production.example` *(Updated with quiz2biz.com)*

---

## 🚀 How to Execute Setup

### **Step 1: Login to Azure**
```powershell
az login
```

### **Step 2: Run the Setup Script**
```powershell
cd "c:\Users\avi\OneDrive - BAS & More\Qoder Repo\Quiz-to-build\Quiz-to-build"
.\scripts\setup-custom-domain.ps1
```

### **Step 3: Follow the Script Instructions**
The script will:
1. Validate your Azure setup
2. Display your **validation token**
3. Show **exact DNS records** to add in GoDaddy
4. Wait for you to configure DNS
5. Bind the domain and enable SSL
6. Verify HTTPS is working

### **Step 4: Configure DNS in GoDaddy**
When the script pauses, go to GoDaddy and add:

**TXT Record:**
```
Name:  asuid
Value: <from-script-output>
TTL:   600
```

**CNAME Record:**
```
Name:  @ (or use domain forwarding)
Value: <your-azure-domain>.azurecontainerapps.io
TTL:   3600
```

### **Step 5: Verify**
After setup completes, test:
```powershell
# Test HTTPS
curl https://quiz2biz.com/health

# Test API
curl https://quiz2biz.com/api/v1/health
```

---

## 📊 Expected Timeline

| Step | Time |
|------|------|
| Run script | 2 minutes |
| Configure DNS in GoDaddy | 3 minutes |
| DNS propagation | 5-15 minutes |
| SSL certificate provisioning | 5-10 minutes |
| **Total** | **15-30 minutes** |

---

## 🔐 Security Features Enabled

| Feature | Status | Benefit |
|---------|--------|---------|
| HTTPS | ✅ Enabled | Encrypted traffic |
| HSTS | ✅ Enabled | Force HTTPS for 1 year |
| Managed SSL | ✅ Enabled | Auto-renewing certificate |
| Helmet.js | ✅ Enabled | XSS & clickjacking protection |
| CORS | ✅ Configured | Only allow quiz2biz.com |

---

## 🎨 Application Updates Made

### **1. main.ts (NestJS Bootstrap)**
**Location:** `apps/api/src/main.ts`

**Changes:**
- Added HSTS headers for production
- Enhanced helmet.js configuration
- Updated CORS to support multiple origins
- Added Swagger toggle via environment variable

### **2. configuration.ts**
**Location:** `apps/api/src/config/configuration.ts`

**Changes:**
- Removed duplicate content
- Configuration now clean and consistent

### **3. .env.production.example**
**Updated with:**
```env
CORS_ORIGIN=https://quiz2biz.com,https://www.quiz2biz.com
ENABLE_SWAGGER=false
```

---

## 📁 Files Created

```
Quiz-to-build/
├── scripts/
│   ├── setup-custom-domain.ps1      ← Windows PowerShell script
│   └── setup-custom-domain.sh       ← Linux/Mac Bash script
├── docs/
│   ├── HTTPS-QUICK-START.md         ← Quick reference (START HERE)
│   └── CUSTOM-DOMAIN-SETUP.md       ← Complete guide with troubleshooting
└── .env.production.example          ← Updated with quiz2biz.com
```

---

## ✅ Pre-Execution Checklist

Before running the setup script, ensure:

- [ ] Azure CLI is installed
- [ ] You're logged in to Azure (`az login`)
- [ ] Container App is deployed to Azure
- [ ] You have access to GoDaddy DNS management
- [ ] Resource group exists: `rg-questionnaire-prod`
- [ ] Container App exists: `ca-questionnaire-api-prod`

**Check your resources:**
```powershell
# List resource groups
az group list --query "[].name" -o table

# List container apps
az containerapp list --resource-group rg-questionnaire-prod --query "[].name" -o table
```

---

## 🔄 After Setup: Update Environment Variables

Once HTTPS is working, update your Container App:

```powershell
az containerapp update \
  --name ca-questionnaire-api-prod \
  --resource-group rg-questionnaire-prod \
  --set-env-vars `
    CORS_ORIGIN="https://quiz2biz.com,https://www.quiz2biz.com" `
    ENABLE_SWAGGER="false"
```

Or update via Azure Portal:
1. Go to **Container Apps** > `ca-questionnaire-api-prod`
2. **Settings** > **Environment variables**
3. Update:
   - `CORS_ORIGIN` → `https://quiz2biz.com,https://www.quiz2biz.com`
   - `ENABLE_SWAGGER` → `false` (for production security)

---

## 🐛 Common Issues & Solutions

### Issue: "Container App not found"
**Solution:** Update script parameters:
```powershell
.\scripts\setup-custom-domain.ps1 `
  -ResourceGroup "your-actual-rg-name" `
  -ContainerAppName "your-actual-app-name"
```

### Issue: DNS not propagating
**Solution:** Wait 15-30 minutes and check with:
```powershell
Resolve-DnsName asuid.quiz2biz.com -Type TXT
Resolve-DnsName quiz2biz.com
```

### Issue: Certificate stuck in "pending"
**Solution:** Remove and re-add:
```powershell
az containerapp hostname delete \
  --hostname quiz2biz.com \
  --resource-group rg-questionnaire-prod \
  --name ca-questionnaire-api-prod

# Wait 5 minutes, then run setup script again
```

---

## 📞 Support & Resources

### Quick Help
- **Quick Start:** [docs/HTTPS-QUICK-START.md](./HTTPS-QUICK-START.md)
- **Full Guide:** [docs/CUSTOM-DOMAIN-SETUP.md](./CUSTOM-DOMAIN-SETUP.md)

### External Resources
- **Azure Docs:** https://learn.microsoft.com/en-us/azure/container-apps/custom-domains
- **GoDaddy DNS:** https://www.godaddy.com/help/manage-dns-records-680
- **SSL Test:** https://www.ssllabs.com/ssltest/analyze.html?d=quiz2biz.com

### Azure Support
```powershell
# View Container App logs
az containerapp logs show \
  --name ca-questionnaire-api-prod \
  --resource-group rg-questionnaire-prod \
  --follow
```

---

## 🎯 Next Steps After HTTPS Setup

1. ✅ Verify HTTPS works: `https://quiz2biz.com/health`
2. Test all API endpoints
3. Update frontend app to use `https://quiz2biz.com/api/v1`
4. Monitor application logs for any CORS issues
5. Test SSL certificate: https://www.ssllabs.com/ssltest/
6. Optional: Add `www.quiz2biz.com` as additional hostname

---

## 💰 Cost Breakdown

| Service | Cost |
|---------|------|
| Custom Domain Binding | **FREE** |
| SSL Certificate (Let's Encrypt) | **FREE** |
| Certificate Auto-Renewal | **FREE** |
| **Total Additional Cost** | **$0/month** |

*Note: You still pay for Container Apps, Database, and Redis as usual.*

---

## 🔒 SSL Certificate Details

- **Type:** Domain Validated (DV)
- **Issuer:** Let's Encrypt
- **Validity:** 90 days
- **Renewal:** Automatic (45 days before expiry)
- **Wildcard:** No (specific to quiz2biz.com)
- **Browser Trust:** All modern browsers ✅

---

## 📈 Monitoring SSL Certificate

Azure automatically handles certificate renewal, but you can monitor:

```powershell
# Check certificate binding
az containerapp hostname list \
  --name ca-questionnaire-api-prod \
  --resource-group rg-questionnaire-prod -o table

# Expected output should show: bindingType = "SniEnabled"
```

**Set up Azure Alerts (optional):**
1. Azure Portal > Container App
2. Monitoring > Alerts
3. Create alert for "Certificate Expiration"

---

## ✨ Final Status

**Setup Preparation: 100% Complete**

All scripts, documentation, and code updates are ready. You can now:

1. **Read:** [docs/HTTPS-QUICK-START.md](./HTTPS-QUICK-START.md)
2. **Execute:** `.\scripts\setup-custom-domain.ps1`
3. **Configure:** DNS records in GoDaddy
4. **Verify:** `https://quiz2biz.com/health`

**Estimated total time:** 15-30 minutes

---

*Setup prepared on: January 27, 2026*  
*Domain: quiz2biz.com*  
*Platform: Azure Container Apps*  
*SSL: Managed Certificate (Let's Encrypt)*
