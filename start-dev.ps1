# PowerShell script to start the dev server with proper error handling
Write-Host "🚀 Starting Real Estate Portal Dev Server..." -ForegroundColor Cyan

# Stop any existing node processes
Write-Host "Stopping existing Node processes..." -ForegroundColor Yellow
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Set environment
$env:NODE_ENV = "development"

# Check if dependencies are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "❌ node_modules not found. Installing dependencies..." -ForegroundColor Red
    pnpm install
}

# Check for required files
if (-not (Test-Path "client/index.html")) {
    Write-Host "❌ client/index.html not found!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "client/src/main.tsx")) {
    Write-Host "❌ client/src/main.tsx not found!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "server/_core/index.ts")) {
    Write-Host "❌ server/_core/index.ts not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ All required files found" -ForegroundColor Green

# Try to start the server
Write-Host "`nStarting server on port 3000..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Gray

# Run the dev command
try {
    pnpm dev
} catch {
    Write-Host "`n❌ Error starting server:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

