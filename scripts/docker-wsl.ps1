# Docker WSL Workaround Script
# Use this when Docker Desktop's Windows integration is not working
# Source: Docker Desktop named pipe communication issue

Write-Host "Setting up Docker via WSL workaround..." -ForegroundColor Cyan

# Create functions that route Docker commands through WSL Ubuntu
function global:docker {
    wsl -d Ubuntu -e docker $args
}

function global:docker-compose {
    # Convert Windows paths to WSL paths if needed
    $wslArgs = $args | ForEach-Object {
        if ($_ -match '^[A-Za-z]:') {
            # Convert Windows path to WSL path
            $_ -replace '^([A-Za-z]):', '/mnt/$1'.ToLower() -replace '\\', '/'
        } else {
            $_
        }
    }
    wsl -d Ubuntu -e docker compose $wslArgs
}

# Test the connection
Write-Host "`nTesting Docker connection..." -ForegroundColor Yellow
try {
    $version = wsl -d Ubuntu -e docker version --format '{{.Server.Version}}' 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Docker Server: $version" -ForegroundColor Green
        Write-Host "Docker is now accessible via WSL!" -ForegroundColor Green
    } else {
        Write-Host "Docker not responding in WSL" -ForegroundColor Red
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`nUsage:" -ForegroundColor Cyan
Write-Host "  docker ps              - List containers"
Write-Host "  docker-compose up -d   - Start services"
Write-Host "  docker-compose down    - Stop services"
