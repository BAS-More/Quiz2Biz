# ============================================================================
# Quiz-to-Build — New Machine Bootstrap Script
# ============================================================================
# Run this on a fresh Windows machine after:
#   1. Installing VS Code
#   2. Installing Node.js 25.x
#   3. Installing Git
#   4. Cloning the repo: git clone <repo-url> C:\Repos\Quiz-to-Build
#
# Usage:  PowerShell -ExecutionPolicy Bypass -File .\scripts\qoder-new-machine-setup.ps1
# ============================================================================

$ErrorActionPreference = "Continue"
Write-Host "`n=== Quiz-to-Build New Machine Setup ===" -ForegroundColor Cyan

# --------------------------------------------------------------------------
# STEP 1: VS Code Extensions
# --------------------------------------------------------------------------
Write-Host "`n[1/5] Installing VS Code Extensions..." -ForegroundColor Yellow

$extensions = @(
    # Core Development
    "dbaeumer.vscode-eslint"
    "esbenp.prettier-vscode"
    "prisma.prisma"
    "bradlc.vscode-tailwindcss"

    # Testing
    "orta.vscode-jest"
    "vitest.explorer"
    "ms-playwright.playwright"
    "ryanluker.vscode-coverage-gutters"

    # Git & GitHub
    "eamodio.gitlens"
    "github.vscode-github-actions"
    "github.vscode-pull-request-github"
    "github.remotehub"

    # Azure
    "ms-vscode.vscode-node-azure-pack"
    "ms-azuretools.vscode-docker"
    "ms-azuretools.vscode-azureappservice"
    "ms-azuretools.vscode-azurecontainerapps"
    "ms-azuretools.vscode-azurefunctions"
    "ms-azuretools.vscode-azureresourcegroups"
    "ms-azuretools.vscode-azurestaticwebapps"
    "ms-azuretools.vscode-azurestorage"
    "ms-azuretools.vscode-azurevirtualmachines"
    "ms-azuretools.vscode-containers"
    "ms-azuretools.vscode-cosmosdb"
    "ms-azuretools.azure-dev"
    "ms-azuretools.vscode-azure-github-copilot"
    "ms-azuretools.vscode-azure-mcp-server"
    "ms-azure-load-testing.microsoft-testing"
    "ms-vscode.azure-repos"

    # AI & Copilot
    "github.copilot"
    "github.copilot-chat"
    "coderabbit.coderabbit-vscode"
    "ms-windows-ai-studio.windows-ai-studio"
    "teamsdevapp.vscode-ai-foundry"

    # Languages & Tools
    "ms-python.python"
    "ms-python.vscode-pylance"
    "ms-python.debugpy"
    "ms-python.vscode-python-envs"
    "ms-vscode.powershell"
    "ms-ossdata.vscode-pgsql"
    "ms-vscode-remote.remote-containers"
    "ms-vscode.remote-repositories"

    # Utilities
    "streetsidesoftware.code-spell-checker"
    "yzhang.markdown-all-in-one"
    "humao.rest-client"
    "firefox-devtools.vscode-firefox-debug"
)

$installed = 0
$failed = 0
foreach ($ext in $extensions) {
    $result = code --install-extension $ext 2>&1
    if ($LASTEXITCODE -eq 0) {
        $installed++
    } else {
        Write-Host "  WARN: Failed to install $ext" -ForegroundColor Red
        $failed++
    }
}
Write-Host "  Extensions: $installed installed, $failed failed" -ForegroundColor Green

# --------------------------------------------------------------------------
# STEP 2: Node Dependencies
# --------------------------------------------------------------------------
Write-Host "`n[2/5] Installing Node dependencies..." -ForegroundColor Yellow
Set-Location $PSScriptRoot\..
npm ci --legacy-peer-deps
if ($LASTEXITCODE -eq 0) { Write-Host "  npm ci complete" -ForegroundColor Green }

# --------------------------------------------------------------------------
# STEP 3: Prisma Client
# --------------------------------------------------------------------------
Write-Host "`n[3/5] Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -eq 0) { Write-Host "  Prisma client generated" -ForegroundColor Green }

