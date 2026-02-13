# Fix Terraform Duplicate Content Script
# This script removes duplicate content from all .tf files in the modules directory

Write-Host "Starting Terraform duplicate fix process..." -ForegroundColor Cyan

$modulesPath = ".\modules"
$tfFiles = Get-ChildItem -Path $modulesPath -Recurse -Filter "*.tf"
$fixedCount = 0

foreach ($file in $tfFiles) {
    Write-Host "`nProcessing: $($file.FullName)" -ForegroundColor Yellow
    
    $content = Get-Content $file.FullName -Raw
    $lines = Get-Content $file.FullName
    
    # Check for exact duplicate (entire file duplicated)
    $lineCount = $lines.Count
    if ($lineCount -gt 20) {
        $half = [Math]::Floor($lineCount / 2)
        $firstHalf = $lines[0..($half - 1)] -join "`n"
        $secondHalf = $lines[$half..($lineCount - 1)] -join "`n"
        
        if ($firstHalf.Trim() -eq $secondHalf.Trim()) {
            Write-Host "  Found exact duplicate! Removing second half..." -ForegroundColor Green
            $lines[0..($half - 1)] | Set-Content $file.FullName -Encoding UTF8
            $fixedCount++
            continue
        }
    }
    
    # Check for git merge conflict markers
    if ($content -match '<<<<<<<|>>>>>>>|=======') {
        Write-Host "  Found merge conflict markers! File needs manual resolution." -ForegroundColor Red
    }
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Fixed $fixedCount files with duplicates" -ForegroundColor Green
Write-Host "================================`n" -ForegroundColor Cyan
