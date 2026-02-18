# Authentication E2E Test Script
# Tests complete authentication flow: register, login, token refresh, logout

$ErrorActionPreference = "Continue"
$baseUrl = "https://api.quiz2biz.com/api/v1"
$timestamp = (Get-Date).ToString("yyyyMMddHHmmss")
$testEmail = "test$timestamp@quiz2biz.test"
$testPassword = "Test123!Pass"
$testName = "E2E Test User"

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "AUTHENTICATION E2E TEST SUITE" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Store test results
$results = @{
    registration = $false
    login = $false
    tokenRefresh = $false
    getCurrentUser = $false
    logout = $false
}

$tokens = @{
    accessToken = $null
    refreshToken = $null
}

# Test 1: Registration
Write-Host "TEST 1: User Registration" -ForegroundColor Yellow
Write-Host "  Email: $testEmail" -ForegroundColor Gray
try {
    $body = @{
        email = $testEmail
        password = $testPassword
        name = $testName
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/register" `
        -Method Post -Body $body -ContentType "application/json"
    
    $tokens.accessToken = $response.accessToken
    $tokens.refreshToken = $response.refreshToken
    
    Write-Host "  ✓ SUCCESS" -ForegroundColor Green
    Write-Host "    User ID: $($response.user.id)" -ForegroundColor Gray
    Write-Host "    Email Verified: $($response.user.emailVerified)" -ForegroundColor Gray
    Write-Host "    Access Token: $($tokens.accessToken.Substring(0,20))..." -ForegroundColor Gray
    $results.registration = $true
} catch {
    Write-Host "  ✗ FAILED" -ForegroundColor Red
    Write-Host "    Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "    Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

# Test 2: Duplicate Registration (should fail)
Write-Host "`nTEST 2: Duplicate Registration (Expected to Fail)" -ForegroundColor Yellow
try {
    $body = @{
        email = $testEmail
        password = $testPassword
        name = $testName
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "$baseUrl/auth/register" `
        -Method Post -Body $body -ContentType "application/json" | Out-Null
    
    Write-Host "  ✗ FAILED - Should have rejected duplicate" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 409) {
        Write-Host "  ✓ SUCCESS - Correctly rejected duplicate (409 Conflict)" -ForegroundColor Green
    } else {
        Write-Host "  ? UNEXPECTED - Got status $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    }
}

# Test 3: Login with correct credentials
Write-Host "`nTEST 3: Login with Valid Credentials" -ForegroundColor Yellow
try {
    $body = @{
        email = $testEmail
        password = $testPassword
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method Post -Body $body -ContentType "application/json"
    
    $tokens.accessToken = $response.accessToken
    $tokens.refreshToken = $response.refreshToken
    
    Write-Host "  ✓ SUCCESS" -ForegroundColor Green
    Write-Host "    New Access Token: $($tokens.accessToken.Substring(0,20))..." -ForegroundColor Gray
    $results.login = $true
} catch {
    Write-Host "  ✗ FAILED" -ForegroundColor Red
    Write-Host "    Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "    Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

# Test 4: Login with wrong password (should fail)
Write-Host "`nTEST 4: Login with Invalid Password (Expected to Fail)" -ForegroundColor Yellow
try {
    $body = @{
        email = $testEmail
        password = "WrongPassword123!"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method Post -Body $body -ContentType "application/json" | Out-Null
    
    Write-Host "  ✗ FAILED - Should have rejected invalid credentials" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "  ✓ SUCCESS - Correctly rejected (401 Unauthorized)" -ForegroundColor Green
    } else {
        Write-Host "  ? UNEXPECTED - Got status $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    }
}

# Test 5: Get current user with access token
Write-Host "`nTEST 5: Get Current User (Protected Endpoint)" -ForegroundColor Yellow
if ($tokens.accessToken) {
    try {
        $headers = @{
            Authorization = "Bearer $($tokens.accessToken)"
        }
        
        $user = Invoke-RestMethod -Uri "$baseUrl/auth/me" `
            -Method Get -Headers $headers
        
        Write-Host "  ✓ SUCCESS" -ForegroundColor Green
        Write-Host "    User ID: $($user.id)" -ForegroundColor Gray
        Write-Host "    Email: $($user.email)" -ForegroundColor Gray
        Write-Host "    Role: $($user.role)" -ForegroundColor Gray
        $results.getCurrentUser = $true
    } catch {
        Write-Host "  ✗ FAILED" -ForegroundColor Red
        Write-Host "    Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
} else {
    Write-Host "  ⊘ SKIPPED - No access token available" -ForegroundColor Gray
}

# Test 6: Refresh access token
Write-Host "`nTEST 6: Token Refresh" -ForegroundColor Yellow
if ($tokens.refreshToken) {
    try {
        $body = @{
            refreshToken = $tokens.refreshToken
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$baseUrl/auth/refresh" `
            -Method Post -Body $body -ContentType "application/json"
        
        $oldToken = $tokens.accessToken
        $tokens.accessToken = $response.accessToken
        
        Write-Host "  ✓ SUCCESS" -ForegroundColor Green
        Write-Host "    New Token: $($tokens.accessToken.Substring(0,20))..." -ForegroundColor Gray
        Write-Host "    Token Changed: $($oldToken -ne $tokens.accessToken)" -ForegroundColor Gray
        $results.tokenRefresh = $true
    } catch {
        Write-Host "  ✗ FAILED" -ForegroundColor Red
        Write-Host "    Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
} else {
    Write-Host "  ⊘ SKIPPED - No refresh token available" -ForegroundColor Gray
}

# Test 7: Logout
Write-Host "`nTEST 7: Logout" -ForegroundColor Yellow
if ($tokens.refreshToken) {
    try {
        $body = @{
            refreshToken = $tokens.refreshToken
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri "$baseUrl/auth/logout" `
            -Method Post -Body $body -ContentType "application/json" | Out-Null
        
        Write-Host "  ✓ SUCCESS" -ForegroundColor Green
        $results.logout = $true
    } catch {
        Write-Host "  ✗ FAILED" -ForegroundColor Red
        Write-Host "    Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
} else {
    Write-Host "  ⊘ SKIPPED - No refresh token available" -ForegroundColor Gray
}

# Test 8: Verify token invalidated after logout
Write-Host "`nTEST 8: Verify Token Invalidated After Logout" -ForegroundColor Yellow
if ($tokens.accessToken -and $results.logout) {
    try {
        $headers = @{
            Authorization = "Bearer $($tokens.accessToken)"
        }
        
        Invoke-RestMethod -Uri "$baseUrl/auth/me" `
            -Method Get -Headers $headers | Out-Null
        
        Write-Host "  ✗ FAILED - Token should be invalid" -ForegroundColor Red
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 401) {
            Write-Host "  ✓ SUCCESS - Token correctly invalidated" -ForegroundColor Green
        } else {
            Write-Host "  ? UNEXPECTED - Got status $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  ⊘ SKIPPED - Prerequisites not met" -ForegroundColor Gray
}

# Summary
Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

$totalTests = $results.Count
$passedTests = ($results.Values | Where-Object { $_ -eq $true }).Count
$successRate = [math]::Round(($passedTests / $totalTests) * 100, 1)

Write-Host "Total Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $($totalTests - $passedTests)" -ForegroundColor Red
Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } else { "Yellow" })

Write-Host "`nDetailed Results:" -ForegroundColor White
foreach ($test in $results.GetEnumerator()) {
    $status = if ($test.Value) { "✓ PASS" } else { "✗ FAIL" }
    $color = if ($test.Value) { "Green" } else { "Red" }
    Write-Host "  $($test.Key): $status" -ForegroundColor $color
}

Write-Host "`n================================`n" -ForegroundColor Cyan
