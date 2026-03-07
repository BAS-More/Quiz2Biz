# Quiz2Biz Platform - Comprehensive Remediation Plan
**Created:** February 25, 2026  
**Based on:** Deep Audit Report (91% HEALTHY)  
**Target:** Achieve 100% across all metrics  
**Status:** DETAILED ACTION PLAN

---

## Investigation Results Summary

### Root Cause Analysis Completed ✅

**1. DEV API Container App "Failed" State**
- **FINDING:** Misleading status - container is ACTUALLY RUNNING & HEALTHY
- **Root Cause:** Provisioning state shows "Failed" but runningStatus is "Running"
- **Evidence:** 
  - Revision is "Healthy" with 100% traffic
  - Logs show successful Redis connections every 10 minutes
  - HTTP requests being served (302 redirects logged)
  - Latest image: `acrquestionnairedev.azurecr.io/questionnaire-api:20260210114429`
- **Impact:** NONE - false positive, cosmetic issue only
- **Action Required:** UPDATE provisioning state OR redeploy to clear status

**2. PostgreSQL Version Mismatch**
- **FINDING:** Dev=15, Prod=16 (documented migration path exists)
- **Root Cause:** Intentional phased rollout - prod upgraded, dev pending
- **Impact:** LOW - both versions compatible with Prisma and application code
- **Action Required:** Upgrade dev to PostgreSQL 16 per migration guide

