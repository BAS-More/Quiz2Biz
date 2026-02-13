#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Diagnoses Container App startup issues
.DESCRIPTION
    Comprehensive troubleshooting script for Azure Container App startup failures
#>

param(
    [string]$ResourceGroup = "rg-questionnaire-dev",
    [string]$ContainerAppName = "ca-questionnaire-api-dev"
)

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Container App Startup Diagnostics" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Container App Status
Write-Host "[1/8] Checking Container App Status..." -ForegroundColor Yellow
$appStatus = az containerapp show --name $ContainerAppName --resource-group $ResourceGroup --query "{provisioningState:properties.provisioningState, runningStatus:properties.runningStatus, latestRevision:properties.latestRevisionName}" -o json 2>$null | ConvertFrom-Json

if ($appStatus) {
    Write-Host "  Provisioning State: $($appStatus.provisioningState)" -ForegroundColor Green
    Write-Host "  Running Status: $($appStatus.runningStatus)" -ForegroundColor Green
    Write-Host "  Latest Revision: $($appStatus.latestRevision)" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Cannot retrieve Container App status" -ForegroundColor Red
}
Write-Host ""

# 2. Check Revision Health
Write-Host "[2/8] Checking Revision Health..." -ForegroundColor Yellow
if ($appStatus.latestRevision) {
    $revisionHealth = az containerapp revision show --name $ContainerAppName --resource-group $ResourceGroup --revision $appStatus.latestRevision --query "{healthState:properties.healthState, replicas:properties.replicas}" -o json 2>$null | ConvertFrom-Json
    
    if ($revisionHealth) {
        Write-Host "  Health State: $($revisionHealth.healthState)" -ForegroundColor $(if($revisionHealth.healthState -eq "Healthy"){"Green"}else{"Red"})
        Write-Host "  Active Replicas: $($revisionHealth.replicas)" -ForegroundColor Green
    }
}
Write-Host ""

# 3. Get Container Logs (Last 50 lines)
Write-Host "[3/8] Fetching Container Logs (last 50 lines)..." -ForegroundColor Yellow
$logs = az containerapp logs show --name $ContainerAppName --resource-group $ResourceGroup --tail 50 --follow false --format json 2>$null | ConvertFrom-Json

if ($logs) {
    Write-Host "  Recent log entries:" -ForegroundColor Green
    $logs | Select-Object -Last 15 | ForEach-Object {
        $logLine = $_.Log -replace '\x1b\[[0-9;]*m', ''  # Strip ANSI codes
        if ($logLine -match "error|fail|exception") {
            Write-Host "    $logLine" -ForegroundColor Red
        } elseif ($logLine -match "warn") {
            Write-Host "    $logLine" -ForegroundColor Yellow
        } else {
            Write-Host "    $logLine" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "  WARNING: No logs available or logs command failed" -ForegroundColor Yellow
}
Write-Host ""

# 4. Check Environment Variables
Write-Host "[4/8] Checking Environment Variables..." -ForegroundColor Yellow
$envVars = az containerapp show --name $ContainerAppName --resource-group $ResourceGroup --query "properties.template.containers[0].env" -o json 2>$null | ConvertFrom-Json

if ($envVars) {
    $missingValues = @()
    foreach ($env in $envVars) {
        if (-not $env.value -and -not $env.secretRef) {
            $missingValues += $env.name
        }
    }
    
    if ($missingValues.Count -gt 0) {
        Write-Host "  ERROR: Missing values for:" -ForegroundColor Red
        $missingValues | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
    } else {
        Write-Host "  All environment variables have values or secret references" -ForegroundColor Green
    }
}
Write-Host ""

# 5. Check Database Connectivity
Write-Host "[5/8] Checking PostgreSQL Server..." -ForegroundColor Yellow
$dbServer = az postgres flexible-server list --resource-group $ResourceGroup --query "[0].{name:name,state:state,fqdn:fullyQualifiedDomainName}" -o json 2>$null | ConvertFrom-Json

if ($dbServer) {
    Write-Host "  Server Name: $($dbServer.name)" -ForegroundColor Green
    Write-Host "  State: $($dbServer.state)" -ForegroundColor $(if($dbServer.state -eq "Ready"){"Green"}else{"Yellow"})
    Write-Host "  FQDN: $($dbServer.fqdn)" -ForegroundColor Green
} else {
    Write-Host "  WARNING: Cannot retrieve database info" -ForegroundColor Yellow
}
Write-Host ""

# 6. Check Redis Cache
Write-Host "[6/8] Checking Redis Cache..." -ForegroundColor Yellow
$redis = az redis list --resource-group $ResourceGroup --query "[0].{name:name,provisioningState:provisioningState,hostname:hostName,port:sslPort}" -o json 2>$null | ConvertFrom-Json

if ($redis) {
    Write-Host "  Cache Name: $($redis.name)" -ForegroundColor Green
    Write-Host "  State: $($redis.provisioningState)" -ForegroundColor $(if($redis.provisioningState -eq "Succeeded"){"Green"}else{"Yellow"})
    Write-Host "  Hostname: $($redis.hostname)" -ForegroundColor Green
    Write-Host "  SSL Port: $($redis.port)" -ForegroundColor Green
} else {
    Write-Host "  WARNING: Cannot retrieve Redis info" -ForegroundColor Yellow
}
Write-Host ""

# 7. Test Health Endpoint
Write-Host "[7/8] Testing Health Endpoint..." -ForegroundColor Yellow
$fqdn = az containerapp show --name $ContainerAppName --resource-group $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv 2>$null

if ($fqdn) {
    Write-Host "  FQDN: $fqdn" -ForegroundColor Green
    $healthUrl = "https://$fqdn/api/v1/health/ready"
    
    try {
        $response = Invoke-WebRequest -Uri $healthUrl -Method GET -TimeoutSec 10 -ErrorAction Stop
        Write-Host "  Health Check: SUCCESS (HTTP $($response.StatusCode))" -ForegroundColor Green
        Write-Host "  Response: $($response.Content)" -ForegroundColor Green
    } catch {
        Write-Host "  Health Check: FAILED" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# 8. Check Key Vault Secrets
Write-Host "[8/8] Checking Key Vault Secrets..." -ForegroundColor Yellow
$keyVault = az keyvault list --resource-group $ResourceGroup --query "[0].name" -o tsv 2>$null

if ($keyVault) {
    Write-Host "  Key Vault: $keyVault" -ForegroundColor Green
    $secrets = @("DATABASE-URL", "REDIS-PASSWORD", "JWT-SECRET", "JWT-REFRESH-SECRET")
    
    foreach ($secretName in $secrets) {
        $secretExists = az keyvault secret show --vault-name $keyVault --name $secretName --query "name" -o tsv 2>$null
        if ($secretExists) {
            Write-Host "  ✓ $secretName exists" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $secretName missing" -ForegroundColor Red
        }
    }
} else {
    Write-Host "  WARNING: Cannot find Key Vault" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Diagnostic Summary" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Review logs above for error messages" -ForegroundColor White
Write-Host "2. If health check fails, check database/Redis connectivity" -ForegroundColor White
Write-Host "3. If environment variables missing, run: terraform apply -auto-approve" -ForegroundColor White
Write-Host "4. Check Container App logs in Azure Portal for detailed stack traces" -ForegroundColor White
Write-Host ""
