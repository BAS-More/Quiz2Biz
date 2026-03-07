# GitHub Actions Workflow Validation & Monitoring Guide

**Generated:** February 27, 2026  
**Purpose:** Validate and monitor new GitHub Actions workflows  
**Status:** READY FOR EXECUTION

---

## Overview

This guide covers validation and monitoring procedures for the newly added GitHub Actions workflows:
- `security-scan.yml` - Comprehensive security scanning (SAST/DAST/container/secrets)
- `coverage-gate.yml` - Code coverage enforcement (95% threshold)

---

## Phase 1: Workflow Syntax Validation ✅

### Automated Validation (Local)

**Using GitHub CLI:**
```powershell
cd c:\Repos\Quiz-to-Build

# Validate security-scan.yml
gh workflow view security-scan.yml 2>&1

# Validate coverage-gate.yml
gh workflow view coverage-gate.yml 2>&1
```

**Using actionlint (recommended):**
```powershell
# Install actionlint
winget install rhysd.actionlint

# Validate all workflows
actionlint .github/workflows/*.yml
```

**Expected Output:**
```
✅ No errors found
```

### Manual Validation (GitHub Web UI)

1. Navigate to: https://github.com/BAS-More/Quiz-to-build/actions
2. Click "New workflow" dropdown
3. Verify new workflows appear in list:
   - ✅ Security Scanning
   - ✅ Code Coverage Gate

**Status:** ✅ VALIDATED (workflows syntax correct)

---

## Phase 2: Manual Workflow Trigger & Validation

### Trigger security-scan.yml Manually

**Method 1: GitHub Web UI (Easiest)**

1. Navigate to: https://github.com/BAS-More/Quiz-to-build/actions
2. Click "Security Scanning" workflow
3. Click "Run workflow" button (top right)
4. Select branch: `main` or `develop`
5. Click green "Run workflow" button
6. Monitor execution in real-time

**Method 2: GitHub CLI**
```powershell
gh workflow run security-scan.yml --ref main
```

**Expected Behavior:**
- ✅ Workflow starts within 10 seconds
- ✅ 4 jobs execute in parallel:
  1. Dependency Vulnerability Scan
  2. Container Image Security Scan
  3. CodeQL Code Scanning
  4. Secrets Detection
- ✅ Security Scan Summary job runs after all complete
- ✅ Total execution time: 8-12 minutes

**Success Criteria:**
- ✅ All jobs complete with status "Success" (green checkmark)
- ✅ No CRITICAL or HIGH vulnerabilities in production dependencies
- ✅ Container scan completes (may have findings - review acceptable)
- ✅ CodeQL scan completes (upload to Security tab)
- ✅ No secrets detected

**What to Monitor:**
1. **Dependency Scan Job:**
   - Production dependencies: 0 CRITICAL/HIGH ✅
   - Dev dependencies: May have MODERATE/LOW ⚠️ (expected, non-blocking)

2. **Container Scan Job:**
   - Container builds successfully ✅
   - Trivy scan completes ✅
   - SARIF uploaded to GitHub Security ✅

3. **CodeQL Scan Job:**
   - JavaScript analysis completes ✅
   - Results uploaded to GitHub Security tab ✅

4. **Secrets Scan Job:**
   - TruffleHog completes ✅
   - No verified secrets found ✅

### Trigger coverage-gate.yml via Pull Request

**Step 1: Create Test Branch**
```powershell
cd c:\Repos\Quiz-to-Build
git checkout -b test/coverage-gate-validation
```

**Step 2: Make Trivial Change (to trigger CI)**
```powershell
# Add comment to trigger workflow
echo "# Coverage gate test - $(Get-Date)" >> README.md
git add README.md
git commit -m "test: validate coverage-gate workflow"
git push origin test/coverage-gate-validation
```

**Step 3: Create Pull Request**

**Using GitHub CLI:**
```powershell
gh pr create `
    --base main `
    --head test/coverage-gate-validation `
    --title "Test: Coverage Gate Workflow Validation" `
    --body "Testing new coverage-gate.yml workflow to ensure 95% threshold enforcement works correctly."
```

**Using GitHub Web UI:**
1. Navigate to: https://github.com/BAS-More/Quiz-to-build/pulls
2. Click "New pull request"
3. Base: `main`, Compare: `test/coverage-gate-validation`
4. Click "Create pull request"
5. Add title: "Test: Coverage Gate Workflow Validation"
6. Click "Create pull request"

**Expected Behavior:**
- ✅ Workflow triggers automatically (within 10 seconds)
- ✅ Job "Code Coverage Validation" starts
- ✅ Tests run with coverage enabled
- ✅ Coverage parsed and validated against 95% threshold
- ✅ PR comment posted with coverage report
- ✅ Total execution time: 5-8 minutes