**3. Development Dependency Vulnerabilities**
- **FINDING:** 10 MODERATE severity vulnerabilities
- **Root Cause:** Transitive dependencies in @angular-devkit and lodash
- **Affected Packages:**
  - ajv (ReDoS vulnerability GHSA-2g4f-4pwh-qvx6)
  - lodash (Prototype Pollution GHSA-xxjr-mmjv-4gpg)
  - @angular-devkit/* (via ajv)
  - @nestjs/schematics (via @angular-devkit)
  - @nestjs/swagger (via lodash)
- **Impact:** NONE in production (devDependencies only)
- **Action Required:** Upgrade affected packages

**4. GitHub Remote Configuration**
- **FINDING:** Remote IS configured correctly
- **Current Remote:** https://github.com/BAS-More/Quiz-to-build.git
- **Impact:** NONE - false alarm from audit
- **Action Required:** Update audit report only

**5. Azure Key Vault Missing**
- **FINDING:** Terraform module exists but not provisioned
- **Root Cause:** Using Container App secrets instead of Key Vault
- **Current Approach:** Secrets stored as Container App secrets (adequate for current scale)
- **Impact:** MEDIUM - less centralized secret management
- **Action Required:** Deploy Key Vault module for enhanced secret management

---

## Paths to 100% Scores

### Current Scores Analysis

| Category | Current | Gap to 100% | Achievability |
|----------|---------|-------------|---------------|
| Code Quality | 85% | 15% | ⚠️ Challenging |
| Security | 92% | 8% | ✅ Achievable |
| Documentation | 90% | 10% | ✅ Achievable |
| Testing | 88% | 12% | ✅ Achievable |
| DORA Metrics | 85% | 15% | ⚠️ Requires process changes |
| Infrastructure | 88% | 12% | ✅ Achievable |

### Detailed Path to 100%

**Code Quality (85% → 100%): +15%**
- **Current Gaps:**
  - No SonarQube for automated MI tracking (-5%)
  - No automated complexity monitoring (-5%)
  - Coverage thresholds below industry standard (-5%)
- **Path to 100%:**
  1. Deploy SonarQube or integrate SonarCloud
  2. Configure ESLint complexity rules with enforcement
  3. Increase coverage thresholds: 35% → 80%
- **Timeline:** 2-3 weeks
- **Feasibility:** ⚠️ Requires tooling investment + refactoring

**Security (92% → 100%): +8%**
- **Current Gaps:**
  - 10 moderate devDependency vulnerabilities (-5%)
  - No Key Vault for centralized secrets (-3%)
- **Path to 100%:**
  1. Upgrade devDependencies (immediate)
  2. Deploy Azure Key Vault (1 week)
  3. Migrate secrets from Container App to Key Vault
- **Timeline:** 1 week
- **Feasibility:** ✅ Straightforward

**Documentation (90% → 100%): +10%**
- **Current Gaps:**
  - Some ADRs missing implementation status (-3%)
  - No automated API doc generation enforcement (-4%)
  - Missing architecture diagrams in some docs (-3%)
- **Path to 100%:**
  1. Update all ADRs with current implementation status
  2. Add CI check for Swagger doc completeness
  3. Generate C4 model diagrams for architecture
- **Timeline:** 1 week
- **Feasibility:** ✅ Straightforward

**Testing (88% → 100%): +12%**
- **Current Gaps:**
  - API test failures (test infrastructure issues) (-7%)
  - Coverage threshold too low (35% vs 80% target) (-5%)
- **Path to 100%:**
  1. Fix 58 failing API tests (mock infrastructure)
  2. Increase coverage thresholds progressively: 35% → 50% → 65% → 80%
  3. Add missing test cases to reach 80% coverage
- **Timeline:** 2-3 weeks
- **Feasibility:** ✅ Achievable with effort

**DORA Metrics (85% → 100%): +15%**
- **Current Gaps:**
  - No automated DORA tracking (-5%)
  - PR size not enforced (-5%)
  - Lead time not measured (-5%)
- **Path to 100%:**
  1. Implement DORA metrics dashboard (GitHub Actions + Azure Monitor)
  2. Add PR size enforcement (GitHub Actions)
  3. Track deployment frequency, lead time, MTTR automatically
- **Timeline:** 2 weeks
- **Feasibility:** ⚠️ Requires process + tooling changes

**Infrastructure (88% → 100%): +12%**
- **Current Gaps:**
  - DEV API provisioning state "Failed" (cosmetic) (-4%)
  - PostgreSQL version mismatch (-4%)
  - No Key Vault (-4%)
- **Path to 100%:**
  1. Clear DEV API provisioning state (redeploy)
  2. Upgrade dev PostgreSQL to version 16
  3. Deploy Azure Key Vault module
- **Timeline:** 3-5 days
- **Feasibility:** ✅ Straightforward

---

## Remediation Plan - Prioritized Actions

### PHASE 1: Quick Wins (Week 1) - Fix High & Medium Priority Issues

**Priority 1A: Fix Infrastructure Issues (Days 1-2)**

**Task 1.1: Clear DEV API "Failed" Provisioning State**
- **Action:** Redeploy ca-questionnaire-api-dev to clear cosmetic "Failed" status
- **Method:** Update container app revision
- **Commands:**
  ```bash
  az containerapp update \
    --name ca-questionnaire-api-dev \
    --resource-group rg-questionnaire-dev \
    --image acrquestionnairedev.azurecr.io/questionnaire-api:latest
  ```
- **Validation:** `az containerapp show` → provisioningState should be "Succeeded"
- **Impact:** Infrastructure score 88% → 92%

**Task 1.2: Upgrade DEV PostgreSQL to Version 16**
- **Action:** Follow docs/postgresql-16-migration.md
- **Steps:**
  1. Take full database backup
  2. Update Terraform: `terraform.tfvars` → `postgresql_version = "16"`
  3. Apply Terraform changes for psql-questionnaire-dev
  4. OR use Azure Portal: Database → Overview → Upgrade
  5. Run `npx prisma migrate deploy` after upgrade
  6. Test application against upgraded database
- **Validation:** `az postgres flexible-server show` → version should be "16"
- **Impact:** Infrastructure score 92% → 96%
- **Rollback:** Restore from backup if issues occur

**Priority 1B: Upgrade Development Dependencies (Days 2-3)**

**Task 1.3: Fix devDependency Vulnerabilities**
- **Action:** Upgrade vulnerable packages
- **Commands:**
  ```bash
  # Upgrade @nestjs/schematics (fixes @angular-devkit chain)
  npm install --save-dev @nestjs/schematics@latest
  
  # Upgrade @nestjs/swagger (fixes lodash vulnerability)
  npm install --save @nestjs/swagger@latest
  
  # Verify fixes
  npm audit --omit=dev
  ```
- **Validation:** `npm audit --omit=dev` → 0 vulnerabilities
- **Impact:** Security score 92% → 97%

**Priority 1C: Deploy Azure Key Vault (Days 3-5)**

**Task 1.4: Provision Azure Key Vault**
- **Action:** Use existing Terraform module
- **Steps:**
  1. Verify Terraform module: `infrastructure/terraform/modules/keyvault/main.tf`
  2. Main Terraform already references Key Vault module (line 92-104)
  3. Apply Terraform for DEV environment:
     ```bash
     cd infrastructure/terraform
     terraform plan -var-file="terraform-dev.tfvars"
     terraform apply -var-file="terraform-dev.tfvars"
     ```
  4. Migrate secrets from Container App secrets to Key Vault
  5. Update Container App to reference Key Vault secrets
- **Validation:** `az keyvault list` → kv-questionnaire-dev should exist
- **Impact:** Security score 97% → 100%, Infrastructure score 96% → 100%

---

### PHASE 2: Code Quality & Testing Improvements (Weeks 2-3)

**Priority 2A: Fix API Test Infrastructure (Week 2)**

**Task 2.1: Resolve 58 Failing API Tests**
- **Root Cause:** Missing service mocks in test files (not production code bugs)
- **Action:** Fix test setup for all failing test files
- **Approach:**
  1. Run tests with verbose output: `cd apps/api && npm run test:cov -- --verbose`
  2. Identify missing mocks for each failing test
  3. Add proper service mocks to test files
  4. Common pattern:
     ```typescript
     const mockService = {
       findOne: jest.fn().mockResolvedValue(mockData),
       // ... other methods
     };
     
     beforeEach(async () => {
       const module: TestingModule = await Test.createTestingModule({
         providers: [
           ServiceUnderTest,
           { provide: DependencyService, useValue: mockService },
         ],
       }).compile();
     });
     ```
- **Validation:** All 395 tests passing (100%)
- **Impact:** Testing score 88% → 94%

**Task 2.2: Increase Test Coverage Thresholds**
- **Current:** 35% (branches/functions/lines/statements)
- **Industry Standard:** 80%
- **Action:** Progressive increase to avoid breaking builds
- **Steps:**
  1. Phase 1: 35% → 50% (add tests for uncovered critical paths)
  2. Phase 2: 50% → 65% (add tests for edge cases)
  3. Phase 3: 65% → 80% (comprehensive coverage)
- **Edit:** `apps/api/package.json` → coverageThreshold
  ```json
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
  ```
- **Validation:** `npm run test:cov` passes with 80% coverage
- **Impact:** Testing score 94% → 100%

**Priority 2B: Implement Code Quality Monitoring (Week 3)**

**Task 2.3: Deploy SonarQube or SonarCloud**
- **Action:** Integrate automated code quality analysis
- **Option 1: SonarCloud (Recommended - easier setup)**
  1. Sign up at https://sonarcloud.io (free for open source)
  2. Import GitHub repository
  3. Add `.github/workflows/sonarcloud.yml`:
     ```yaml
     name: SonarCloud Analysis
     on:
       push:
         branches: [main, develop]
       pull_request:
         branches: [main, develop]
     jobs:
       sonarcloud:
         runs-on: ubuntu-latest
         steps:
           - uses: actions/checkout@v4
             with:
               fetch-depth: 0
           - name: SonarCloud Scan
             uses: SonarSource/sonarcloud-github-action@master
             env:
               GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
               SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
     ```
  4. Add `sonar-project.properties`:
     ```properties
     sonar.organization=your-org
     sonar.projectKey=quiz2biz
     sonar.sources=apps,libs
     sonar.tests=apps,libs
     sonar.test.inclusions=**/*.spec.ts,**/*.test.ts
     sonar.javascript.lcov.reportPaths=coverage/lcov.info
     ```
- **Option 2: Self-hosted SonarQube**
  - Deploy SonarQube container in Azure
  - Configure scanner in CI/CD
- **Validation:** SonarQube dashboard shows MI > 80
- **Impact:** Code Quality score 85% → 95%

**Task 2.4: Configure ESLint Complexity Enforcement**
- **Action:** Add complexity rules to ESLint config
- **Edit:** `eslint.config.mjs`
  ```javascript
  export default [
    // ... existing config
    {
      rules: {
        'complexity': ['error', { max: 15 }],
        'max-depth': ['error', 4],
        'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
        'max-nested-callbacks': ['error', 3],
      }
    }
  ];
  ```
- **Validation:** `npm run lint` passes without complexity errors
- **Impact:** Code Quality score 95% → 100%

---

### PHASE 3: Documentation & DORA Metrics (Week 4)

**Priority 3A: Complete Documentation (Days 1-2)**

**Task 3.1: Update ADRs with Implementation Status**
- **Action:** Add "Status: Implemented/Superseded/Deprecated" to all ADRs
- **Location:** `docs/adr/`
- **Template:**
  ```markdown
  # ADR-XXX: Title
  
  **Status:** Implemented | Date: 2026-01-15 | Implemented in: v1.2.0
  
  ## Context
  ...
  ```
- **Validation:** All 8 ADRs have status field
- **Impact:** Documentation score 90% → 93%

**Task 3.2: Generate C4 Architecture Diagrams**
- **Action:** Create C4 model diagrams (Context, Container, Component)
- **Tool:** https://c4model.com/ + PlantUML or Structurizr
- **Diagrams Needed:**
  1. System Context: Quiz2Biz system and external actors
  2. Container: Web, API, Database, Redis, Azure services
  3. Component (API): Modules within NestJS application
- **Location:** `docs/architecture/c4-*.md` with embedded diagrams
- **Validation:** 3 C4 diagrams created and linked in architecture docs
- **Impact:** Documentation score 93% → 97%

**Task 3.3: Add CI Check for Swagger Completeness**
- **Action:** Ensure all API endpoints have Swagger documentation
- **Add to `.github/workflows/ci.yml`:**
  ```yaml
  - name: Check Swagger Documentation
    run: |
      npm run build -- --filter=api
      # Check that swagger.json exists and has all endpoints documented
      node scripts/validate-swagger-docs.js
  ```
- **Create:** `scripts/validate-swagger-docs.js`
  ```javascript
  // Check that all controllers have @ApiOperation decorators
  // Check that all DTOs have @ApiProperty decorators
  // Exit 1 if any missing
  ```
- **Validation:** CI fails if Swagger docs incomplete
- **Impact:** Documentation score 97% → 100%

**Priority 3B: Implement DORA Metrics Tracking (Days 3-5)**

**Task 3.4: Set Up DORA Metrics Dashboard**
- **Action:** Track Lead Time, Deployment Frequency, MTTR, Change Failure Rate
- **Approach:** Use GitHub Actions + Azure Application Insights
- **Steps:**
  1. Create `scripts/track-dora-metrics.js`:
     ```javascript
     // Calculate metrics from GitHub API and Azure
     // - Lead Time: Commit to deployment timestamp
     // - Deployment Frequency: Count of successful deployments
     // - MTTR: Time from failure detection to resolution
     // - Change Failure Rate: Failed deployments / Total deployments
     ```
  2. Add workflow `.github/workflows/dora-metrics.yml`:
     ```yaml
     name: DORA Metrics
     on:
       push:
         branches: [main]
       schedule:
         - cron: '0 0 * * *' # Daily at midnight
     jobs:
       metrics:
         runs-on: ubuntu-latest
         steps:
           - name: Calculate DORA Metrics
             run: node scripts/track-dora-metrics.js
           - name: Push to Azure Application Insights
             run: # Send metrics to Azure
     ```
  3. Create Application Insights dashboard for DORA metrics
- **Validation:** Dashboard shows live DORA metrics
- **Impact:** DORA Metrics score 85% → 93%

**Task 3.5: Enforce PR Size Limits**
- **Action:** Add GitHub Action to check PR size
- **Add to `.github/workflows/pr-size-check.yml`:**
  ```yaml
  name: PR Size Check
  on:
    pull_request:
      types: [opened, synchronize, reopened]
  jobs:
    check-size:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - name: Check PR Size
          run: |
            LINES=$(git diff --stat origin/main... | tail -1 | awk '{print $4+$6}')
            if [ "$LINES" -gt 300 ]; then
              echo "::error::PR too large ($LINES lines). Please split into smaller PRs (target: <200 lines)"
              exit 1
            fi
            if [ "$LINES" -gt 200 ]; then
              echo "::warning::PR size ($LINES lines) exceeds recommendation of 200 lines"
            fi
  ```
- **Validation:** Large PRs trigger warnings/errors
- **Impact:** DORA Metrics score 93% → 100%

---

## Realistic 100% Achievement Assessment

### Summary of Feasibility

| Category | Path to 100% | Effort | Timeline | Feasibility |
|----------|--------------|--------|----------|-------------|
| Security | Fix vulns + Key Vault | LOW | 1 week | ✅ **100% ACHIEVABLE** |
| Infrastructure | Fix DEV + PG upgrade + KV | LOW | 1 week | ✅ **100% ACHIEVABLE** |
| Documentation | ADRs + diagrams + CI checks | MEDIUM | 1 week | ✅ **100% ACHIEVABLE** |
| Testing | Fix tests + increase coverage | HIGH | 2-3 weeks | ✅ **100% ACHIEVABLE** |
| Code Quality | SonarQube + enforce thresholds | HIGH | 2-3 weeks | ⚠️ **95-98% REALISTIC** |
| DORA Metrics | Automated tracking + enforcement | MEDIUM | 2 weeks | ⚠️ **95-98% REALISTIC** |

### Realistic Target Scores (4-Week Sprint)

| Category | Current | Realistic Target | Stretch Goal |
|----------|---------|------------------|--------------|
| Security | 92% | **100%** ✅ | 100% |
| Infrastructure | 88% | **100%** ✅ | 100% |
| Documentation | 90% | **100%** ✅ | 100% |
| Testing | 88% | **95-98%** | 100% |
| Code Quality | 85% | **95-98%** | 100% |
| DORA Metrics | 85% | **95-98%** | 100% |

**Overall Target:** **97-99%** (up from 91%)

### Why True 100% is Challenging

**Code Quality (85% → 100%):**
- Requires refactoring legacy code to meet strict complexity limits
- SonarQube may reveal additional technical debt
- Maintainability Index depends on subjective code structure

**DORA Metrics (85% → 100%):**
- Requires organizational process changes (not just technical)
- PR size enforcement may conflict with feature delivery timelines
- True ELITE DORA performance requires sustained cultural change

**Testing (88% → 100%):**
- 80% coverage threshold is achievable but requires significant test writing
- Some legacy code may be difficult to test (requires refactoring)
- Edge case coverage increases asymptotically (diminishing returns)

---

## Final Recommendations

### Recommended 4-Week Sprint Plan

**Week 1: Quick Wins (Infrastructure + Security)**
- ✅ Clear DEV API provisioning state
- ✅ Upgrade dev PostgreSQL to 16
- ✅ Fix devDependency vulnerabilities
- ✅ Deploy Azure Key Vault
- **Expected Outcome:** Security 100%, Infrastructure 100%

**Week 2: Testing Improvements**
- ✅ Fix 58 failing API tests
- ✅ Increase coverage threshold to 50%
- ✅ Add missing test cases
- **Expected Outcome:** Testing 95%+

**Week 3: Code Quality & Documentation**
- ✅ Deploy SonarCloud
- ✅ Configure ESLint complexity enforcement
- ✅ Update ADRs with status
- ✅ Generate C4 diagrams
- **Expected Outcome:** Code Quality 95-98%, Documentation 100%

**Week 4: DORA Metrics**
- ✅ Implement DORA tracking
- ✅ Add PR size enforcement
- ✅ Create metrics dashboard
- **Expected Outcome:** DORA Metrics 95-98%

### Final Achievable Score: **97-99%** (up from 91%)

---

**Plan Created:** February 25, 2026  
**Ready for Execution:** ✅ YES  
**Next Step:** Add all tasks to TODO list and activate sprint mode
