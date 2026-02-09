$ErrorActionPreference = "SilentlyContinue"
$app = az containerapp show --name ca-questionnaire-api-prod --resource-group rg-questionnaire-prod -o json 2>$null | ConvertFrom-Json

Write-Host "=== CONTAINER APP ==="
Write-Host "Name: $($app.name)"
Write-Host "State: $($app.properties.provisioningState)"
Write-Host "Image: $($app.properties.template.containers[0].image)"
Write-Host "FQDN: $($app.properties.configuration.ingress.fqdn)"
Write-Host "Replicas: min=$($app.properties.template.scale.minReplicas) max=$($app.properties.template.scale.maxReplicas)"
Write-Host "Port: $($app.properties.configuration.ingress.targetPort)"
Write-Host ""

Write-Host "=== ENV VARS ($($app.properties.template.containers[0].env.Count)) ==="
$envNames = $app.properties.template.containers[0].env | ForEach-Object { $_.name }
$envNames | Sort-Object | ForEach-Object { Write-Host "  $_" }
Write-Host ""

$required = @(
    "NODE_ENV","PORT","API_PREFIX","DATABASE_URL","DATABASE_CONNECTION_LIMIT","DATABASE_POOL_TIMEOUT",
    "REDIS_HOST","REDIS_PORT","REDIS_PASSWORD",
    "JWT_SECRET","JWT_EXPIRES_IN","JWT_REFRESH_SECRET","JWT_REFRESH_EXPIRES_IN",
    "BCRYPT_ROUNDS","THROTTLE_TTL","THROTTLE_LIMIT","THROTTLE_LOGIN_LIMIT",
    "LOG_LEVEL","CORS_ORIGIN","FRONTEND_URL",
    "BREVO_API_KEY","EMAIL_FROM","EMAIL_FROM_NAME",
    "STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET","STRIPE_PRICE_PROFESSIONAL","STRIPE_PRICE_ENTERPRISE",
    "ENABLE_SWAGGER",
    "AZURE_STORAGE_CONNECTION_STRING","APPLICATIONINSIGHTS_CONNECTION_STRING"
)
Write-Host "=== REQUIRED VARS CHECK ==="
$missing = @()
foreach ($r in $required) {
    if ($envNames -contains $r) { Write-Host "  [OK] $r" }
    else { Write-Host "  [MISSING] $r"; $missing += $r }
}
Write-Host "Missing: $($missing.Count)"
Write-Host ""

Write-Host "=== SECRETS ==="
$app.properties.configuration.secrets | ForEach-Object { Write-Host "  $($_.name)" }
Write-Host ""

Write-Host "=== PROBES ==="
$probes = $app.properties.template.containers[0].probes
foreach ($p in $probes) { Write-Host "  $($p.type): $($p.httpGet.path) port=$($p.httpGet.port)" }
Write-Host ""

Write-Host "=== REVISIONS ==="
$revisions = az containerapp revision list --name ca-questionnaire-api-prod --resource-group rg-questionnaire-prod -o json 2>$null | ConvertFrom-Json
foreach ($rev in $revisions) { Write-Host "  $($rev.name) Active:$($rev.properties.active) State:$($rev.properties.runningState) Replicas:$($rev.properties.replicas)" }
Write-Host ""

Write-Host "=== ACR IMAGE ==="
$tags = az acr repository show-tags --name acrquestionnaireprod --repository quiz-api -o json 2>$null | ConvertFrom-Json
Write-Host "  Tags: $($tags -join ', ')"
