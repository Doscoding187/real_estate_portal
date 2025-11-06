# ================================================
# Phase 7: Explore Feed - Quick Setup Script
# ================================================
# Automates the setup process for testing Explore Feed
# Run this script from the project root directory

Write-Host "`n" -NoNewline
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Phase 7: Explore Feed - Quick Setup" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "`n"

# Change to project directory
$ProjectRoot = "C:\Users\Edward\Dropbox\PC\Desktop\real_estate_portal"
Set-Location $ProjectRoot

# Display setup menu
Write-Host "What would you like to do?" -ForegroundColor Yellow
Write-Host "1. Run database migrations (create tables)" -ForegroundColor White
Write-Host "2. Seed sample data (videos, provinces, cities)" -ForegroundColor White
Write-Host "3. Start development server" -ForegroundColor White
Write-Host "4. Full setup (migrations + seed + start server)" -ForegroundColor White
Write-Host "5. View testing guide" -ForegroundColor White
Write-Host "6. Exit" -ForegroundColor White
Write-Host "`n"

$choice = Read-Host "Enter your choice (1-6)"

switch ($choice) {
    "1" {
        Write-Host "`nRunning database migrations..." -ForegroundColor Green
        Write-Host "Please run the following SQL scripts in MySQL Workbench:" -ForegroundColor Yellow
        Write-Host "  1. migrations/create-explore-feed-tables.sql" -ForegroundColor Cyan
        Write-Host "`n"
        Write-Host "Press Enter after running the migration in MySQL Workbench..."
        Read-Host
        Write-Host "✅ Migrations completed!" -ForegroundColor Green
    }

    "2" {
        Write-Host "`nSeeding sample data..." -ForegroundColor Green
        Write-Host "Please run the following SQL script in MySQL Workbench:" -ForegroundColor Yellow
        Write-Host "  migrations/seed-explore-feed-data.sql" -ForegroundColor Cyan
        Write-Host "`n"
        Write-Host "Press Enter after running the seed script in MySQL Workbench..."
        Read-Host
        Write-Host "✅ Sample data seeded!" -ForegroundColor Green
    }

    "3" {
        Write-Host "`nStarting development server..." -ForegroundColor Green
        Write-Host "Killing existing node processes..." -ForegroundColor Yellow
        Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
        Start-Sleep -Seconds 2
        
        Write-Host "Starting server on http://localhost:3000" -ForegroundColor Cyan
        Write-Host "`n"
        pnpm dev
    }

    "4" {
        Write-Host "`n🚀 Full Setup Process Starting..." -ForegroundColor Green
        Write-Host "`n"

        # Step 1: Migrations
        Write-Host "Step 1/3: Database Migrations" -ForegroundColor Cyan
        Write-Host "Please run these SQL scripts in MySQL Workbench:" -ForegroundColor Yellow
        Write-Host "  1. migrations/create-explore-feed-tables.sql" -ForegroundColor White
        Write-Host "`n"
        Write-Host "Press Enter after running migrations..."
        Read-Host
        Write-Host "✅ Migrations completed!" -ForegroundColor Green
        Write-Host "`n"

        # Step 2: Seed Data
        Write-Host "Step 2/3: Seed Sample Data" -ForegroundColor Cyan
        Write-Host "Please run this SQL script in MySQL Workbench:" -ForegroundColor Yellow
        Write-Host "  migrations/seed-explore-feed-data.sql" -ForegroundColor White
        Write-Host "`n"
        Write-Host "Press Enter after running seed script..."
        Read-Host
        Write-Host "✅ Sample data seeded!" -ForegroundColor Green
        Write-Host "`n"

        # Step 3: Start Server
        Write-Host "Step 3/3: Starting Development Server" -ForegroundColor Cyan
        Write-Host "Killing existing node processes..." -ForegroundColor Yellow
        Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
        Start-Sleep -Seconds 2
        
        Write-Host "`n"
        Write-Host "✅ Setup Complete! Starting server..." -ForegroundColor Green
        Write-Host "`n"
        Write-Host "=============================================" -ForegroundColor Cyan
        Write-Host "  Server will start on: http://localhost:3000" -ForegroundColor Yellow
        Write-Host "  Explore Feed: http://localhost:3000/explore" -ForegroundColor Yellow
        Write-Host "=============================================" -ForegroundColor Cyan
        Write-Host "`n"
        
        pnpm dev
    }

    "5" {
        Write-Host "`nOpening testing guide..." -ForegroundColor Green
        $testingGuide = Join-Path $ProjectRoot "TESTING_EXPLORE_FEED.md"
        if (Test-Path $testingGuide) {
            notepad $testingGuide
            Write-Host "✅ Testing guide opened in Notepad" -ForegroundColor Green
        } else {
            Write-Host "❌ Testing guide not found at: $testingGuide" -ForegroundColor Red
        }
    }

    "6" {
        Write-Host "`nExiting..." -ForegroundColor Yellow
        exit
    }

    default {
        Write-Host "`n❌ Invalid choice. Please run the script again." -ForegroundColor Red
    }
}

Write-Host "`n"
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Need Help?" -ForegroundColor Yellow
Write-Host "  - Check TESTING_EXPLORE_FEED.md for detailed testing steps" -ForegroundColor White
Write-Host "  - Check PHASE7_EXPLORE_FEED_GUIDE.md for feature documentation" -ForegroundColor White
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "`n"

Read-Host "Press Enter to exit"
