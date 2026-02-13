# Fix Duplicate Code Script
# Detects and removes duplicate code blocks in TypeScript files

param(
    [string]$SourceDir = "apps\api\src",
    [switch]$DryRun = $false
)

Write-Host "=== Duplicate Code Fixer ===" -ForegroundColor Cyan
Write-Host "Source Directory: $SourceDir" -ForegroundColor Yellow
Write-Host "Mode: $(if($DryRun){'DRY RUN - No changes will be made'}else{'LIVE - Files will be modified'})" -ForegroundColor $(if($DryRun){'Yellow'}else{'Red'})
Write-Host ""

$files = Get-ChildItem -Path $SourceDir -Recurse -Filter "*.ts" | Where-Object { 
    $_.Name -notlike "*.spec.ts" -and 
    $_.Name -notlike "*.d.ts" -and
    $_.Name -notlike "*.js" -and
    $_.Name -notlike "*.map"
}

$fixedCount = 0
$totalFiles = $files.Count

Write-Host "Found $totalFiles TypeScript files to scan" -ForegroundColor Cyan
Write-Host ""

foreach($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Skip empty files
    if([string]::IsNullOrWhiteSpace($content)) {
        continue
    }
    
    $lines = $content -split "`r?`n"
    
    # Find all import statements
    $importLines = @()
    $firstImportIdx = -1
    $lastImportIdx = -1
    
    for($i = 0; $i -lt $lines.Count; $i++) {
        if($lines[$i] -match "^import\s+" -or $lines[$i] -match "^export\s+.*\s+from") {
            if($firstImportIdx -eq -1) {
                $firstImportIdx = $i
            }
            $lastImportIdx = $i
            $importLines += $i
        }
    }
    
    # Find duplicate section (second set of imports)
    $duplicateStartIdx = -1
    for($i = $lastImportIdx + 1; $i -lt $lines.Count; $i++) {
        if($lines[$i] -match "^import\s+" -or $lines[$i] -match "^export\s+.*\s+from") {
            $duplicateStartIdx = $i
            break
        }
    }
    
    if($duplicateStartIdx -gt -1) {
        $relativePath = $file.FullName.Replace((Get-Location).Path, "").TrimStart('\')
        Write-Host "[DUPLICATE FOUND] $relativePath" -ForegroundColor Red
        Write-Host "  First section: lines 1-$lastImportIdx" -ForegroundColor Gray
        Write-Host "  Duplicate starts: line $duplicateStartIdx" -ForegroundColor Gray
        
        if(-not $DryRun) {
            # Keep only the first section (before duplicate)
            $cleanedLines = $lines[0..$lastImportIdx]
            
            # Find the last non-empty line in the cleaned section
            $lastNonEmpty = $lastImportIdx
            for($i = $lastImportIdx; $i -ge 0; $i--) {
                if(-not [string]::IsNullOrWhiteSpace($lines[$i])) {
                    $lastNonEmpty = $i
                    break
                }
            }
            
            # Write cleaned content
            $cleanedContent = ($cleanedLines[0..$lastNonEmpty] -join "`n") + "`n"
            [System.IO.File]::WriteAllText($file.FullName, $cleanedContent, [System.Text.UTF8Encoding]::new($false))
            
            Write-Host "  [FIXED] Removed duplicate section" -ForegroundColor Green
            $fixedCount++
        } else {
            Write-Host "  [DRY RUN] Would remove lines $duplicateStartIdx-$($lines.Count)" -ForegroundColor Yellow
        }
        Write-Host ""
    }
}

Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Files scanned: $totalFiles" -ForegroundColor White
Write-Host "Files with duplicates: $fixedCount" -ForegroundColor $(if($fixedCount -gt 0){'Yellow'}else{'Green'})
if($DryRun) {
    Write-Host "Mode: DRY RUN - Run without -DryRun to apply fixes" -ForegroundColor Yellow
} else {
    Write-Host "Mode: LIVE - Changes applied" -ForegroundColor Green
}
