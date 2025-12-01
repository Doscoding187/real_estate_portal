# Setup Explore Feed
# This script runs migrations and seeds sample data for the Explore feature

Write-Host "🚀 Setting up Explore Feed..." -ForegroundColor Cyan
Write-Host ""

# Run migrations
Write-Host "📦 Running migrations..." -ForegroundColor Yellow
tsx scripts/run-explore-shorts-migration.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Seed highlight tags
Write-Host "🏷️  Seeding highlight tags..." -ForegroundColor Yellow
tsx scripts/seed-explore-highlight-tags.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Seeding highlight tags failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Seed sample shorts
Write-Host "📸 Seeding sample explore shorts..." -ForegroundColor Yellow
tsx scripts/seed-explore-shorts-sample.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Seeding sample shorts failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Explore Feed setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now:" -ForegroundColor Cyan
Write-Host "  1. Visit /explore to view the feed" -ForegroundColor White
Write-Host "  2. Visit /explore/upload to upload new content" -ForegroundColor White
Write-Host "  3. Click 'Upload' buttons in dashboards" -ForegroundColor White
