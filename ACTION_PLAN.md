# Quiz2Biz - Detailed Action Plan for Incomplete Items

**Created:** March 2, 2026  
**Status:** Based on DEPLOYMENT_VALIDATION_REPORT.md  
**Total Items:** 8 tasks across 4 categories

---

## Table of Contents

1. [Critical Priority Tasks](#critical-priority-tasks)
2. [High Priority Tasks](#high-priority-tasks)
3. [Medium Priority Tasks](#medium-priority-tasks)
4. [Summary & Timeline](#summary--timeline)

---

## Critical Priority Tasks

### Task 1: Fix CLI Test Failures ❌ CRITICAL

**Status:** 5 test suites failing  
**Priority:** HIGH  
**Estimated Effort:** 2-4 hours  
**Blocking:** No (CLI not production-critical)

#### Problem Description

CLI tests are failing with TypeScript compilation errors related to accessing private Commander.js properties:

**Failing Tests:**
- `score.test.ts` - Error accessing `Command['_args']` property (line 91)
- `nqs.test.ts` - Error accessing `Command['_args']` property (line 80)
- `config.test.ts` - TypeScript compilation errors
- `heatmap.test.ts` - TypeScript compilation errors
- `offline.test.ts` - TypeScript compilation errors

**Root Cause:**
The test files are attempting to access a private property `_args` on Commander.js v11 Command objects, which doesn't exist in the public API.

```typescript
// ❌ FAILING CODE (line 91 in score.test.ts)
const args = scoreCommand['_args'];
expect(args[0].name()).toBe('sessionId');
```

#### Solution Steps

**Step 1: Replace Private Property Access with Public API**

Update test files to use the public Commander.js API instead of private properties:

```typescript
// ✅ CORRECT APPROACH - Test the behavior, not the internals
it('should accept session ID argument', async () => {
  const mockSessionId = 'test-session-123';
  await scoreCommand.parseAsync(['node', 'test', 'score', mockSessionId]);
  
  // Verify the command processed the argument correctly
  expect(mockApiClient.getScore).toHaveBeenCalledWith(mockSessionId);
});
```

**Step 2: Update Affected Test Files**

Files to modify:
1. `apps/cli/src/__tests__/score.test.ts` (line 91)
2. `apps/cli/src/__tests__/nqs.test.ts` (line 80)
3. `apps/cli/src/__tests__/config.test.ts` (investigate compilation errors)
4. `apps/cli/src/__tests__/heatmap.test.ts` (investigate compilation errors)
5. `apps/cli/src/__tests__/offline.test.ts` (investigate compilation errors)

**Step 3: Run Tests to Verify**

```bash
cd apps/cli
npm run test
```

Expected outcome: All 6 test suites should pass.

#### Acceptance Criteria

- [ ] All 5 failing test suites now pass
- [ ] No TypeScript compilation errors in CLI tests
- [ ] Tests verify command behavior (not internal structure)
- [ ] Test coverage remains at or above current level
- [ ] `npm run test --workspace=apps/cli` shows 100% pass rate

#### Implementation Notes

- Commander.js v11 uses a different internal structure than v10
- Tests should focus on command behavior (what it does) not structure (how it's built)
- Consider using integration-style tests that invoke the command and verify outputs
- Mock the API client to avoid external dependencies

#### Dependencies

None - can be completed independently

---

### Task 2: Run Database Migration Status Check ⚠️ HIGH

**Status:** Not verified  
**Priority:** HIGH  
**Estimated Effort:** 30 minutes  
**Blocking:** No (database appears operational)

#### Problem Description

Cannot verify database migration status because:
1. Local PostgreSQL not running (expected in dev environment)
2. Need to connect to Azure PostgreSQL to check migration status
3. Potential schema drift identified in integration tests (DecisionLog, Response models)

**Current Error:**
```
Error: P1001: Can't reach database server at `127.0.0.1:5432`
```

#### Solution Steps

**Step 1: Get Azure PostgreSQL Connection String**

```bash
# Get connection details
az postgres flexible-server show \
  --name psql-questionnaire-dev \
  --resource-group rg-questionnaire-dev \
  --query "{fqdn:fullyQualifiedDomainName,adminUser:administratorLogin}" \
  --output json

# Expected output:
{
  "fqdn": "psql-questionnaire-dev.postgres.database.azure.com",
  "adminUser": "adminuser"
}
```

**Step 2: Update DATABASE_URL for Migration Check**

Create temporary `.env.migration` file:

```bash
DATABASE_URL="postgresql://adminuser:YOUR_PASSWORD@psql-questionnaire-dev.postgres.database.azure.com:5432/questionnaire?sslmode=require"
```

**Step 3: Run Migration Status Check**

```bash
# Load migration environment
$env:DATABASE_URL = "postgresql://adminuser:PASSWORD@psql-questionnaire-dev.postgres.database.azure.com:5432/questionnaire?sslmode=require"

# Check migration status
npx prisma migrate status

# Expected output:
# Database schema is up to date!
# 2 migrations applied:
#   20260125000000_initial
#   20260126000000_quiz2biz_readiness
```

**Step 4: Verify Schema Drift**

If schema drift is detected:

```bash
# Generate a new migration to resolve drift
npx prisma migrate dev --name fix_schema_drift

# Or reset and reapply all migrations (CAUTION: data loss)
npx prisma migrate reset
npx prisma db push
```

#### Expected Migrations

Based on `prisma/migrations/` directory:
1. `20260125000000_initial` - Initial schema creation
2. `20260126000000_quiz2biz_readiness` - Quiz2Biz readiness features

#### Schema Drift Issues to Investigate

Integration tests show potential drift in:

1. **DecisionLog Model**:
   - Tests reference `userId` field (may have been renamed to `ownerId`)
   - Tests reference `approvalStatus`, `approvedBy`, `title` fields (may have been removed)

2. **Response Model**:
   - Tests fail with "value is required" error
   - Schema may require `value` field that tests aren't providing

3. **Session Model**:
   - Status enum may have changed values

#### Acceptance Criteria

- [ ] Successfully connect to Azure PostgreSQL
- [ ] `npx prisma migrate status` shows all migrations applied
- [ ] No pending migrations or schema drift
- [ ] Document any schema differences between code and database
- [ ] Integration tests updated to match current schema (if drift found)

#### Dependencies

- Azure PostgreSQL admin password
- Network connectivity to Azure (no IP restrictions blocking connection)

---

## High Priority Tasks

### Task 3: Verify Missing Infrastructure Components 🔍 HIGH

**Status:** Not verified  
**Priority:** HIGH  
**Estimated Effort:** 1 hour  
**Blocking:** Partially (some features may not work)

#### Problem Description

Several Azure infrastructure components were not verified during deployment validation:
- Azure Container Registry (ACR) - for Docker images
- Azure Cache for Redis - for caching and sessions
- Azure Key Vault - for secrets management
- Azure Storage Account - for document storage

Logs show Redis connections every 10 minutes, suggesting Redis is working, but not verified.

#### Solution Steps

**Step 1: Verify Azure Container Registry**

```bash
# List all Container Registries in subscription
az acr list --query "[].{Name:name,ResourceGroup:resourceGroup,LoginServer:loginServer}" --output table

# Check if specific registry exists
az acr show --name acrquestionnairedev --resource-group rg-questionnaire-dev --output json

# Verify repository and images
az acr repository list --name acrquestionnairedev --output table
az acr repository show-tags --name acrquestionnairedev --repository quiz2biz-api --output table
```

**Expected Output:**
```
Name                  Resource Group        Login Server
--------------------  --------------------  --------------------------------------------
acrquestionnairedev   rg-questionnaire-dev  acrquestionnairedev.azurecr.io

Repositories:
- quiz2biz-api
- quiz2biz-web

Latest tags:
- latest
- v1.0.0
```

**Step 2: Verify Azure Cache for Redis**

```bash
# List Redis caches
az redis list --resource-group rg-questionnaire-dev --query "[].{Name:name,ProvisioningState:provisioningState,HostName:hostName,Port:sslPort}" --output table

# Get Redis connection details
az redis show --name redis-questionnaire-dev --resource-group rg-questionnaire-dev --output json

# Get Redis keys
az redis list-keys --name redis-questionnaire-dev --resource-group rg-questionnaire-dev --output json
```

**Expected Output:**
```
Name                     Provisioning State    Host Name
-----------------------  --------------------  ------------------------------------------------
redis-questionnaire-dev  Succeeded             redis-questionnaire-dev.redis.cache.windows.net

Primary Key: [KEY_VALUE]
Secondary Key: [KEY_VALUE]
```

**Verification from Logs:**
The container logs show Redis reconnections every 10 minutes:
```
[RedisService] Redis connection established
```
This confirms Redis is operational.

**Step 3: Verify Azure Key Vault**

```bash
# List Key Vaults
az keyvault list --resource-group rg-questionnaire-dev --query "[].{Name:name,Location:location,VaultUri:properties.vaultUri}" --output table

# Check Key Vault secrets (if exists)
az keyvault secret list --vault-name kv-questionnaire-dev --output table
```

**Expected Output:**
```
Name                  Location    Vault Uri
--------------------  ----------  -------------------------------------------
kv-questionnaire-dev  eastus2     https://kv-questionnaire-dev.vault.azure.net/

Secrets:
- database-url
- jwt-secret
- redis-connection-string
- stripe-secret-key
- sendgrid-api-key
```

**Step 4: Verify Azure Storage Account**

```bash
# List Storage Accounts
az storage account list --resource-group rg-questionnaire-dev --query "[].{Name:name,Location:location,Kind:kind}" --output table

# Check Storage Account details
az storage account show --name stquestionnairedev --resource-group rg-questionnaire-dev --output json

# List containers
az storage container list --account-name stquestionnairedev --output table
```

**Expected Output:**
```
Name                   Location    Kind
---------------------  ----------  -----------
stquestionnairedev     eastus2     StorageV2

Containers:
- documents (for document generation)
- evidence (for evidence files)
- exports (for data exports)
```

#### Acceptance Criteria

- [ ] Azure Container Registry verified and accessible
- [ ] At least 2 Docker images present (api, web)
- [ ] Azure Cache for Redis confirmed operational
- [ ] Redis connection string documented
- [ ] Azure Key Vault status confirmed (or documented as not implemented)
- [ ] Azure Storage Account verified
- [ ] Document storage container exists and accessible
- [ ] All connection strings documented in secure location

#### Impact Assessment

**If components are missing:**

- **No ACR**: Cannot pull Docker images for new deployments (blocking for updates)
- **No Redis**: Caching and session management may fail (logs show it's working)
- **No Key Vault**: Secrets managed via Container App environment variables (acceptable)
- **No Storage**: Document generation will fail (needs verification)

#### Dependencies

- Azure subscription access
- Appropriate RBAC permissions (Reader or Contributor)
- Resource naming convention knowledge

---

## Medium Priority Tasks

### Task 4: Verify Swagger Documentation Endpoint 📚 MEDIUM

**Status:** Not verified at runtime  
**Priority:** MEDIUM  
**Estimated Effort:** 15 minutes  
**Blocking:** No (API functional without Swagger UI)

#### Problem Description

Swagger documentation endpoint `/api/v1/docs` exists in code but was not verified at runtime due to PowerShell curl syntax issues during validation.

**Code Evidence:**
- Swagger setup exists in `apps/api/src/main.ts`
- Health check response shows `docs` field: `/api/v1/docs`
- 100+ endpoints documented

#### Solution Steps

**Step 1: Test Swagger UI in Browser**

Open browser and navigate to:
```
https://ca-questionnaire-api-dev.ambitioussea-ad6d342d.eastus2.azurecontainerapps.io/api/v1/docs
```

**Expected Result:** Swagger UI should load showing all API endpoints with documentation.

**Step 2: Verify with PowerShell (Correct Syntax)**

```powershell
# Get Swagger JSON spec
$response = Invoke-RestMethod -Uri "https://ca-questionnaire-api-dev.ambitioussea-ad6d342d.eastus2.azurecontainerapps.io/api/v1/docs-json" -Method Get
$response | ConvertTo-Json -Depth 3 | Out-File swagger-spec.json

# Check number of endpoints
$response.paths.Count
# Expected: 100+
```

**Step 3: Test Sample Endpoints from Swagger**

Test a few documented endpoints:

```powershell
# Test GET /api/v1/questionnaire
Invoke-RestMethod -Uri "https://ca-questionnaire-api-dev.ambitioussea-ad6d342d.eastus2.azurecontainerapps.io/api/v1/questionnaire" -Method Get

# Test GET /api/v1/standards
Invoke-RestMethod -Uri "https://ca-questionnaire-api-dev.ambitioussea-ad6d342d.eastus2.azurecontainerapps.io/api/v1/standards" -Method Get
```

#### Acceptance Criteria

- [ ] Swagger UI loads at `/api/v1/docs`
- [ ] All documented endpoints visible (100+ expected)
- [ ] Swagger JSON spec downloadable at `/api/v1/docs-json`
- [ ] Sample API calls from Swagger work correctly
- [ ] Authentication endpoints documented with security requirements

#### Dependencies

None - can test immediately

---

### Task 5: Verify OAuth Callback Routes 🔐 MEDIUM

**Status:** Not runtime tested  
**Priority:** MEDIUM  
**Estimated Effort:** 30 minutes  
**Blocking:** No (affects OAuth login only)

#### Problem Description

OAuth callback routes exist in code but were not tested with real OAuth flow:
- `/auth/callback/google`
- `/auth/callback/microsoft`

**Code Evidence:**
- Auth module exists with OAuth controllers
- OAuthButtons component exists in Web app
- Requires OAuth credentials to test

#### Solution Steps

**Step 1: Verify OAuth Credentials in Environment**

Check that `.env.production` contains:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://ca-questionnaire-api-dev.ambitioussea-ad6d342d.eastus2.azurecontainerapps.io/auth/callback/google

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_CALLBACK_URL=https://ca-questionnaire-api-dev.ambitioussea-ad6d342d.eastus2.azurecontainerapps.io/auth/callback/microsoft
```

**Step 2: Configure OAuth Providers**

**For Google:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services > Credentials
3. Add authorized redirect URI: `https://ca-questionnaire-api-dev.ambitioussea-ad6d342d.eastus2.azurecontainerapps.io/auth/callback/google`

**For Microsoft:**
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to Azure Active Directory > App registrations
3. Add redirect URI: `https://ca-questionnaire-api-dev.ambitioussea-ad6d342d.eastus2.azurecontainerapps.io/auth/callback/microsoft`

**Step 3: Manual Smoke Test**

1. Open web app: `https://ca-questionnaire-web-dev.ambitioussea-ad6d342d.eastus2.azurecontainerapps.io/login`
2. Click "Sign in with Google" button
3. Complete Google OAuth flow
4. Verify successful redirect and JWT token received
5. Repeat for "Sign in with Microsoft"

**Step 4: Verify in Browser DevTools**

Check Network tab for:
- Request to `/auth/callback/google` or `/auth/callback/microsoft`
- Response with JWT tokens
- Successful redirect to dashboard

#### Acceptance Criteria

- [ ] OAuth credentials configured in .env.production
- [ ] OAuth providers configured with correct callback URLs
- [ ] Google OAuth flow completes successfully
- [ ] Microsoft OAuth flow completes successfully
- [ ] JWT tokens received and stored correctly
- [ ] User session created in database
- [ ] Redirect to dashboard after successful login

#### Dependencies

- OAuth application credentials (Google Cloud, Azure AD)
- .env.production updated on Container Apps
- Container Apps restarted after environment variable update

---

### Task 6: Verify GitHub Secrets Configuration 🔑 MEDIUM

**Status:** Not verified  
**Priority:** MEDIUM  
**Estimated Effort:** 15 minutes  
**Blocking:** No (deployment working suggests secrets are configured)

#### Problem Description

GitHub repository secrets used for CI/CD were not verified during validation. The fact that containers are deployed and running suggests secrets are configured, but explicit verification is needed.

**Required Secrets for CI/CD:**
- `AZURE_CREDENTIALS` - Azure service principal for deployment
- `ACR_USERNAME` - Azure Container Registry username
- `ACR_PASSWORD` - Azure Container Registry password
- `DATABASE_URL` - Production database connection string
- `JWT_SECRET` - JWT signing secret
- `REDIS_URL` - Redis connection string
- `STRIPE_SECRET_KEY` - Stripe payment integration
- `SENDGRID_API_KEY` - Email service

#### Solution Steps

**Step 1: Access GitHub Repository Settings**

Navigate to:
```
https://github.com/BAS-More/Quiz-to-build/settings/secrets/actions
```

**Step 2: Verify Required Secrets Exist**

Check that all required secrets are present (names only, not values):

- [ ] `AZURE_CREDENTIALS`
- [ ] `ACR_USERNAME`
- [ ] `ACR_PASSWORD`
- [ ] `DATABASE_URL`
- [ ] `JWT_SECRET`
- [ ] `REDIS_URL`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `SENDGRID_API_KEY`
- [ ] `ANTHROPIC_API_KEY` (for AI features)
- [ ] `AZURE_STORAGE_CONNECTION_STRING`

**Step 3: Verify via GitHub CLI (Alternative)**

```bash
# Install GitHub CLI if not installed
# winget install GitHub.cli

# Login to GitHub
gh auth login

# List repository secrets
gh secret list --repo BAS-More/Quiz-to-build
```

**Expected Output:**
```
AZURE_CREDENTIALS                 Updated 2026-01-15
ACR_USERNAME                      Updated 2026-01-15
ACR_PASSWORD                      Updated 2026-01-15
DATABASE_URL                      Updated 2026-01-20
JWT_SECRET                        Updated 2026-01-20
REDIS_URL                         Updated 2026-01-20
STRIPE_SECRET_KEY                 Updated 2026-01-25
SENDGRID_API_KEY                  Updated 2026-01-25
```

**Step 4: Verify Secrets in GitHub Actions Workflow**

Check `.github/workflows/` files reference these secrets correctly:

```yaml
env:
  AZURE_CREDENTIALS: ${{ secrets.AZURE_CREDENTIALS }}
  ACR_USERNAME: ${{ secrets.ACR_USERNAME }}
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

#### Acceptance Criteria

- [ ] All required secrets present in GitHub repository
- [ ] Secret names match workflow file references
- [ ] No expired or outdated secrets
- [ ] Secrets updated within last 90 days (best practice)
- [ ] Documentation created listing all secrets (without values)

#### Dependencies

- GitHub repository access
- GitHub Actions permissions

---

### Task 7: Set Up Production Environment (Separate from Dev) 🏗️ MEDIUM

**Status:** Not implemented  
**Priority:** MEDIUM  
**Estimated Effort:** 4-6 hours  
**Blocking:** No (can continue with dev environment)

#### Problem Description

Current deployment is in development environment (`rg-questionnaire-dev`). Production environment should be separate for:
- Data isolation
- Different scaling requirements
- Production-grade security
- Cost optimization

#### Solution Steps

**Step 1: Create Production Resource Group**

```bash
# Create production resource group
az group create \
  --name rg-questionnaire-prod \
  --location eastus2

# Tag for cost tracking
az group update \
  --name rg-questionnaire-prod \
  --tags environment=production project=quiz2biz cost-center=operations
```

**Step 2: Deploy Production Infrastructure**

Use Terraform or Azure CLI to create:

1. **Production PostgreSQL**:
   ```bash
   az postgres flexible-server create \
     --name psql-questionnaire-prod \
     --resource-group rg-questionnaire-prod \
     --location eastus2 \
     --version 16 \
     --tier GeneralPurpose \
     --sku-name Standard_D2s_v3 \
     --storage-size 128 \
     --high-availability Enabled \
     --backup-retention 30
   ```

2. **Production Redis Cache**:
   ```bash
   az redis create \
     --name redis-questionnaire-prod \
     --resource-group rg-questionnaire-prod \
     --location eastus2 \
     --sku Standard \
     --vm-size c1
   ```

3. **Production Container Apps**:
   ```bash
   az containerapp create \
     --name ca-questionnaire-api-prod \
     --resource-group rg-questionnaire-prod \
     --environment prod-env \
     --image acrquestionnairedev.azurecr.io/quiz2biz-api:latest \
     --min-replicas 2 \
     --max-replicas 10
   ```

**Step 3: Configure Production Security**

- Enable private endpoints for database
- Configure network security groups
- Enable Azure Defender for Cloud
- Set up Azure Firewall rules
- Configure managed identities

**Step 4: Run Production Migrations**

```bash
# Set production DATABASE_URL
$env:DATABASE_URL = "postgresql://admin:PASSWORD@psql-questionnaire-prod.postgres.database.azure.com:5432/questionnaire?sslmode=require"

# Run migrations
npx prisma migrate deploy

# Seed initial data
npx prisma db seed
```

**Step 5: Update CI/CD Pipeline**

Add production deployment stage in `azure-pipelines.yml`:

```yaml
- stage: DeployProduction
  dependsOn: DeployStaging
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
  jobs:
  - deployment: DeployToProd
    environment: production
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureContainerApps@1
            inputs:
              containerAppName: 'ca-questionnaire-api-prod'
              resourceGroup: 'rg-questionnaire-prod'
```

#### Acceptance Criteria

- [ ] Production resource group created
- [ ] Production database provisioned (HA enabled)
- [ ] Production Redis cache provisioned
- [ ] Production Container Apps deployed
- [ ] Production environment variables configured
- [ ] Production migrations applied
- [ ] Production data seeded (questions, dimensions, standards)
- [ ] Separate CI/CD pipeline stage for production
- [ ] Manual approval gate before production deployment

#### Dependencies

- Budget approval for production resources
- Production environment variable values
- Production SSL certificates
- Production domain configuration

---

### Task 8: Configure Application Insights Monitoring 📊 MEDIUM

**Status:** Not verified  
**Priority:** MEDIUM  
**Estimated Effort:** 1 hour  
**Blocking:** No (system operational without monitoring)

#### Problem Description

Application Insights appears to be in use (mentioned in codebase) but not verified during deployment validation. Production monitoring is critical for:
- Error tracking
- Performance monitoring
- User behavior analytics
- Alerting on issues

#### Solution Steps

**Step 1: Verify Application Insights Resource**

```bash
# List Application Insights instances
az monitor app-insights component list \
  --resource-group rg-questionnaire-dev \
  --query "[].{Name:name,Location:location,InstrumentationKey:instrumentationKey}" \
  --output table
```

**Step 2: Create Application Insights (if not exists)**

```bash
# Create Application Insights
az monitor app-insights component create \
  --app appi-questionnaire-dev \
  --resource-group rg-questionnaire-dev \
  --location eastus2 \
  --kind web \
  --application-type web

# Get connection string
az monitor app-insights component show \
  --app appi-questionnaire-dev \
  --resource-group rg-questionnaire-dev \
  --query connectionString \
  --output tsv
```

**Step 3: Configure Container Apps**

Add Application Insights connection string to Container App environment variables:

```bash
az containerapp update \
  --name ca-questionnaire-api-dev \
  --resource-group rg-questionnaire-dev \
  --set-env-vars "APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=xxx;IngestionEndpoint=https://eastus2-1.in.applicationinsights.azure.com/"
```

**Step 4: Verify Telemetry**

After restart, check that telemetry is being received:

```bash
# Query Application Insights
az monitor app-insights metrics show \
  --app appi-questionnaire-dev \
  --resource-group rg-questionnaire-dev \
  --metric "requests/count" \
  --start-time "2026-03-02T00:00:00Z" \
  --end-time "2026-03-02T23:59:59Z"
```

**Step 5: Configure Alerts**

Create alert rules for:

1. **High Error Rate**:
   ```bash
   az monitor metrics alert create \
     --name "high-error-rate" \
     --resource-group rg-questionnaire-dev \
     --scopes $(az containerapp show --name ca-questionnaire-api-dev --resource-group rg-questionnaire-dev --query id -o tsv) \
     --condition "avg exceptions/count > 50" \
     --window-size 5m \
     --evaluation-frequency 1m
   ```

2. **High Response Time**:
   ```bash
   az monitor metrics alert create \
     --name "high-response-time" \
     --resource-group rg-questionnaire-dev \
     --scopes $(az containerapp show --name ca-questionnaire-api-dev --resource-group rg-questionnaire-dev --query id -o tsv) \
     --condition "avg requests/duration > 1000" \
     --window-size 5m
   ```

3. **CPU/Memory Alerts** (already partially done - verify):
   - CPU > 80% for 5 minutes
   - Memory > 90% for 5 minutes

#### Acceptance Criteria

- [ ] Application Insights resource verified or created
- [ ] Connection string configured in Container Apps
- [ ] Telemetry visible in Azure Portal
- [ ] Error tracking functional
- [ ] Performance metrics being collected
- [ ] Alert rules configured for critical metrics
- [ ] Email/Teams notifications configured
- [ ] Dashboard created for key metrics

#### Dependencies

- Azure subscription access
- Container Apps restart permission
- Azure Monitor permissions

---

## Summary & Timeline

### Priority Matrix

| Priority | Task | Effort | Blocking | Timeline |
|----------|------|--------|----------|----------|
| HIGH | Fix CLI Test Failures | 2-4 hrs | No | Days 1-2 |
| HIGH | Database Migration Check | 30 min | No | Day 1 |
| HIGH | Verify Infrastructure Components | 1 hr | Partial | Days 1-2 |
| MEDIUM | Verify Swagger Docs | 15 min | No | Day 1 |
| MEDIUM | Verify OAuth Callbacks | 30 min | No | Days 2-3 |
| MEDIUM | Verify GitHub Secrets | 15 min | No | Day 1 |
| MEDIUM | Production Environment | 4-6 hrs | No | Week 2 |
| MEDIUM | Application Insights | 1 hr | No | Days 3-4 |

### Recommended Execution Order

**Day 1 (Immediate - 2 hours)**
1. ✅ Verify Swagger Documentation (15 min)
2. ✅ Verify GitHub Secrets (15 min)
3. ✅ Database Migration Status Check (30 min)
4. ✅ Verify Infrastructure Components (1 hour)

**Days 2-3 (High Priority - 6 hours)**
5. 🔧 Fix CLI Test Failures (2-4 hours)
6. 🔐 Verify OAuth Callbacks (30 min)
7. 📊 Configure Application Insights (1 hour)

**Week 2 (Medium Priority - 6 hours)**
8. 🏗️ Set Up Production Environment (4-6 hours)

### Total Estimated Effort

- **Immediate Tasks:** 2 hours
- **High Priority:** 6 hours
- **Medium Priority:** 6 hours
- **Total:** 14 hours (approximately 2 working days)

### Success Metrics

After completing all tasks:
- ✅ 100% test pass rate (including CLI)
- ✅ 100% infrastructure component verification
- ✅ Full production monitoring enabled
- ✅ Separate production environment ready
- ✅ All verification items in TODO.md checked off

### Risk Assessment

**Low Risk Tasks:**
- Swagger verification
- GitHub secrets verification
- Application Insights configuration

**Medium Risk Tasks:**
- OAuth callback testing (requires credentials)
- Database migration check (requires database access)
- Infrastructure verification (may reveal missing components)

**High Risk Tasks:**
- CLI test fixes (may uncover additional issues)
- Production environment setup (complex infrastructure changes)

### Dependencies & Blockers

**External Dependencies:**
- Azure admin credentials
- GitHub repository access
- OAuth provider credentials
- Database passwords

**Technical Blockers:**
- None currently identified
- All tasks can be completed independently

### Next Steps

1. Review and approve this action plan
2. Prioritize tasks based on business needs
3. Assign tasks to team members
4. Set completion deadlines
5. Track progress in TODO.md
6. Update DEPLOYMENT_VALIDATION_REPORT.md upon completion

---

**Document Version:** 1.0  
**Last Updated:** March 2, 2026  
**Status:** Ready for Implementation  
**Contact:** Development Team
