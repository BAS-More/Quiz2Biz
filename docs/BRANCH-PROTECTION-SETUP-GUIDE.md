# Branch Protection Rules - Setup Guide

**Generated:** February 27, 2026  
**Purpose:** Configure GitHub branch protection rules for `main` and `develop` branches  
**Status:** READY FOR IMMEDIATE IMPLEMENTATION

---

## Quick Start (GitHub Web UI - Recommended)

### Step 1: Access Branch Protection Settings

1. Navigate to: `https://github.com/Avi-Bendetsky/Quiz-to-build/settings/branches`
2. Click **"Add branch protection rule"**

---

## Configuration for `main` Branch

### Branch Name Pattern
```
main
```

### Required Settings

#### ✅ Require a pull request before merging
- **Required approvals:** 1
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require review from Code Owners (if CODEOWNERS file exists)

#### ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging

**Required Status Checks (select these):**
- `lint-and-format` (from ci.yml)
- `test-api` (from ci.yml)
- `test-web` (from ci.yml)
- `test-regression` (from ci.yml)
- `test-e2e` (from ci.yml)
- `build` (from ci.yml)
- `docker-build-test` (from ci.yml)
- `all-checks-passed` (from ci.yml)
- `coverage-check` (from coverage-gate.yml) **← NEW**
- `dependency-scan` (from security-scan.yml) **← NEW**
- `container-scan` (from security-scan.yml) **← NEW**
- `code-scanning` (from security-scan.yml) **← NEW**
- `secrets-scan` (from security-scan.yml) **← NEW**

#### ✅ Require conversation resolution before merging
- All PR review comments must be resolved

#### ✅ Require signed commits (Optional but Recommended)
- Enforce commit signature verification

#### ✅ Require linear history
- Prevent merge commits, enforce rebase/squash

#### ✅ Include administrators
- Apply rules to repository administrators

#### ✅ Restrict who can push to matching branches
- Add specific teams/users who can bypass (if needed)
- Leave empty to allow no direct pushes

#### ✅ Allow force pushes: **DISABLED**
#### ✅ Allow deletions: **DISABLED**

---

## Configuration for `develop` Branch

### Branch Name Pattern
```
develop
```

### Required Settings

#### ✅ Require a pull request before merging
- **Required approvals:** 1
- ✅ Dismiss stale pull request approvals when new commits are pushed

#### ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging

**Required Status Checks (select these):**
- `lint-and-format` (from ci.yml)
- `test-api` (from ci.yml)
- `test-web` (from ci.yml)
- `test-regression` (from ci.yml)
- `build` (from ci.yml)
- `all-checks-passed` (from ci.yml)
- `coverage-check` (from coverage-gate.yml) **← NEW**
- `dependency-scan` (from security-scan.yml) **← NEW**
- `container-scan` (from security-scan.yml) **← NEW**
- `code-scanning` (from security-scan.yml) **← NEW**
- `secrets-scan` (from security-scan.yml) **← NEW**

**Note:** `develop` branch can have slightly relaxed rules (fewer required checks) for faster iteration

#### ✅ Include administrators
- Apply rules to repository administrators

#### ✅ Allow force pushes: **DISABLED**
#### ✅ Allow deletions: **DISABLED**

---

## Step 2: Enable New Workflows

### 2.1 Validate security-scan.yml

**Manual trigger test:**

```powershell
# Navigate to Actions tab in GitHub
# https://github.com/Avi-Bendetsky/Quiz-to-build/actions/workflows/security-scan.yml

# Click "Run workflow" button
# Select branch: develop
# Click "Run workflow"
```

**Expected Results:**
- ✅ `dependency-scan` job completes successfully
- ✅ `container-scan` job completes successfully
- ✅ `code-scanning` job completes successfully
- ✅ `secrets-scan` job completes successfully
- ✅ `security-summary` job shows all checks passed

**Monitor logs:**
1. Click on the running workflow
2. Expand each job to view logs
3. Verify no CRITICAL or HIGH vulnerabilities in production dependencies
4. Check Security tab for CodeQL and Trivy results

---

### 2.2 Validate coverage-gate.yml

**Trigger via Pull Request:**

```powershell
# Create test branch
cd c:\Repos\Quiz-to-Build
git checkout -b test/coverage-gate-validation
git push -u origin test/coverage-gate-validation

# Create PR from GitHub UI:
# https://github.com/Avi-Bendetsky/Quiz-to-build/compare/develop...test/coverage-gate-validation
```

**Expected Results:**
- ✅ `coverage-check` job triggers automatically
- ✅ Tests run with coverage collection
- ✅ Coverage thresholds validated (95% for all metrics)
- ✅ PR comment posted with coverage table
- ✅ GitHub check passes if coverage meets thresholds

**Verify PR Comment:**
The workflow will automatically post a comment like:

```markdown
## 📊 Code Coverage Report

| Metric | Coverage | Threshold | Status |
|--------|----------|-----------|--------|
| Branches | 95.87% | 95% | ✅ |
| Lines | 96.12% | 95% | ✅ |
| Functions | 95.45% | 95% | ✅ |
| Statements | 96.08% | 95% | ✅ |

✅ All coverage thresholds met!
```

