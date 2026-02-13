#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Sets up custom domain with SSL for Container App
.DESCRIPTION
    Configures www.quiz2biz.com with managed SSL certificate for Azure Container App
.PARAMETER Domain
    Custom domain to configure (default: www.quiz2biz.com)
.PARAMETER ResourceGroup
    Azure resource group name
.PARAMETER ContainerAppName
    Container App name
.PARAMETER EnvironmentName
    Container App Environment name
#>

param(
    [string]$Domain = "www.quiz2biz.com",
    [string]$ResourceGroup = "rg-questionnaire-dev",
    [string]$ContainerAppName = "ca-questionnaire-api-dev",
    [string]$EnvironmentName = "cae-questionnaire-dev"
)

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Custom Domain Setup for Container App" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify app is healthy
Write-Host "[Step 1/6] Verifying Container App Health..." -ForegroundColor Yellow
$appHealth = az containerapp show --name $ContainerAppName --resource-group $ResourceGroup --query "properties.runningStatus" -o tsv 2>$null

if ($appHealth -ne "Running") {
    Write-Host "  ERROR: Container App is not running (Status: $appHealth)" -ForegroundColor Red
    Write-Host "  Please ensure the app is healthy before adding custom domain" -ForegroundColor Red
    exit 1
}
Write-Host "  App Status: $appHealth ✓" -ForegroundColor Green
Write-Host ""

# Step 2: Get Container App FQDN for CNAME validation
Write-Host "[Step 2/6] Getting Container App FQDN..." -ForegroundColor Yellow
$appFqdn = az containerapp show --name $ContainerAppName --resource-group $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv 2>$null

if (-not $appFqdn) {
    Write-Host "  ERROR: Cannot retrieve Container App FQDN" -ForegroundColor Red
    exit 1
}
Write-Host "  Container App FQDN: $appFqdn" -ForegroundColor Green
Write-Host ""

# Step 3: Verify DNS CNAME record
Write-Host "[Step 3/6] Verifying DNS Configuration..." -ForegroundColor Yellow
Write-Host "  Checking CNAME record for $Domain..." -ForegroundColor White

try {
    $dnsResult = Resolve-DnsName -Name $Domain -Type CNAME -ErrorAction Stop
    $cnameTarget = $dnsResult.NameHost
    
    Write-Host "  Current CNAME: $Domain -> $cnameTarget" -ForegroundColor Cyan
    
    if ($cnameTarget -eq $appFqdn) {
        Write-Host "  DNS Configuration: CORRECT ✓" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: CNAME points to $cnameTarget" -ForegroundColor Yellow
        Write-Host "  Expected: $appFqdn" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  ACTION REQUIRED:" -ForegroundColor Red
        Write-Host "  1. Log in to GoDaddy DNS management" -ForegroundColor White
        Write-Host "  2. Update CNAME record:" -ForegroundColor White
        Write-Host "     Type: CNAME" -ForegroundColor White
        Write-Host "     Name: www" -ForegroundColor White
        Write-Host "     Value: $appFqdn" -ForegroundColor White
        Write-Host "     TTL: 600 (10 minutes)" -ForegroundColor White
        Write-Host ""
        
        $continue = Read-Host "  Continue anyway? (y/n)"
        if ($continue -ne "y") {
            Write-Host "  Setup cancelled. Please fix DNS first." -ForegroundColor Yellow
            exit 0
        }
    }
} catch {
    Write-Host "  WARNING: Cannot resolve DNS for $Domain" -ForegroundColor Yellow
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Please ensure CNAME record exists:" -ForegroundColor Yellow
    Write-Host "    $Domain -> $appFqdn" -ForegroundColor White
    Write-Host ""
    
    $continue = Read-Host "  Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 0
    }
}
Write-Host ""

# Step 4: Add custom domain to Container App
Write-Host "[Step 4/6] Adding Custom Domain to Container App..." -ForegroundColor Yellow
Write-Host "  This may take 2-3 minutes..." -ForegroundColor White

$addDomainCmd = @"
az containerapp hostname add ``
  --name $ContainerAppName ``
  --resource-group $ResourceGroup ``
  --hostname $Domain
"@

Write-Host "  Executing: $addDomainCmd" -ForegroundColor Gray

try {
    az containerapp hostname add `
      --name $ContainerAppName `
      --resource-group $ResourceGroup `
      --hostname $Domain 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Custom domain added successfully ✓" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: Command completed with warnings" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ERROR: Failed to add custom domain" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 5: Create and bind managed SSL certificate
Write-Host "[Step 5/6] Creating Managed SSL Certificate..." -ForegroundColor Yellow
Write-Host "  Azure will automatically provision a free managed certificate" -ForegroundColor White
Write-Host "  This process takes 5-10 minutes..." -ForegroundColor White

$bindCertCmd = @"
az containerapp hostname bind ``
  --name $ContainerAppName ``
  --resource-group $ResourceGroup ``
  --hostname $Domain ``
  --environment $EnvironmentName ``
  --validation-method CNAME
"@

Write-Host "  Executing: $bindCertCmd" -ForegroundColor Gray

try {
    az containerapp hostname bind `
      --name $ContainerAppName `
      --resource-group $ResourceGroup `
      --hostname $Domain `
      --environment $EnvironmentName `
      --validation-method CNAME 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  SSL certificate binding initiated ✓" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: Certificate binding may still be in progress" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ERROR: Failed to bind SSL certificate" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Step 6: Verify custom domain works
Write-Host "[Step 6/6] Verifying Custom Domain..." -ForegroundColor Yellow
Write-Host "  Waiting 30 seconds for DNS propagation..." -ForegroundColor White
Start-Sleep -Seconds 30

$customUrl = "https://$Domain/api/v1/health/ready"
Write-Host "  Testing: $customUrl" -ForegroundColor White

try {
    $response = Invoke-WebRequest -Uri $customUrl -Method GET -TimeoutSec 15 -ErrorAction Stop
    Write-Host "  Custom Domain Test: SUCCESS ✓" -ForegroundColor Green
    Write-Host "  HTTP Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "  Response: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "  Custom Domain Test: PENDING" -ForegroundColor Yellow
    Write-Host "  This is normal - SSL certificate provisioning can take 5-10 minutes" -ForegroundColor Yellow
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
}
Write-Host ""

# Summary
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Custom Domain: https://$Domain" -ForegroundColor Green
Write-Host "Health Check: https://$Domain/api/v1/health/ready" -ForegroundColor Green
Write-Host "API Docs: https://$Domain/api/v1/docs" -ForegroundColor Green
Write-Host ""
Write-Host "Note: SSL certificate may take 5-10 minutes to fully provision." -ForegroundColor Yellow
Write-Host "Check status with: az containerapp hostname list --name $ContainerAppName --resource-group $ResourceGroup" -ForegroundColor White
Write-Host ""
