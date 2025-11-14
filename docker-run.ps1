# PowerShell script to build and run Docker container

Write-Host "Checking Docker status..." -ForegroundColor Cyan

# Check if Docker is running
$errorActionPreference = 'SilentlyContinue'
$dockerOutput = docker ps 2>&1
$dockerRunning = $?
$errorActionPreference = 'Continue'

if (-not $dockerRunning) {
    Write-Host "ERROR: Docker Desktop is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
    Write-Host "`nTo start Docker Desktop:" -ForegroundColor Yellow
    Write-Host "1. Open Docker Desktop application" -ForegroundColor Yellow
    Write-Host "2. Wait for it to fully start (whale icon in system tray)" -ForegroundColor Yellow
    Write-Host "3. Run this script again" -ForegroundColor Yellow
    exit 1
}

Write-Host "Docker is running!" -ForegroundColor Green

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "`nWARNING: .env.local file not found!" -ForegroundColor Yellow
    Write-Host "Please create .env.local with your environment variables." -ForegroundColor Yellow
    exit 1
}

Write-Host "Found .env.local file" -ForegroundColor Green

# Load environment variables from .env.local for build
Write-Host "`nLoading environment variables from .env.local..." -ForegroundColor Cyan
Get-Content .env.local | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]*)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim().Trim('"').Trim("'")
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

Write-Host "`nBuilding Docker image..." -ForegroundColor Cyan
Write-Host "(Note: Environment variables from .env.local are loaded for build and runtime)" -ForegroundColor Gray
docker-compose build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nStarting Docker container..." -ForegroundColor Cyan
    docker-compose up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nDocker container is running!" -ForegroundColor Green
        Write-Host "Application is available at: http://localhost:3000" -ForegroundColor Green
        Write-Host "`nTo view logs, run: docker-compose logs -f" -ForegroundColor Yellow
        Write-Host "To stop the container, run: docker-compose down" -ForegroundColor Yellow
    } else {
        Write-Host "Failed to start container" -ForegroundColor Red
    }
} else {
    Write-Host "Failed to build image" -ForegroundColor Red
}

