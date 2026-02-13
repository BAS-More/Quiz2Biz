Write-Host "Fixing ALL trailing import duplicates..." -ForegroundColor Cyan

$files = @(
    "apps\api\src\common\interceptors\logging.interceptor.ts",
    "apps\api\src\common\interceptors\transform.interceptor.ts",
    "apps\api\src\modules\questionnaire\questionnaire.controller.ts",
    "apps\api\src\modules\session\session.controller.ts",
    "apps\api\src\modules\session\session.service.ts",
    "apps\api\src\modules\standards\standards.controller.ts",
    "apps\api\src\modules\users\users.controller.ts"
)

$fixed = 0
foreach($file in $files) {
    $fullPath = Join-Path $PSScriptRoot "..\$file"
    if(Test-Path $fullPath) {
        $content = Get-Content $fullPath -Raw
        
        # Remove trailing imports after closing brace
        $pattern = '(}\r?\n)\s*import\s+\{[^}]+\}\s+from\s+[''"][^''"]+[''"]\s*;\s*$'
        if($content -match $pattern) {
            $newContent = $content -replace $pattern, '$1'
            Set-Content -Path $fullPath -Value $newContent -NoNewline
            Write-Host "  ✓ Fixed: $file" -ForegroundColor Green
            $fixed++
        } else {
            Write-Host "  - Skipped: $file (already clean)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ✗ Not found: $file" -ForegroundColor Red
    }
}

Write-Host "`nFixed $fixed files" -ForegroundColor $(if($fixed -gt 0){'Green'}else{'Yellow'})