---

## Step 3: Monitor Workflow Logs

### Security Scan Monitoring

**Check Workflow Status:**
```
https://github.com/Avi-Bendetsky/Quiz-to-build/actions/workflows/security-scan.yml
```

**Key Metrics to Monitor:**
- Production dependency vulnerabilities: 0 CRITICAL/HIGH (must pass)
- Container image vulnerabilities: 0 CRITICAL/HIGH (must pass)
- CodeQL findings: Review in Security tab
- Secrets detection: 0 verified secrets (must pass)

**View Security Results:**
```
https://github.com/Avi-Bendetsky/Quiz-to-build/security
```

---

### Coverage Gate Monitoring

**Check Workflow Status:**
```
https://github.com/Avi-Bendetsky/Quiz-to-build/actions/workflows/coverage-gate.yml
```

**Key Metrics to Monitor:**
- Branches coverage: ≥95%
- Lines coverage: ≥95%
- Functions coverage: ≥95%
- Statements coverage: ≥95%

**Review Coverage Trends:**
- Download coverage reports from workflow artifacts
- View trends in Codecov dashboard (if configured)

---

## Step 4: Validation Checklist

### Branch Protection Validation

- [ ] Navigate to Settings → Branches
- [ ] Verify `main` branch protection rule exists
- [ ] Verify `develop` branch protection rule exists
- [ ] Confirm all 13 required status checks enabled for `main`
- [ ] Confirm all 11 required status checks enabled for `develop`
- [ ] Verify "Require pull request before merging" enabled
- [ ] Verify "Require status checks to pass" enabled
- [ ] Verify "Require conversation resolution" enabled
- [ ] Verify force push is DISABLED
- [ ] Verify branch deletion is DISABLED

### Workflow Validation

- [ ] `security-scan.yml` triggered manually and passed
- [ ] `dependency-scan` job completed successfully
- [ ] `container-scan` job completed successfully
- [ ] `code-scanning` job completed successfully
- [ ] `secrets-scan` job completed successfully
- [ ] Test PR created to trigger `coverage-gate.yml`
- [ ] `coverage-check` job completed successfully
- [ ] PR received automated coverage comment
- [ ] All coverage thresholds met (≥95%)

---

## Troubleshooting

### Status Checks Not Appearing

**Issue:** Required status checks don't appear in dropdown

**Solution:**
1. Workflows must run at least once on the branch
2. Create a test PR to trigger workflows
3. After workflows complete, status checks will appear in dropdown
4. Return to branch protection settings and select them

---

### Security Scan Failing

**Issue:** `dependency-scan` or `container-scan` failing

**Solution:**
1. Review workflow logs: `Actions → Security Scanning → [failed run]`
2. Check for CRITICAL/HIGH vulnerabilities in production dependencies
3. If found, run: `npm audit fix` or update vulnerable packages
4. Container scan failures: Update base image in Dockerfile
5. Re-run workflow after fixes

---

### Coverage Gate Failing

**Issue:** `coverage-check` failing with coverage below 95%

**Solution:**
1. Review coverage report artifact from workflow
2. Identify uncovered lines/branches
3. Add missing unit tests
4. Run locally: `npm run test -- --filter=api --coverage`
5. Verify coverage locally before pushing

---

## Quick Reference: Status Check Names

Copy these exact names when configuring branch protection:

### From ci.yml (Existing)
```
lint-and-format
test-api
test-web
test-regression
test-e2e
build
docker-build-test
all-checks-passed
```

### From coverage-gate.yml (New)
```
coverage-check
```

### From security-scan.yml (New)
```
dependency-scan
container-scan
code-scanning
secrets-scan
```

---

## Post-Implementation Verification

### Test Protected Branch Rules

**Attempt Direct Push to `main` (should fail):**
```powershell
git checkout main
git commit --allow-empty -m "test: verify branch protection"
git push origin main
# Expected: remote: error: GH006: Protected branch update failed
```

**Attempt PR without Required Checks (should block):**
1. Create PR with failing tests
2. Verify PR cannot be merged until checks pass
3. Verify "Merge" button is disabled with message about required checks

**Attempt PR with Passing Checks (should succeed):**
1. Create PR with all tests passing
2. Request review from team member
3. After approval and all checks green, merge should be allowed

---

## Success Criteria

✅ Branch protection configured for `main` and `develop`  
✅ All 13 status checks required for `main` branch  
✅ All 11 status checks required for `develop` branch  
✅ `security-scan.yml` executed successfully with all scans passing  
✅ `coverage-gate.yml` executed successfully with 95%+ coverage  
✅ Direct pushes to protected branches blocked  
✅ PRs require approval and passing checks before merge  
✅ Security findings visible in GitHub Security tab  
✅ Coverage reports generated and uploaded  

---

## Next Steps (After Setup Complete)

1. **Monitor Daily Security Scans** - Review automated scans running at 2 AM UTC
2. **Educate Team** - Share this guide with all developers
3. **Establish Review Process** - Define code review responsibilities
4. **Configure Notifications** - Set up alerts for security findings
5. **Periodic Review** - Review branch protection rules quarterly

---

**READY FOR IMMEDIATE IMPLEMENTATION** 🚀
