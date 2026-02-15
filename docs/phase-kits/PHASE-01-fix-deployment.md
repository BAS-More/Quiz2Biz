# Phase 1: Fix Deployment

> **Objective:** Get the existing site running at quiz2biz.com before any code changes.
> **Branch:** `phase-1/fix-deployment`
> **Dependencies:** None
> **Acceptance:** quiz2biz.com loads. API returns 200 on /health. User can register and log in.

---

## Pre-flight

```bash
git checkout main
git pull origin main
git checkout -b phase-1/fix-deployment
```

---

## Task 1.1 — Diagnose Azure App Service

**Action:** Check why quiz2biz.com is not responding.

```bash
# Check Azure App Service status
az webapp show --name quiz2biz --resource-group <RG_NAME> --query "state"

# Get container logs
az webapp log tail --name quiz2biz --resource-group <RG_NAME>

# Check environment variables
az webapp config appsettings list --name quiz2biz --resource-group <RG_NAME> --output table

# Check health endpoint directly
curl -v https://quiz2biz.com/api/health
```

**Diagnose:** Look for:
- Missing environment variables (DATABASE_URL, REDIS_URL, JWT_SECRET)
- Container crash loops (check restart count)
- Port binding issues (app must listen on PORT env var, defaults to 8080 in Azure)
- SSL/certificate issues

**Output:** List of issues found. Fix each one below.

---

## Task 1.2 — Fix Database Connection

**Action:** Ensure DATABASE_URL points to Azure PostgreSQL and Prisma can connect.

```bash
# Verify connection string format
# Must be: postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require

# Test connection from local
npx prisma db pull

# Run pending migrations
npx prisma migrate deploy

# Verify schema matches
npx prisma migrate status
```

**If database doesn't exist yet:**
```bash
az postgres flexible-server db create \
  --resource-group <RG_NAME> \
  --server-name <SERVER_NAME> \
  --database-name quiz2biz

# Then set DATABASE_URL in App Service config
az webapp config appsettings set \
  --name quiz2biz \
  --resource-group <RG_NAME> \
  --settings DATABASE_URL="postgresql://..."
```

**Output:** `prisma migrate status` shows all migrations applied.

---

## Task 1.3 — Fix Redis Connection

**Action:** Ensure REDIS_URL points to Azure Cache for Redis.

```bash
# Verify Redis connection string format
# Must be: rediss://:<PASSWORD>@<HOST>:6380 (note: rediss with SSL, port 6380)

# Set if missing
az webapp config appsettings set \
  --name quiz2biz \
  --resource-group <RG_NAME> \
  --settings REDIS_URL="rediss://..."
```

**If Redis instance doesn't exist:**
```bash
az redis create \
  --name quiz2biz-cache \
  --resource-group <RG_NAME> \
  --location australiaeast \
  --sku Basic \
  --vm-size C0
```

**Output:** Redis connection verified. No connection errors in logs.

---

## Task 1.4 — Verify API Health

**Action:** Confirm /health endpoint returns 200.

```bash
curl -s https://quiz2biz.com/api/health | jq .
```

**Expected response:**
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "timestamp": "..."
}
```

If health controller doesn't check DB/Redis, verify in `apps/api/src/modules/health/health.controller.ts` or equivalent.

**Output:** 200 response with all services connected.

---

## Task 1.5 — Verify Frontend Loads

**Action:** Confirm React SPA loads at quiz2biz.com.

```bash
curl -s https://quiz2biz.com | head -20
```

**Check:**
- HTML contains React root div
- JS bundle loads (check browser dev tools)
- No CORS errors between frontend and API
- FRONTEND_URL env var matches actual domain

**If SPA routing broken (404 on refresh):** Ensure Azure App Service has a startup command or web.config that routes all paths to index.html.

**Output:** Login page renders in browser.

---

## Task 1.6 — Seed Production Database

**Action:** Run seed scripts to populate base data.

```bash
# Run from project root
npx prisma db seed
```

**Verify seed data:**
```bash
npx prisma studio
# Check: Users table has admin user, Questions populated, Document types exist
```

**Output:** Base data populated. Prisma Studio shows records.

---

## Task 1.7 — Test Auth Flow

**Action:** End-to-end test of registration, login, and logout.

**Manual test sequence:**
1. Navigate to quiz2biz.com
2. Click "Register" → fill form → submit → account created
3. Check email verification if enabled (or verify in DB directly)
4. Login with credentials → dashboard loads
5. Check JWT in browser cookies/localStorage
6. Logout → redirected to login page
7. Try accessing protected route → redirected to login

**Output:** All 7 steps pass. Auth flow works end-to-end.

---

## Task 1.8 — Document All Fixes

**Action:** Create deployment fix log.

**Create file:** `DEPLOYMENT-FIX-LOG.md`

```markdown
# Deployment Fix Log — Phase 1

**Date:** [DATE]
**Environment:** Azure App Service (quiz2biz)

## Issues Found
1. [Issue description]
   - **Cause:** [Root cause]
   - **Fix:** [What was changed]
   - **Verified:** [How it was tested]

2. [Next issue...]

## Environment Variables Set
| Variable | Status | Notes |
|----------|--------|-------|
| DATABASE_URL | ✅ Set | Azure PostgreSQL |
| REDIS_URL | ✅ Set | Azure Cache for Redis |
| JWT_SECRET | ✅ Set | [generated] |
| ... | ... | ... |

## Post-Fix Verification
- [ ] quiz2biz.com loads
- [ ] /api/health returns 200
- [ ] Registration works
- [ ] Login works
- [ ] Logout works
- [ ] No console errors in browser
```

---

## Completion

```bash
git add -A
git commit -m "Phase 1: Fix deployment — site live at quiz2biz.com"
git push origin phase-1/fix-deployment
```

**Do NOT merge to main yet.** Await Avi's verification.

**Acceptance checklist:**
- [ ] quiz2biz.com loads in browser
- [ ] API /health returns 200 with DB and Redis connected
- [ ] User can register a new account
- [ ] User can login and see dashboard
- [ ] User can logout
- [ ] DEPLOYMENT-FIX-LOG.md documents all changes
