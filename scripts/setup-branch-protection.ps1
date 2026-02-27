# Branch Protection Setup Script
# Automatically configures branch protection rules for main and develop branches
# Requires: GitHub CLI (gh) installed and authenticated

param(
    [Parameter(Mandatory=$false)]
    [string]$Owner = "Avi-Bendetsky",
    
    [Parameter(Mandatory=$false)]
    [string]$Repo = "Quiz-to-build",
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🔒 Branch Protection Setup Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if GitHub CLI is installed
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow
try {
    $ghVersion = gh --version 2>&1 | Select-Object -First 1
    Write-Host "✅ GitHub CLI installed: $ghVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ GitHub CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   winget install --id GitHub.cli" -ForegroundColor White
    exit 1
}

# Check authentication
Write-Host "🔐 Checking GitHub authentication..." -ForegroundColor Yellow
try {
    $authStatus = gh auth status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Not authenticated. Please run: gh auth login" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Authenticated to GitHub" -ForegroundColor Green
} catch {
    Write-Host "❌ Authentication check failed. Please run: gh auth login" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Repository: $Owner/$Repo" -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE - No changes will be made" -ForegroundColor Yellow
    Write-Host ""
}

# Function to apply branch protection
function Set-BranchProtection {
    param(
        [string]$Branch,
        [hashtable]$Config
    )
    
    Write-Host ""
    Write-Host "🛡️  Configuring protection for branch: $Branch" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    
    # Convert config to JSON
    $jsonConfig = $Config | ConvertTo-Json -Depth 10 -Compress
    
    if ($DryRun) {
        Write-Host "Would apply the following protection:" -ForegroundColor Yellow
        Write-Host $jsonConfig -ForegroundColor Gray
        Write-Host ""
        Write-Host "✅ Dry run complete for $Branch" -ForegroundColor Green
        return
    }
    
    try {
        # Use GitHub API via gh CLI
        $result = gh api `
            --method PUT `
            "repos/$Owner/$Repo/branches/$Branch/protection" `
            --input - `
            2>&1 <<< $jsonConfig
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Successfully configured protection for $Branch" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Warning: Some protection rules may not have applied" -ForegroundColor Yellow
            Write-Host "   This is normal if status checks haven't run yet" -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ Failed to configure protection for $Branch" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor Red
        throw
    }
}

# Main branch protection configuration
$mainProtection = @{
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
    restrictions = $null
}

# Develop branch protection configuration (more lenient)
$developProtection = @{
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
    restrictions = $null
}

# Display configuration summary
Write-Host ""
Write-Host "📋 Configuration Summary" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""
Write-Host "MAIN Branch Protection:" -ForegroundColor White
Write-Host "  - Required Reviews: 2" -ForegroundColor Gray
Write-Host "  - Required Status Checks: 12" -ForegroundColor Gray
Write-Host "  - Enforce Admins: Yes" -ForegroundColor Gray
Write-Host "  - Linear History: Yes" -ForegroundColor Gray
Write-Host "  - Force Push: No" -ForegroundColor Gray
Write-Host "  - Delete: No" -ForegroundColor Gray
Write-Host ""
Write-Host "DEVELOP Branch Protection:" -ForegroundColor White
Write-Host "  - Required Reviews: 1" -ForegroundColor Gray
Write-Host "  - Required Status Checks: 5" -ForegroundColor Gray
Write-Host "  - Enforce Admins: No" -ForegroundColor Gray
Write-Host "  - Linear History: No" -ForegroundColor Gray
Write-Host "  - Force Push: No" -ForegroundColor Gray
Write-Host "  - Delete: No" -ForegroundColor Gray
Write-Host ""

# Confirm before proceeding (unless dry run)
if (-not $DryRun) {
    Write-Host "⚠️  This will modify branch protection rules" -ForegroundColor Yellow
    $confirm = Read-Host "Do you want to proceed? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Host "❌ Operation cancelled" -ForegroundColor Red
        exit 0
    }
}

# Apply configurations
try {
    # Apply develop branch first (safer to test)
    Set-BranchProtection -Branch "develop" -Config $developProtection
    
    # Apply main branch
    Set-BranchProtection -Branch "main" -Config $mainProtection
    
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "✅ Branch protection setup complete!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    
    if ($DryRun) {
        Write-Host "🔍 This was a DRY RUN - no changes were made" -ForegroundColor Yellow
        Write-Host "   Run without -DryRun to apply changes" -ForegroundColor Gray
    } else {
        Write-Host "📊 Verification Steps:" -ForegroundColor Cyan
        Write-Host "   1. Visit: https://github.com/$Owner/$Repo/settings/branches" -ForegroundColor White
        Write-Host "   2. Verify 'main' and 'develop' appear in protection rules" -ForegroundColor White
        Write-Host "   3. Create a test PR to validate rules work correctly" -ForegroundColor White
        Write-Host ""
        Write-Host "⚠️  Note: Some status checks may not appear until workflows run" -ForegroundColor Yellow
        Write-Host "   This is normal. You may need to update protection rules after" -ForegroundColor Gray
        Write-Host "   the first workflow execution to add missing status checks." -ForegroundColor Gray
    }
    
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "❌ Branch protection setup failed" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Ensure you have admin permissions on the repository" -ForegroundColor Gray
    Write-Host "   2. Check that GitHub CLI is authenticated: gh auth status" -ForegroundColor Gray
    Write-Host "   3. Try running with -DryRun to validate configuration" -ForegroundColor Gray
    Write-Host "   4. See docs/BRANCH-PROTECTION-SETUP.md for manual setup" -ForegroundColor Gray
    Write-Host ""
    exit 1
}
