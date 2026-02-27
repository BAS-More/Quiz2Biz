# Branch Protection & Workflow Enablement - Quick Checklist

**Target Completion:** Next 24 Hours  
**Status:** Ready for Execution  
**Owner:** Development Team

---

## Task 1: Configure Branch Protection Rules ⏱️ 30 minutes

### Main Branch Protection

**Navigate to:** [`Settings → Branches → Add Rule`](https://github.com/Avi-Bendetsky/Quiz-to-build/settings/branches)

- [ ] Branch name pattern: `main`
- [ ] ✅ Require pull request before merging (1 approval)
- [ ] ✅ Require status checks to pass before merging
- [ ] ✅ Require branches to be up to date

**Select ALL 13 Required Status Checks:**
- [ ] `lint-and-format`
- [ ] `test-api`
- [ ] `test-web`
- [ ] `test-regression`
- [ ] `test-e2e`
- [ ] `build`
- [ ] `docker-build-test`
- [ ] `all-checks-passed`
- [ ] `coverage-check` **← NEW**
- [ ] `dependency-scan` **← NEW**
- [ ] `container-scan` **← NEW**
- [ ] `code-scanning` **← NEW**
- [ ] `secrets-scan` **← NEW**

- [ ] ✅ Require conversation resolution before merging
- [ ] ✅ Include administrators
- [ ] ✅ Restrict force pushes (DISABLED)
- [ ] ✅ Restrict deletions (DISABLED)
- [ ] Click **"Create"** to save

### Develop Branch Protection

**Navigate to:** [`Settings → Branches → Add Rule`](https://github.com/Avi-Bendetsky/Quiz-to-build/settings/branches)

- [ ] Branch name pattern: `develop`
- [ ] ✅ Require pull request before merging (1 approval)
- [ ] ✅ Require status checks to pass before merging
- [ ] ✅ Require branches to be up to date

**Select ALL 11 Required Status Checks:**
- [ ] `lint-and-format`
- [ ] `test-api`
- [ ] `test-web`
- [ ] `test-regression`
- [ ] `build`
- [ ] `all-checks-passed`
- [ ] `coverage-check` **← NEW**
- [ ] `dependency-scan` **← NEW**
- [ ] `container-scan` **← NEW**
- [ ] `code-scanning` **← NEW**
- [ ] `secrets-scan` **← NEW**

- [ ] ✅ Include administrators
- [ ] ✅ Restrict force pushes (DISABLED)
- [ ] ✅ Restrict deletions (DISABLED)
- [ ] Click **"Create"** to save

---

## Task 2: Enable and Validate New Workflows ⏱️ 45 minutes

### Step 1: Automated Validation (Recommended)

**Run validation script:**
```powershell
cd c:\Repos\Quiz-to-Build
.\scripts\validate-workflows.ps1
```

- [ ] Script executed successfully
- [ ] GitHub CLI authentication confirmed
- [ ] All workflow files validated

### Step 2: Manually Trigger Security Scan

**Option A: Using PowerShell Script**
```powershell
.\scripts\validate-workflows.ps1 -TriggerSecurityScan
```

**Option B: Using GitHub Actions UI**
1. [ ] Navigate to: [`Actions → Security Scanning`](https://github.com/Avi-Bendetsky/Quiz-to-build/actions/workflows/security-scan.yml)
2. [ ] Click **"Run workflow"** button
3. [ ] Select branch: `develop`
4. [ ] Click **"Run workflow"**
5. [ ] Wait for workflow to complete (~5-8 minutes)

**Verify Results:**
- [ ] `dependency-scan` job: ✅ PASSED
- [ ] `container-scan` job: ✅ PASSED
- [ ] `code-scanning` job: ✅ PASSED
- [ ] `secrets-scan` job: ✅ PASSED
- [ ] `security-summary` job: ✅ PASSED

### Step 3: Create Test PR for Coverage Gate

**Option A: Using PowerShell Script**
```powershell
.\scripts\validate-workflows.ps1 -CreateTestPR
```

**Option B: Manual PR Creation**
1. [ ] Create test branch:
   ```powershell
   git checkout -b test/coverage-gate-validation
   ```
2. [ ] Make trivial change (e.g., add comment to README.md)
3. [ ] Commit and push:
   ```powershell
   git add .
   git commit -m "test: validate coverage-gate workflow"
   git push -u origin test/coverage-gate-validation
   ```
4. [ ] Create PR: [`Create Pull Request`](https://github.com/Avi-Bendetsky/Quiz-to-build/compare/develop...test/coverage-gate-validation)
5. [ ] Wait for `coverage-check` to complete (~8-12 minutes)

**Verify Results:**
- [ ] `coverage-check` job: ✅ PASSED
- [ ] PR comment posted with coverage table
- [ ] All coverage metrics ≥95%
- [ ] GitHub check shows green ✅

### Step 4: Monitor Workflow Logs

**Security Scan Logs:**
- [ ] Navigate to: [`Actions → Security Scanning`](https://github.com/Avi-Bendetsky/Quiz-to-build/actions/workflows/security-scan.yml)
- [ ] Click on latest run
- [ ] Expand each job and review logs
- [ ] Check for any warnings or errors
- [ ] Review [`Security tab`](https://github.com/Avi-Bendetsky/Quiz-to-build/security) for findings

**Coverage Gate Logs:**
- [ ] Navigate to: [`Actions → Code Coverage Gate`](https://github.com/Avi-Bendetsky/Quiz-to-build/actions/workflows/coverage-gate.yml)
- [ ] Click on latest run
- [ ] Review coverage summary in job logs
- [ ] Download coverage report artifact
- [ ] Verify Codecov integration (if configured)

---

## Task 3: Verification & Testing ⏱️ 15 minutes

### Test Branch Protection

**Test 1: Direct Push Prevention**
```powershell
git checkout main
git commit --allow-empty -m "test: verify branch protection"
git push origin main
```
- [ ] Push rejected with error: `GH006: Protected branch update failed`

**Test 2: PR Merge Requirements**
1. [ ] Open test PR (from Step 3 above)
2. [ ] Verify "Merge" button is disabled
3. [ ] Verify message shows required checks/approvals
4. [ ] Request review from team member
5. [ ] After approval and checks pass, verify "Merge" becomes available

**Test 3: Status Check Enforcement**
1. [ ] Create PR with intentionally failing test
2. [ ] Verify PR cannot be merged
3. [ ] Fix test and verify merge becomes available

---

## Success Criteria ✅

### Branch Protection Configuration
- [ ] `main` branch protection rule active with 13 required checks
- [ ] `develop` branch protection rule active with 11 required checks
- [ ] Pull request approval required (1 reviewer minimum)
- [ ] Status checks enforced before merge
- [ ] Force push disabled
- [ ] Branch deletion disabled
- [ ] Direct push to protected branches blocked

### Workflow Validation
- [ ] `security-scan.yml` executed successfully
  - [ ] 0 CRITICAL/HIGH vulnerabilities in production dependencies
  - [ ] Container image scan passed
  - [ ] CodeQL analysis completed
  - [ ] No verified secrets detected
- [ ] `coverage-gate.yml` executed successfully
  - [ ] All tests passed
  - [ ] Coverage ≥95% for all metrics (branches, lines, functions, statements)
  - [ ] PR comment posted with coverage report
  - [ ] Codecov integration working

### Integration Verification
- [ ] Security findings visible in GitHub Security tab
- [ ] Coverage reports uploaded to artifacts
- [ ] SARIF files uploaded for security scanning
- [ ] Workflow badges display correct status
- [ ] Team notified of new requirements

---

## Troubleshooting

### Issue: Status checks not appearing in dropdown
**Solution:** Workflows must run at least once. Create a test PR to trigger workflows, then add checks to branch protection.

### Issue: Security scan failing
**Solution:** Review logs for CRITICAL/HIGH vulnerabilities. Run `npm audit fix` and update Dockerfile base image if needed.

### Issue: Coverage gate failing
**Solution:** Review coverage report. Current coverage is 95.87%+, so this should pass. If failing, check for test infrastructure issues.

### Issue: Cannot merge PR despite checks passing
**Solution:** Verify all required status checks are selected in branch protection rules. Check that approvals are provided if required.

---

## Quick Links

- **Branch Protection Settings:** https://github.com/Avi-Bendetsky/Quiz-to-build/settings/branches
- **GitHub Actions:** https://github.com/Avi-Bendetsky/Quiz-to-build/actions
- **Security Tab:** https://github.com/Avi-Bendetsky/Quiz-to-build/security
- **Pull Requests:** https://github.com/Avi-Bendetsky/Quiz-to-build/pulls
- **Detailed Guide:** [`docs/BRANCH-PROTECTION-SETUP-GUIDE.md`](./BRANCH-PROTECTION-SETUP-GUIDE.md)

---

## Timeline

| Task | Duration | Status |
|------|----------|--------|
| Configure main branch protection | 15 min | ⏳ Pending |
| Configure develop branch protection | 15 min | ⏳ Pending |
| Trigger security-scan.yml | 10 min | ⏳ Pending |
| Create test PR for coverage-gate.yml | 10 min | ⏳ Pending |
| Monitor and verify workflows | 20 min | ⏳ Pending |
| Test branch protection rules | 15 min | ⏳ Pending |
| **Total** | **85 min** | ⏳ Pending |

---

**READY FOR EXECUTION** 🚀

Start with Task 1 and work sequentially through the checklist. Mark items complete as you progress.
