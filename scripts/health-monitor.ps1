#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Monitors Container App health in real-time
.DESCRIPTION
    Continuous health monitoring with alerts for Azure Container App
.PARAMETER Interval
    Check interval in seconds (default: 30)
.PARAMETER Duration
    Total monitoring duration in minutes (0 = infinite)
.PARAMETER AlertWebhook
    Optional webhook URL for alerts
#>

param(
    [int]$Interval = 30,
    [int]$Duration = 0,
    [string]$ResourceGroup = "rg-questionnaire-dev",
    [string]$ContainerAppName = "ca-questionnaire-api-dev",
    [string]$AlertWebhook = ""
)

$script:consecutiveFailures = 0
$script:totalChecks = 0
$script:successfulChecks = 0
$script:failedChecks = 0
$script:startTime = Get-Date

function Send-Alert {
    param([string]$Message, [string]$Severity = "Warning")
    
    Write-Host ""
    Write-Host "  🚨 ALERT: $Message" -ForegroundColor Red
    Write-Host ""
    
    if ($AlertWebhook) {
        $payload = @{
            text = "[$Severity] Container App Alert: $Message"
            timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        } | ConvertTo-Json
        
        try {
            Invoke-RestMethod -Uri $AlertWebhook -Method Post -Body $payload -ContentType "application/json" | Out-Null
        } catch {
            Write-Host "  Failed to send webhook alert: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

function Test-AppHealth {
    $fqdn = az containerapp show --name $ContainerAppName --resource-group $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv 2>$null
    
    if (-not $fqdn) {
        return @{ Success = $false; Message = "Cannot retrieve FQDN"; StatusCode = 0; ResponseTime = 0 }
    }
    
    $healthUrl = "https://$fqdn/api/v1/health/ready"
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    
    try {
        $response = Invoke-WebRequest -Uri $healthUrl -Method GET -TimeoutSec 10 -ErrorAction Stop
        $stopwatch.Stop()
        
        return @{
            Success = $true
            Message = "Healthy"
            StatusCode = $response.StatusCode
            ResponseTime = $stopwatch.ElapsedMilliseconds
            Body = $response.Content
        }
    } catch {
        $stopwatch.Stop()
        
        return @{
            Success = $false
            Message = $_.Exception.Message
            StatusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { 0 }
            ResponseTime = $stopwatch.ElapsedMilliseconds
        }
    }
}

function Get-AppStatus {
    $status = az containerapp show --name $ContainerAppName --resource-group $ResourceGroup --query "{running:properties.runningStatus,health:properties.latestRevisionName}" -o json 2>$null | ConvertFrom-Json
    return $status
}

function Format-Uptime {
    param([datetime]$Start)
    $elapsed = (Get-Date) - $Start
    return "{0:00}:{1:00}:{2:00}" -f $elapsed.Hours, $elapsed.Minutes, $elapsed.Seconds
}

function Format-SuccessRate {
    if ($script:totalChecks -eq 0) { return "N/A" }
    $rate = ($script:successfulChecks / $script:totalChecks) * 100
    return "{0:F1}%" -f $rate
}

# Header
Clear-Host
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Container App Health Monitor" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Monitoring: $ContainerAppName" -ForegroundColor White
Write-Host "Resource Group: $ResourceGroup" -ForegroundColor White
Write-Host "Check Interval: $Interval seconds" -ForegroundColor White
if ($Duration -gt 0) {
    Write-Host "Duration: $Duration minutes" -ForegroundColor White
} else {
    Write-Host "Duration: Continuous (Ctrl+C to stop)" -ForegroundColor White
}
Write-Host ""
Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Yellow
Write-Host ""
Write-Host "Time                Status  Code  Response  Success Rate  Consecutive Failures  Message" -ForegroundColor Gray
Write-Host "─────────────────────────────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$endTime = if ($Duration -gt 0) { (Get-Date).AddMinutes($Duration) } else { $null }

try {
    while ($true) {
        # Check if duration exceeded
        if ($endTime -and (Get-Date) -gt $endTime) {
            break
        }
        
        $script:totalChecks++
        $timestamp = Get-Date -Format "HH:mm:ss"
        
        # Get app status
        $appStatus = Get-AppStatus
        
        # Test health endpoint
        $health = Test-AppHealth
        
        if ($health.Success) {
            $script:successfulChecks++
            $script:consecutiveFailures = 0
            
            $statusIcon = "✓"
            $statusColor = "Green"
            $message = "Healthy"
            
            if ($health.ResponseTime -gt 5000) {
                $message = "Slow response"
                $statusColor = "Yellow"
            }
            
        } else {
            $script:failedChecks++
            $script:consecutiveFailures++
            
            $statusIcon = "✗"
            $statusColor = "Red"
            $message = $health.Message.Substring(0, [Math]::Min(30, $health.Message.Length))
            
            # Alert on 3 consecutive failures
            if ($script:consecutiveFailures -eq 3) {
                Send-Alert "Container App unhealthy for 3 consecutive checks" "Critical"
            }
        }
        
        # Format output
        $successRate = Format-SuccessRate
        $line = "{0,-8} {1,6} {2,6} {3,8}ms {4,12} {5,20} {6}" -f `
            $timestamp, `
            $statusIcon, `
            $health.StatusCode, `
            $health.ResponseTime, `
            $successRate, `
            $script:consecutiveFailures, `
            $message
        
        Write-Host $line -ForegroundColor $statusColor
        
        # Wait for next check
        Start-Sleep -Seconds $Interval
    }
} finally {
    # Summary on exit
    Write-Host ""
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host "Monitoring Summary" -ForegroundColor Cyan
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Total Duration: $(Format-Uptime $script:startTime)" -ForegroundColor White
    Write-Host "Total Checks: $script:totalChecks" -ForegroundColor White
    Write-Host "Successful: $script:successfulChecks" -ForegroundColor Green
    Write-Host "Failed: $script:failedChecks" -ForegroundColor Red
    Write-Host "Success Rate: $(Format-SuccessRate)" -ForegroundColor $(if([int](Format-SuccessRate -replace '%','') -ge 95){"Green"}else{"Yellow"})
    Write-Host ""
}
