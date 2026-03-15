# ============================================
# DEPRECATED - DO NOT USE
# ============================================
# This project uses Azure Container Registry (Docker Cloud)
# DO NOT use Docker Desktop or WSL workarounds
#
# Use these commands instead:
#   npm run cloud:login   # az acr login --name acrquestionnaireprod
#   npm run cloud:build   # Build image for ACR
#   npm run cloud:push    # Push to Azure Container Registry
#   npm run cloud:deploy  # Deploy to Azure Container Apps
#   npm run cloud:all     # Full deployment pipeline
#
# Production URLs:
#   API: https://ca-questionnaire-api-prod.wittyriver-206156ea.australiasoutheast.azurecontainerapps.io
#   Web: https://ca-questionnaire-web-prod.wittyriver-206156ea.australiasoutheast.azurecontainerapps.io
# ============================================

Write-Host "ERROR: This script is DEPRECATED." -ForegroundColor Red
Write-Host ""
Write-Host "This project uses Azure Container Registry (Docker Cloud)." -ForegroundColor Yellow
Write-Host "DO NOT use Docker Desktop or WSL workarounds." -ForegroundColor Yellow
Write-Host ""
Write-Host "Use these commands instead:" -ForegroundColor Cyan
Write-Host "  npm run cloud:login   - Login to Azure Container Registry"
Write-Host "  npm run cloud:build   - Build Docker image for ACR"
Write-Host "  npm run cloud:push    - Push image to ACR"
Write-Host "  npm run cloud:deploy  - Deploy to Azure Container Apps"
Write-Host "  npm run cloud:all     - Full deployment pipeline"
Write-Host ""
Write-Host "Production URLs:" -ForegroundColor Green
Write-Host "  API: https://ca-questionnaire-api-prod.wittyriver-206156ea.australiasoutheast.azurecontainerapps.io"
Write-Host "  Web: https://ca-questionnaire-web-prod.wittyriver-206156ea.australiasoutheast.azurecontainerapps.io"

exit 1