**Success Criteria:**
- ✅ All coverage metrics ≥ 95%:
  - Branches: 95.87%+ ✅
  - Lines: 98.27%+ ✅
  - Functions: 98.14%+ ✅
  - Statements: 98.33%+ ✅
- ✅ PR shows green checkmark for "Code Coverage Validation"
- ✅ PR comment includes coverage table
- ✅ Coverage report uploaded to Codecov (if configured)

**What to Monitor:**
1. **PR Status Checks:**
   - "Code Coverage Validation" appears in checks list ✅
   - Status shows "In progress" → "Success" ✅

2. **PR Comment:**
   - Automated comment posted by GitHub Actions ✅
   - Coverage table shows all metrics ≥ 95% ✅
   - Green checkmarks (✅) for all passing metrics ✅

3. **Job Logs:**
   - Navigate to Actions tab → "Code Coverage Gate" workflow
   - Click on workflow run
   - Review "Parse coverage summary" step output
   - Verify threshold checks pass

**Step 4: Clean Up Test PR**
```powershell
# Close PR without merging
gh pr close <PR_NUMBER> --delete-branch

# Or manually via GitHub UI:
# 1. Navigate to PR
# 2. Click "Close pull request"
# 3. Click "Delete branch" button
```

---

## Phase 3: Monitoring Workflow Execution

### Real-Time Monitoring (During Execution)

**GitHub Web UI:**
1. Navigate to: https://github.com/BAS-More/Quiz-to-build/actions
2. Click on running workflow
3. Watch live log output (auto-refreshes)
4. Click individual jobs to see detailed logs

**GitHub CLI (terminal-based):**
```powershell
# List recent workflow runs
gh run list --limit 10

# Watch specific run (replace <RUN_ID>)
gh run watch <RUN_ID>

# View run logs
gh run view <RUN_ID> --log
```

### Post-Execution Analysis

**Check Workflow Status:**
```powershell
# View completed runs for security-scan
gh run list --workflow=security-scan.yml --limit 5

# View completed runs for coverage-gate
gh run list --workflow=coverage-gate.yml --limit 5
```

**Review Artifacts:**

Security scan artifacts:
- `npm-audit-reports` - Dependency vulnerability reports (JSON)
- `container-scan-results` - Trivy container scan results (SARIF + JSON)

Coverage gate artifacts:
- `coverage-report` - Full coverage report (HTML + JSON)

**Download artifacts:**
```powershell
# List artifacts for a run
gh run view <RUN_ID> --log-failed

# Download specific artifact
gh run download <RUN_ID> -n npm-audit-reports
gh run download <RUN_ID> -n coverage-report
```

**Review GitHub Security Tab:**
1. Navigate to: https://github.com/BAS-More/Quiz-to-build/security
2. Click "Code scanning" → View CodeQL alerts
3. Click "Secret scanning" → Review any findings (should be 0)
4. Review Dependabot alerts (if any)

---

## Phase 4: Continuous Monitoring

### Daily Automated Execution

**security-scan.yml runs daily at 2 AM UTC:**
- Scheduled via cron: `0 2 * * *`
- Automatic execution (no manual trigger needed)
- Review results next morning

**Monitoring Daily Scans:**
```powershell
# Check last 7 days of security scans
gh run list --workflow=security-scan.yml --created ">=$(((Get-Date).AddDays(-7)).ToString('yyyy-MM-dd'))"
```

**Set up email notifications:**
1. GitHub Profile → Settings → Notifications
2. Enable "Actions" notifications
3. Choose notification frequency: "Only failures" recommended

### PR-Triggered Execution

**coverage-gate.yml runs on every PR to main/develop:**
- Automatic trigger (no manual action)
- Blocks merge if coverage < 95%
- Posts PR comment with results

**Monitoring PR Checks:**
- Review PR status checks before merge
- Ensure "Code Coverage Validation" shows green checkmark
- Review coverage comment for any regressions

**Team Communication:**
- Notify developers of new coverage requirement
- Share this guide for troubleshooting
- Establish process for coverage regression handling

---

## Phase 5: Troubleshooting Common Issues

### Issue 1: security-scan.yml fails with "Container scan failed"

**Symptom:**
```
Error: Container build failed
Docker build context error
```

**Diagnosis:**
- Docker build may have issues on first run
- Missing dependencies or configuration

**Solution:**
```powershell
# Test Docker build locally
cd c:\Repos\Quiz-to-Build
docker build -f docker/api/Dockerfile -t quiz-api:test --target production .

# If successful locally, re-trigger workflow
gh workflow run security-scan.yml --ref main
```

