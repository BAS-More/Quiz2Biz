# Branch Protection Rules Setup Guide

**Generated:** February 27, 2026  
**Purpose:** Configure GitHub branch protection rules for `main` and `develop` branches  
**Status:** READY FOR IMPLEMENTATION

---

## Prerequisites

- GitHub repository admin access
- GitHub CLI installed (`gh` command) OR manual GitHub UI access
- All workflows validated and committed to repository

---

## Option 1: Automated Setup (GitHub CLI - Recommended)

### Step 1: Install GitHub CLI (if not installed)

**Windows (PowerShell):**
```powershell
winget install --id GitHub.cli
```

**Verify installation:**
```powershell
gh --version
```

### Step 2: Authenticate GitHub CLI

```powershell
gh auth login
# Follow prompts:
# - Select: GitHub.com
# - Protocol: HTTPS
# - Authenticate: with web browser (recommended)
```

### Step 3: Run Branch Protection Setup Script

Execute the PowerShell script (see `scripts/setup-branch-protection.ps1`):

```powershell
cd c:\Repos\Quiz-to-Build
.\scripts\setup-branch-protection.ps1
```

This will automatically configure both `main` and `develop` branches.

---

## Option 2: Manual Setup (GitHub Web UI)

### Configuration for `main` Branch

**Navigate to:** Repository Settings → Branches → Add rule

#### Branch name pattern
```
main
```

#### Protection Rules

**1. Require a pull request before merging**
- ✅ Require approvals: **2**
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require review from Code Owners
- ❌ Restrict who can dismiss pull request reviews (optional)
- ✅ Allow specified actors to bypass required pull requests (empty)
- ✅ Require approval of the most recent reviewable push

**2. Require status checks to pass before merging**
- ✅ Require branches to be up to date before merging

**Required Status Checks (Select all that apply):**
- `All Checks Passed` (from ci.yml)
- `Code Coverage Validation` (from coverage-gate.yml)
- `Dependency Vulnerability Scan` (from security-scan.yml)
- `Container Image Security Scan` (from security-scan.yml)
- `CodeQL Code Scanning` (from security-scan.yml)
- `Secrets Detection` (from security-scan.yml)
- `Build Application` (from ci.yml)
- `Docker Build Test` (from ci.yml)
- `Lint and Format Check` (from ci.yml)
- `API Tests` (from ci.yml)
- `Web Tests` (from ci.yml)
- `E2E Tests` (from ci.yml)

**3. Require conversation resolution before merging**
- ✅ Require all conversations to be resolved

**4. Require signed commits**
- ❌ (Optional - enable if your org requires GPG signatures)

**5. Require linear history**
- ✅ Disallow merge commits to enforce a linear history (rebase and squash merges are still allowed; separate from merge-method settings)

**6. Require deployments to succeed before merging**
- ❌ (Not needed for main branch)

**7. Lock branch**
- ❌ (Do not lock - allows commits after approval)

**8. Do not allow bypassing the above settings**
- ✅ Include administrators

**9. Restrict who can push to matching branches**
- ❌ (Allow all with appropriate permissions)

**10. Allow force pushes**
- ❌ Never allow force pushes

**11. Allow deletions**
- ❌ Never allow branch deletion

---

### Configuration for `develop` Branch

**Navigate to:** Repository Settings → Branches → Add rule

#### Branch name pattern
```
develop
```

#### Protection Rules (Relaxed for Development)

**1. Require a pull request before merging**
- ✅ Require approvals: **1** (relaxed from 2)
- ❌ Dismiss stale pull request approvals when new commits are pushed (allow quick iteration)
- ❌ Require review from Code Owners (optional for develop)
- ✅ Require approval of the most recent reviewable push

**2. Require status checks to pass before merging**
- ✅ Require branches to be up to date before merging

**Required Status Checks (Minimum Set):**
- `Lint and Format Check` (from ci.yml)
- `API Tests` (from ci.yml)
- `Web Tests` (from ci.yml)
- `Build Application` (from ci.yml)
- `Code Coverage Validation` (from coverage-gate.yml)

**3. Require conversation resolution before merging**
- ✅ Require all conversations to be resolved

**4. Require signed commits**
- ❌ (Optional)

**5. Require linear history**
- ❌ (Allow rebase in develop for cleaner history)

**6. Do not allow bypassing the above settings**
- ❌ Allow administrators to bypass (flexibility for hotfixes)

**7. Allow force pushes**
- ❌ Never allow force pushes

**8. Allow deletions**
- ❌ Never allow branch deletion

---

## Option 3: GitHub API (Advanced)

### Configuration via REST API

**Set up environment variables:**
```powershell
$GITHUB_TOKEN = "your_personal_access_token"
$REPO_OWNER = "BAS-More"
$REPO_NAME = "Quiz-to-build"
```

**Apply `main` branch protection:**
```powershell
$headers = @{
    "Authorization" = "Bearer $GITHUB_TOKEN"
    "Accept" = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

$body = @{
    required_status_checks = @{
        strict = $true
        contexts = @(
            "All Checks Passed",
            "Code Coverage Validation",
            "Dependency Vulnerability Scan",
            "Container Image Security Scan",
            "CodeQL Code Scanning",
            "Secrets Detection",
            "Build Application",
            "Docker Build Test",
            "Lint and Format Check",
            "API Tests",
            "Web Tests",
            "E2E Tests"
        )
    }
    enforce_admins = $true
    required_pull_request_reviews = @{
        dismiss_stale_reviews = $true
        require_code_owner_reviews = $true
        required_approving_review_count = 2
        require_last_push_approval = $true
    }
    required_conversation_resolution = $true
    required_linear_history = $true
    allow_force_pushes = $false
    allow_deletions = $false
} | ConvertTo-Json -Depth 10

Invoke-RestMethod `
    -Uri "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/branches/main/protection" `
    -Method Put `
    -Headers $headers `
    -Body $body `
    -ContentType "application/json"
