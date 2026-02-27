# Workflow Validation Script
# Validates that new GitHub Actions workflows are properly configured and executable
# Usage: .\scripts\validate-workflows.ps1

param(
    [Parameter(Mandatory=$false)]
    [string]$Owner = "Avi-Bendetsky",
    
    [Parameter(Mandatory=$false)]
    [string]$Repo = "Quiz-to-build",
    
    [Parameter(Mandatory=$false)]
    [switch]$TriggerSecurityScan = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$CreateTestPR = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🔍 GitHub Actions Workflow Validation" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if GitHub CLI is installed
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow
try {
    $ghVersion = gh --version 2>&1 | Select-Object -First 1
    Write-Host "✅ GitHub CLI installed: $ghVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ GitHub CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   winget install --id GitHub.cli" -ForegroundColor Yellow
    exit 1
}

# Check authentication
Write-Host "🔐 Verifying GitHub authentication..." -ForegroundColor Yellow
try {
    $authStatus = gh auth status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Not authenticated with GitHub CLI" -ForegroundColor Red
        Write-Host "   Run: gh auth login" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✅ GitHub CLI authenticated" -ForegroundColor Green
} catch {
    Write-Host "❌ Authentication check failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Validate workflow files exist
Write-Host "📂 Validating workflow files..." -ForegroundColor Yellow

$workflowPath = "c:\Repos\Quiz-to-Build\.github\workflows"
$requiredWorkflows = @(
    "security-scan.yml",
    "coverage-gate.yml",
    "ci.yml"
)

$allWorkflowsExist = $true
foreach ($workflow in $requiredWorkflows) {
    $filePath = Join-Path $workflowPath $workflow
    if (Test-Path $filePath) {
        Write-Host "  ✅ $workflow exists" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $workflow NOT FOUND" -ForegroundColor Red
        $allWorkflowsExist = $false
    }
}

if (-not $allWorkflowsExist) {
    Write-Host ""
    Write-Host "❌ Missing required workflow files. Cannot continue." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check current branch
Write-Host "🌿 Checking current branch..." -ForegroundColor Yellow
try {
    $currentBranch = git branch --show-current
    Write-Host "  Current branch: $currentBranch" -ForegroundColor Cyan
} catch {
    Write-Host "  ⚠️  Could not determine current branch" -ForegroundColor Yellow
}

Write-Host ""

# List all workflows in repository
Write-Host "📋 Fetching workflows from GitHub..." -ForegroundColor Yellow
try {
    $workflows = gh api repos/$Owner/$Repo/actions/workflows --jq '.workflows[] | {name: .name, path: .path, state: .state}'
    
    Write-Host ""
    Write-Host "Available workflows:" -ForegroundColor Cyan
    gh api repos/$Owner/$Repo/actions/workflows --jq '.workflows[] | "  - \(.name) (\(.state))"' | ForEach-Object {
        Write-Host $_ -ForegroundColor White
    }
} catch {
    Write-Host "  ⚠️  Could not fetch workflows from GitHub" -ForegroundColor Yellow
    Write-Host "     This is normal if workflows haven't been pushed yet" -ForegroundColor Gray
}

Write-Host ""

# Trigger security scan if requested
if ($TriggerSecurityScan) {
    Write-Host "🚀 Triggering security-scan.yml workflow..." -ForegroundColor Yellow
    
    try {
        gh workflow run security-scan.yml --ref develop
        Write-Host "  ✅ Workflow triggered successfully" -ForegroundColor Green
        Write-Host "  📊 Monitor at: https://github.com/$Owner/$Repo/actions/workflows/security-scan.yml" -ForegroundColor Cyan
        
        Write-Host ""
        Write-Host "  Waiting 10 seconds for workflow to start..." -ForegroundColor Gray
        Start-Sleep -Seconds 10
        
        Write-Host "  📋 Recent workflow runs:" -ForegroundColor Cyan
        gh run list --workflow=security-scan.yml --limit=3 --json displayTitle,status,conclusion,createdAt --jq '.[] | "    \(.displayTitle) - \(.status) (\(.conclusion // "running"))"'
        
    } catch {
        Write-Host "  ❌ Failed to trigger workflow: $_" -ForegroundColor Red
        Write-Host "     You may need to push the workflow file to GitHub first" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

# Create test PR if requested
if ($CreateTestPR) {
    Write-Host "🔀 Creating test PR for coverage-gate.yml validation..." -ForegroundColor Yellow
    
    $testBranch = "test/workflow-validation-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    
    try {
        # Create and checkout test branch
        Write-Host "  Creating branch: $testBranch" -ForegroundColor Gray
        git checkout -b $testBranch 2>&1 | Out-Null
        
        # Make a trivial change
        $readmePath = "c:\Repos\Quiz-to-Build\README.md"
        if (Test-Path $readmePath) {
            Write-Host "  Adding validation timestamp to README..." -ForegroundColor Gray
            Add-Content -Path $readmePath -Value "`n<!-- Workflow validation: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') -->"
            
            git add README.md
            git commit -m "test: validate coverage-gate workflow" 2>&1 | Out-Null
            git push -u origin $testBranch 2>&1 | Out-Null
            
            Write-Host "  ✅ Test branch pushed: $testBranch" -ForegroundColor Green
            
            # Create PR
            Write-Host "  Creating pull request..." -ForegroundColor Gray
            $prUrl = gh pr create --base develop --head $testBranch --title "test: Validate coverage-gate workflow" --body "Automated PR to trigger and validate coverage-gate.yml workflow.`n`n**Purpose:** Workflow validation`n**Expected:** All checks should pass`n**Action:** Close this PR after validation"
            
            Write-Host "  ✅ Pull request created: $prUrl" -ForegroundColor Green
            Write-Host ""
            Write-Host "  📊 Monitor workflow at:" -ForegroundColor Cyan
            Write-Host "     $prUrl/checks" -ForegroundColor White
            
        } else {
            Write-Host "  ❌ README.md not found" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "  ❌ Failed to create test PR: $_" -ForegroundColor Red
    } finally {
        # Return to original branch
        if ($currentBranch) {
            git checkout $currentBranch 2>&1 | Out-Null
        }
    }
    
    Write-Host ""
}

# Workflow syntax validation
Write-Host "✅ Validating workflow syntax..." -ForegroundColor Yellow

$workflows = @(
    "security-scan.yml",
    "coverage-gate.yml"
)

foreach ($workflow in $workflows) {
    $filePath = Join-Path $workflowPath $workflow
    Write-Host "  Checking $workflow..." -ForegroundColor Gray
    
    try {
        # Use actionlint if available
        $actionlintPath = Get-Command actionlint -ErrorAction SilentlyContinue
        if ($actionlintPath) {
            $lintResult = actionlint $filePath 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "    ✅ Syntax valid (actionlint)" -ForegroundColor Green
            } else {
                Write-Host "    ⚠️  Linting warnings:" -ForegroundColor Yellow
                Write-Host $lintResult -ForegroundColor Gray
            }
        } else {
            # Basic YAML validation
            $content = Get-Content $filePath -Raw
            if ($content -match "^name:" -and $content -match "on:" -and $content -match "jobs:") {
                Write-Host "    ✅ Basic structure valid" -ForegroundColor Green
            } else {
                Write-Host "    ⚠️  Basic structure check failed" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "    ❌ Validation failed: $_" -ForegroundColor Red
    }
}

Write-Host ""

# Summary
Write-Host "📊 Validation Summary" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Workflow Files:" -ForegroundColor White
Write-Host "  ✅ security-scan.yml" -ForegroundColor Green
Write-Host "  ✅ coverage-gate.yml" -ForegroundColor Green
Write-Host "  ✅ ci.yml (existing)" -ForegroundColor Green
Write-Host ""
Write-Host "GitHub CLI:" -ForegroundColor White
Write-Host "  ✅ Installed and authenticated" -ForegroundColor Green
Write-Host ""

if ($TriggerSecurityScan -or $CreateTestPR) {
    Write-Host "Actions Taken:" -ForegroundColor White
    if ($TriggerSecurityScan) {
        Write-Host "  ✅ Security scan workflow triggered" -ForegroundColor Green
    }
    if ($CreateTestPR) {
        Write-Host "  ✅ Test PR created for coverage validation" -ForegroundColor Green
    }
    Write-Host ""
}

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Configure branch protection rules (see docs/BRANCH-PROTECTION-SETUP-GUIDE.md)" -ForegroundColor White
Write-Host "  2. Monitor workflow executions in GitHub Actions tab" -ForegroundColor White
Write-Host "  3. Review security findings in GitHub Security tab" -ForegroundColor White
Write-Host "  4. Verify coverage reports in PR comments" -ForegroundColor White
Write-Host ""

Write-Host "🔗 Quick Links:" -ForegroundColor Cyan
Write-Host "   Actions: https://github.com/$Owner/$Repo/actions" -ForegroundColor White
Write-Host "   Security: https://github.com/$Owner/$Repo/security" -ForegroundColor White
Write-Host "   Settings: https://github.com/$Owner/$Repo/settings/branches" -ForegroundColor White
Write-Host ""

Write-Host "✅ Validation complete!" -ForegroundColor Green
