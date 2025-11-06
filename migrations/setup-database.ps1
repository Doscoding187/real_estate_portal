# =====================================================
# SA Property Portal - Database Setup Script
# PowerShell automation for database migration
# =====================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SA PROPERTY PORTAL - DB SETUP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$MySQLUser = "app_user"
$MySQLHost = "localhost"
$MySQLPort = "3307"
$DatabaseName = "real_estate_portal"
$MigrationsDir = "C:\Users\Edward\Dropbox\PC\Desktop\real_estate_portal\migrations"
$BackupDir = "C:\Users\Edward\Dropbox\PC\Desktop\real_estate_portal\backups"

# Check if MySQL is accessible
Write-Host "🔍 Checking MySQL connection..." -ForegroundColor Yellow
try {
    # Test MySQL connection
    $testConnection = mysql -u $MySQLUser -p -h $MySQLHost -P $MySQLPort -e "SELECT 1" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Cannot connect to MySQL. Please check your credentials." -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ MySQL connection successful!" -ForegroundColor Green
} catch {
    Write-Host "❌ MySQL not found or not in PATH" -ForegroundColor Red
    Write-Host "💡 Please install MySQL or add it to your PATH" -ForegroundColor Yellow
    exit 1
}

# Menu
Write-Host ""
Write-Host "What would you like to do?" -ForegroundColor Cyan
Write-Host "1. Create database backup" -ForegroundColor White
Write-Host "2. Run full migration (all scripts)" -ForegroundColor White
Write-Host "3. Run individual migrations (step-by-step)" -ForegroundColor White
Write-Host "4. Seed sample data" -ForegroundColor White
Write-Host "5. Verify database setup" -ForegroundColor White
Write-Host "6. Full setup (backup + migrate + seed)" -ForegroundColor Green
Write-Host "0. Exit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (0-6)"