### Issue 2: coverage-gate.yml fails with "Coverage report not found"

**Symptom:**
```
Error: Coverage report not found
File: apps/api/coverage/coverage-summary.json
```

**Diagnosis:**
- Tests may have failed before coverage generation
- Coverage directory not created

**Solution:**
```powershell
# Run tests locally with coverage
cd c:\Repos\Quiz-to-Build
npm run test -- --filter=api --coverage

# Check coverage report exists
Test-Path apps\api\coverage\coverage-summary.json

# If successful locally, check workflow logs for test failures
```

### Issue 3: CodeQL scan timeout

**Symptom:**
```
Error: CodeQL analysis timed out after 120 minutes
```

**Diagnosis:**
- Large codebase may require more time
- Build process taking too long

**Solution:**
- This is expected for first run (builds database)
- Subsequent runs will be faster (uses cache)
- Monitor next execution - should complete in 15-20 minutes

### Issue 4: Branch protection blocks PR merge

**Symptom:**
```
Required status check "Code Coverage Validation" is failing
PR cannot be merged
```

**Diagnosis:**
- Coverage dropped below 95% threshold
- New code not adequately tested

**Solution:**
```powershell
# Check which metrics failed
# Review PR comment for coverage breakdown

# Add more tests to increase coverage
# Re-push to trigger coverage re-check

git add .
git commit -m "test: add coverage for new code"
git push
```

---

## Phase 6: Success Metrics & KPIs

### Workflow Health Indicators

**Security Scan Workflow:**
- ✅ Success rate: >95% (allows occasional false positives)
- ✅ Execution time: 8-12 minutes average
- ✅ Zero production vulnerabilities detected
- ✅ SARIF uploads successful (100%)

**Coverage Gate Workflow:**
- ✅ Success rate: >98% (high bar for quality)
- ✅ Execution time: 5-8 minutes average
- ✅ Coverage maintained ≥95% all metrics
- ✅ PR comments posted: 100%

### Team Adoption Metrics

**First Week:**
- ✅ All developers aware of new workflows
- ✅ At least 1 PR per developer triggering coverage-gate
- ✅ Zero workflow bypasses (enforce branch protection)

**First Month:**
- ✅ Security scan runs daily without failures
- ✅ Coverage maintained ≥95% for 30 consecutive days
- ✅ Zero security vulnerabilities reach main branch
- ✅ Team feedback collected and incorporated

---

## Quick Reference Commands

**Trigger Security Scan:**
```powershell
gh workflow run security-scan.yml --ref main
```

**Check Recent Workflow Runs:**
```powershell
gh run list --limit 10
```

**Watch Live Workflow:**
```powershell
gh run watch <RUN_ID>
```

**Download Artifacts:**
```powershell
gh run download <RUN_ID> -n coverage-report
```

**View Workflow Logs:**
```powershell
gh run view <RUN_ID> --log
```

**Create Test PR:**
```powershell
git checkout -b test/workflow-validation
echo "test" >> README.md
git add README.md
git commit -m "test: workflow validation"
git push origin test/workflow-validation
gh pr create --base main --head test/workflow-validation --title "Test PR"
```

---

## Expected Timeline

**Hour 1 (Immediate):**
- ✅ Read this guide
- ✅ Trigger security-scan.yml manually
- ✅ Monitor first execution (8-12 minutes)
- ✅ Review results and artifacts

**Hour 2-3 (Same Day):**
- ✅ Create test branch
- ✅ Create test PR to trigger coverage-gate.yml
- ✅ Monitor PR execution (5-8 minutes)
- ✅ Review coverage comment and status checks
- ✅ Close test PR

**Day 2 (Next Day):**
- ✅ Review daily security scan results (from 2 AM run)
- ✅ Apply branch protection rules (if not done)
- ✅ Notify team of new workflows

**Week 1:**
- ✅ Monitor all PR coverage checks
- ✅ Track workflow success rates
- ✅ Gather team feedback
- ✅ Adjust if needed

---

## Next Actions

**Immediate (Today):**
1. ✅ Manually trigger `security-scan.yml` via GitHub Actions UI
2. ✅ Monitor execution and review results
3. ✅ Create test PR to trigger `coverage-gate.yml`
4. ✅ Verify coverage gate works correctly

**Tomorrow:**
1. ✅ Review automated security scan results (2 AM run)
2. ✅ Apply branch protection rules (if not done)
3. ✅ Communicate new workflows to team

**Ongoing:**
1. ✅ Monitor daily security scans
2. ✅ Review coverage on every PR
3. ✅ Track workflow health metrics
4. ✅ Iterate based on team feedback

---

**Document Version:** 1.0  
**Last Updated:** February 27, 2026  
**Status:** READY FOR EXECUTION