```

**Apply `develop` branch protection:**
```powershell
$bodyDevelop = @{
    required_status_checks = @{
        strict = $true
        contexts = @(
            "Lint and Format Check",
            "API Tests",
            "Web Tests",
            "Build Application",
            "Code Coverage Validation"
        )
    }
    enforce_admins = $false
    required_pull_request_reviews = @{
        dismiss_stale_reviews = $false
        require_code_owner_reviews = $false
        required_approving_review_count = 1
        require_last_push_approval = $true
    }
    required_conversation_resolution = $true
    required_linear_history = $false
    allow_force_pushes = $false
    allow_deletions = $false
} | ConvertTo-Json -Depth 10

Invoke-RestMethod `
    -Uri "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/branches/develop/protection" `
    -Method Put `
    -Headers $headers `
    -Body $bodyDevelop `
    -ContentType "application/json"
```

---

## Verification Steps

After applying branch protection rules:

### 1. Verify Rules Applied

**Using GitHub Web UI:**
- Navigate to: Repository Settings → Branches
- Verify both `main` and `develop` appear in "Branch protection rules"
- Click "Edit" on each to verify settings

**Using GitHub CLI:**
```powershell
# Check main branch
gh api repos/:owner/:repo/branches/main/protection | ConvertFrom-Json | Format-List

# Check develop branch
gh api repos/:owner/:repo/branches/develop/protection | ConvertFrom-Json | Format-List
```

### 2. Test Branch Protection

**Create a test branch:**
```powershell
git checkout -b test/branch-protection
git push origin test/branch-protection
```

**Create a pull request to `main`:**
```powershell
gh pr create --base main --head test/branch-protection --title "Test: Branch Protection Validation" --body "Testing branch protection rules"
```

**Verify the following:**
- ✅ PR cannot be merged without approvals (2 required)
- ✅ PR shows required status checks (12 checks for main)
- ✅ Status checks must pass before merge enabled
- ✅ Conversations must be resolved before merge
- ✅ "Merge" button disabled until requirements met

**Clean up test:**
```powershell
gh pr close <PR_NUMBER>
git checkout main
git branch -D test/branch-protection
git push origin --delete test/branch-protection
```

---

## Troubleshooting

### Issue: Status checks not appearing in required list

**Cause:** Workflows have not run yet on the branch

**Solution:**
1. Commit and push changes to trigger workflows
2. Wait for workflows to complete
3. Status checks will appear in "Add required status checks" dropdown
4. Add them to branch protection rules

### Issue: Cannot find workflow status check names

**Solution:** Check workflow names in YAML files:
- `name:` at job level (e.g., `name: All Checks Passed`)
- Use exact names from workflow files

### Issue: Too many required checks slow down development

**Solution:** For `develop` branch, use minimum required checks only:
- Lint and Format Check
- API Tests
- Web Tests
- Build Application
- Code Coverage Validation

Reserve comprehensive checks for `main` branch only.

### Issue: Administrators cannot bypass protection

**Solution:**
1. Go to Repository Settings → Branches → Edit rule
2. Uncheck "Do not allow bypassing the above settings"
3. Save changes
4. Administrators can now bypass when necessary (use sparingly)

---

## Security Considerations

### Why These Rules?

**`main` Branch (Strict):**
- **Production deployment branch** - requires highest quality gates
- **2 reviews required** - ensures peer validation and knowledge sharing
- **12 status checks** - comprehensive validation (tests, security, coverage, build)
- **Enforce admins** - even admins must follow process
- **No force push/delete** - maintains git history integrity

**`develop` Branch (Balanced):**
- **Integration branch** - balances quality with development velocity
- **1 review required** - faster iteration while maintaining oversight
- **5 status checks** - essential quality gates only
- **Allow admin bypass** - flexibility for hotfixes and urgent changes
- **No force push/delete** - maintains history but allows rebase

### Risk Mitigation

**Without branch protection:**
- ❌ Code can be merged without review
- ❌ Tests can be skipped
- ❌ Security scans can be bypassed
- ❌ Coverage can regress below 95%
- ❌ Git history can be rewritten (force push)

**With branch protection:**
- ✅ All code reviewed by 1-2 people
- ✅ All tests must pass (4035 tests)
- ✅ Security scans mandatory (SAST/DAST/container/secrets)
- ✅ Coverage enforced (≥95% all metrics)
- ✅ Git history protected

---

## Recommended Timeline

**Day 1 (Today):**
1. ✅ Review this document
2. ✅ Choose setup method (CLI recommended)
3. ✅ Apply rules to `develop` branch first (test environment)
4. ✅ Create test PR to validate rules work

**Day 2 (Tomorrow):**
1. ✅ Verify `develop` branch protection working correctly
2. ✅ Apply rules to `main` branch
3. ✅ Notify team of new protection rules
4. ✅ Document any exceptions or bypass procedures

---

## Next Steps After Branch Protection

1. **Enable New Workflows**
   - Manually trigger `security-scan.yml` via GitHub Actions UI
   - Create test PR to trigger `coverage-gate.yml`
   - Monitor workflow logs for issues

2. **Team Communication**
   - Notify all developers of new branch protection rules
   - Share this document for reference
   - Provide training on new workflow requirements

3. **Monitor & Adjust**
   - Track PR merge times (should not significantly increase)
   - Gather feedback from team on pain points
   - Adjust `develop` branch rules if too restrictive

---

**Document Version:** 1.0  
**Last Updated:** February 27, 2026  
**Status:** READY FOR IMPLEMENTATION