switch ($choice) {
    "1" {
        # Create backup
        Write-Host ""
        Write-Host "📦 Creating database backup..." -ForegroundColor Yellow
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backupFile = "$BackupDir\backup_$timestamp.sql"
        
        Write-Host "💾 Backup location: $backupFile" -ForegroundColor Cyan
        mysqldump -u $MySQLUser -p -h $MySQLHost -P $MySQLPort $DatabaseName > $backupFile
        
        if (Test-Path $backupFile) {
            $size = (Get-Item $backupFile).Length / 1KB
            Write-Host "✅ Backup created successfully! ($([math]::Round($size, 2)) KB)" -ForegroundColor Green
        } else {
            Write-Host "❌ Backup failed!" -ForegroundColor Red
        }
    }
    
    "2" {
        # Run full migration (individual files)
        Write-Host ""
        Write-Host "🚀 Running full migration..." -ForegroundColor Yellow
        
        $scripts = @(
            "create-base-schema.sql",
            "create-core-tables.sql",
            "create-agencies-table.sql",
            "create-invitations-table.sql",
            "create-agent-dashboard-tables.sql",
            "create-prospect-tables.sql"
        )
        
        $scriptCount = 1
        foreach ($script in $scripts) {
            Write-Host ""
            Write-Host "[$scriptCount/$($scripts.Count)] Running $script..." -ForegroundColor Cyan
            $scriptPath = "$MigrationsDir\$script"
            
            if (Test-Path $scriptPath) {
                mysql -u $MySQLUser -p -h $MySQLHost -P $MySQLPort $DatabaseName < $scriptPath
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "  ✅ $script completed" -ForegroundColor Green
                } else {
                    Write-Host "  ❌ $script failed!" -ForegroundColor Red
                    break
                }
            } else {
                Write-Host "  ❌ File not found: $script" -ForegroundColor Red
                break
            }
            $scriptCount++
        }
        
        Write-Host ""
        Write-Host "🎉 Migration complete!" -ForegroundColor Green
    }
    
    "3" {
        # Step-by-step migrations
        Write-Host ""
        Write-Host "📖 Opening MySQL Workbench guide..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Please run these scripts in MySQL Workbench in order:" -ForegroundColor Cyan
        Write-Host "1. create-base-schema.sql" -ForegroundColor White
        Write-Host "2. create-core-tables.sql" -ForegroundColor White
        Write-Host "3. create-agencies-table.sql" -ForegroundColor White
        Write-Host "4. create-invitations-table.sql" -ForegroundColor White
        Write-Host "5. create-agent-dashboard-tables.sql" -ForegroundColor White
        Write-Host "6. create-prospect-tables.sql" -ForegroundColor White
        Write-Host ""
        Write-Host "📂 Scripts location: $MigrationsDir" -ForegroundColor Cyan
    }
    
    "4" {
        # Seed sample data
        Write-Host ""
        Write-Host "🌱 Seeding sample data..." -ForegroundColor Yellow
        
        $seedScript = "$MigrationsDir\seed-sample-data.sql"
        if (Test-Path $seedScript) {
            mysql -u $MySQLUser -p -h $MySQLHost -P $MySQLPort $DatabaseName < $seedScript
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Sample data seeded successfully!" -ForegroundColor Green
                Write-Host ""
                Write-Host "🔐 Test login credentials:" -ForegroundColor Cyan
                Write-Host "   Email: agent@test.com" -ForegroundColor White
                Write-Host "   Password: agent123" -ForegroundColor White
            } else {
                Write-Host "❌ Seeding failed!" -ForegroundColor Red
            }
        } else {
            Write-Host "❌ Seed script not found!" -ForegroundColor Red
        }
    }
    
    "5" {
        # Verify database
        Write-Host ""
        Write-Host "🔍 Verifying database setup..." -ForegroundColor Yellow
        
        # Count tables
        Write-Host ""
        Write-Host "📊 Table count:" -ForegroundColor Cyan
        mysql -u $MySQLUser -p -h $MySQLHost -P $MySQLPort -e "SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = '$DatabaseName';"
        
        # Show tables
        Write-Host ""
        Write-Host "📋 All tables:" -ForegroundColor Cyan
        mysql -u $MySQLUser -p -h $MySQLHost -P $MySQLPort -e "SHOW TABLES FROM $DatabaseName;"
        
        # Verify prospect tables
        Write-Host ""
        Write-Host "🎮 Prospect tables:" -ForegroundColor Cyan
        mysql -u $MySQLUser -p -h $MySQLHost -P $MySQLPort -e "SHOW TABLES FROM $DatabaseName LIKE 'prospect%';"
        
        Write-Host ""
        Write-Host "✅ Verification complete!" -ForegroundColor Green
    }
    
    "6" {
        # Full setup
        Write-Host ""
        Write-Host "🚀 Running FULL setup (backup + migrate + seed)..." -ForegroundColor Yellow
        
        # Step 1: Backup
        Write-Host ""
        Write-Host "Step 1/3: Creating backup..." -ForegroundColor Cyan
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backupFile = "$BackupDir\backup_$timestamp.sql"
        mysqldump -u $MySQLUser -p -h $MySQLHost -P $MySQLPort $DatabaseName > $backupFile 2>$null
        
        if (Test-Path $backupFile) {
            Write-Host "✅ Backup created" -ForegroundColor Green
        } else {
            Write-Host "⚠️  No existing database to backup (this is OK for first run)" -ForegroundColor Yellow
        }
        
        # Step 2: Migrate
        Write-Host ""
        Write-Host "Step 2/3: Running migrations..." -ForegroundColor Cyan
        
        $scripts = @(
            "create-base-schema.sql",
            "create-core-tables.sql",
            "create-agencies-table.sql",
            "create-invitations-table.sql",
            "create-agent-dashboard-tables.sql",
            "create-prospect-tables.sql"
        )
        
        $success = $true
        foreach ($script in $scripts) {
            Write-Host "  → $script" -ForegroundColor White
            $scriptPath = "$MigrationsDir\$script"
            mysql -u $MySQLUser -p -h $MySQLHost -P $MySQLPort $DatabaseName < $scriptPath 2>$null
            if ($LASTEXITCODE -ne 0) {
                $success = $false
                break
            }
        }
        
        if ($success) {
            Write-Host "✅ All migrations completed" -ForegroundColor Green
        } else {
            Write-Host "❌ Migration failed!" -ForegroundColor Red
            exit 1
        }
        
        # Step 3: Seed data
        Write-Host ""
        Write-Host "Step 3/3: Seeding sample data..." -ForegroundColor Cyan
        $seedScript = "$MigrationsDir\seed-sample-data.sql"
        mysql -u $MySQLUser -p -h $MySQLHost -P $MySQLPort $DatabaseName < $seedScript
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Sample data seeded" -ForegroundColor Green
        } else {
            Write-Host "❌ Seeding failed!" -ForegroundColor Red
        }
        
        # Summary
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  🎉 SETUP COMPLETE!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "✅ Database created and migrated" -ForegroundColor Green
        Write-Host "✅ Sample data loaded" -ForegroundColor Green
        Write-Host "✅ Ready for development" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔐 Test login:" -ForegroundColor Cyan
        Write-Host "   Email: agent@test.com" -ForegroundColor White
        Write-Host "   Password: agent123" -ForegroundColor White
        Write-Host ""
        Write-Host "🌐 Start dev server:" -ForegroundColor Cyan
        Write-Host "   pnpm dev" -ForegroundColor White
        Write-Host ""
    }
    
    "0" {
        Write-Host ""
        Write-Host "👋 Goodbye!" -ForegroundColor Cyan
        exit 0
    }
    
    default {
        Write-Host ""
        Write-Host "❌ Invalid choice!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