# --------------------------------------------------------------------------
# STEP 4: Verify Workspace Config
# --------------------------------------------------------------------------
Write-Host "`n[4/5] Verifying workspace configuration..." -ForegroundColor Yellow

$checks = @(
    @{ Name = ".vscode/settings.json";   Path = ".vscode\settings.json" }
    @{ Name = ".vscode/launch.json";     Path = ".vscode\launch.json" }
    @{ Name = ".vscode/extensions.json"; Path = ".vscode\extensions.json" }
    @{ Name = "CLAUDE.md";               Path = "CLAUDE.md" }
    @{ Name = ".prettierrc";             Path = ".prettierrc" }
    @{ Name = ".avi-os-SKILL.md";        Path = ".avi-os-SKILL.md" }
    @{ Name = ".avi-os-coding-quality-SKILL.md"; Path = ".avi-os-coding-quality-SKILL.md" }
    @{ Name = "eslint.config.mjs";       Path = "eslint.config.mjs" }
    @{ Name = "tsconfig.json";           Path = "tsconfig.json" }
    @{ Name = "prisma/schema.prisma";    Path = "prisma\schema.prisma" }
)

$ruleCount = (Get-ChildItem -Path ".qoder\rules\*.md" -ErrorAction SilentlyContinue).Count

foreach ($check in $checks) {
    $exists = Test-Path $check.Path
    $status = if ($exists) { "OK" } else { "MISSING" }
    $color = if ($exists) { "Green" } else { "Red" }
    Write-Host "  [$status] $($check.Name)" -ForegroundColor $color
}
Write-Host "  [INFO] .qoder/rules/ contains $ruleCount rule files" -ForegroundColor Cyan

# --------------------------------------------------------------------------
# STEP 5: Print Qoder Memory Bootstrap Prompt
# --------------------------------------------------------------------------
Write-Host "`n[5/5] Qoder Memory Bootstrap" -ForegroundColor Yellow
Write-Host ""
Write-Host "============================================================================" -ForegroundColor White
Write-Host "IMPORTANT: Paste the following into your FIRST Qoder conversation to restore" -ForegroundColor White
Write-Host "all memories. This is a one-time operation per Qoder account on a new machine." -ForegroundColor White
Write-Host "============================================================================" -ForegroundColor White
Write-Host ""
Write-Host "The memory bootstrap prompt has been saved to:" -ForegroundColor Green
Write-Host "  scripts\qoder-memory-bootstrap.txt" -ForegroundColor Green
Write-Host ""
Write-Host "Open that file and paste its contents into your first Qoder chat." -ForegroundColor White

# --------------------------------------------------------------------------
# Summary
# --------------------------------------------------------------------------
Write-Host "`n=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Reload VS Code (Ctrl+Shift+P > Developer: Reload Window)" -ForegroundColor White
Write-Host "  2. Paste the memory bootstrap prompt into Qoder (one time only)" -ForegroundColor White
Write-Host "     File: scripts\qoder-memory-bootstrap.txt" -ForegroundColor White
Write-Host "  3. Copy .env from secure storage (never committed to repo)" -ForegroundColor White
Write-Host "  4. Run: npx prisma migrate deploy (if database is available)" -ForegroundColor White
Write-Host "  5. Run: npm run dev (start development)" -ForegroundColor White
Write-Host ""
Write-Host "Files that travel with the repo (no action needed):" -ForegroundColor Green
Write-Host "  .vscode/settings.json, launch.json, extensions.json" -ForegroundColor Green
Write-Host "  .qoder/rules/ (31 rule files)" -ForegroundColor Green
Write-Host "  CLAUDE.md, .avi-os-SKILL.md, .avi-os-coding-quality-SKILL.md" -ForegroundColor Green
Write-Host "  .prettierrc, eslint.config.mjs, tsconfig.json" -ForegroundColor Green
Write-Host ""
Write-Host "Files you must restore manually:" -ForegroundColor Red
Write-Host "  .env (from Key Vault or secure storage)" -ForegroundColor Red
Write-Host "  .env.production (from Key Vault or secure storage)" -ForegroundColor Red
Write-Host ""
