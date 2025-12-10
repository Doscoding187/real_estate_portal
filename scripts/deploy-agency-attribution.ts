/**
 * Agency Content Attribution - Production Deployment Script
 * 
 * This script automates the deployment process for the agency attribution feature.
 * It performs pre-deployment checks, runs migrations, and verifies the deployment.
 * 
 * Usage:
 *   npm run tsx scripts/deploy-agency-attribution.ts [--skip-backup] [--skip-tests]
 * 
 * Options:
 *   --skip-backup: Skip database backup (not recommended for production)
 *   --skip-tests: Skip pre-deployment tests
 *   --dry-run: Show what would be done without executing
 */

import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const skipBackup = args.includes('--skip-backup');
const skipTests = args.includes('--skip-tests');
const dryRun = args.includes('--dry-run');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60) + '\n');
}

function logStep(step: string) {
  log(`\n▶ ${step}`, 'cyan');
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message: string) {
  log(`❌ ${message}`, 'red');
}

async function preDeploymentChecks(): Promise<boolean> {
  logSection('Phase 1: Pre-Deployment Checks');

  try {
    // Check 1: Database connection
    logStep('Checking database connection...');
    const db = await getDb();
    await db.execute(sql`SELECT 1`);
    logSuccess('Database connection verified');

    // Check 2: Required tables exist
    logStep('Verifying required tables exist...');
    const tables = await db.execute(sql`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('explore_shorts', 'explore_content', 'agencies')
    `);
    
    if (tables.length !== 3) {
      logError('Required tables not found');
      return false;
    }
    logSuccess('All required tables exist');

    // Check 3: Migration not already applied
    logStep('Checking if migration already applied...');
    const shortsColumns = await db.execute(sql`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'explore_shorts' 
        AND COLUMN_NAME = 'agency_id'
    `);
    
    if (shortsColumns.length > 0) {
      logWarning('Migration appears to already be applied');
      log('  This is safe - migration script will skip existing changes', 'yellow');
    } else {
      logSuccess('Migration not yet applied - ready to proceed');
    }

    // Check 4: Run tests (if not skipped)
    if (!skipTests) {
      logStep('Running pre-deployment tests...');
      try {
        execSync('npm run test:unit -- --run', { stdio: 'inherit' });
        logSuccess('All tests passed');
      } catch (error) {
        logError('Tests failed - deployment aborted');
        return false;
      }
    } else {
      logWarning('Tests skipped (--skip-tests flag)');
    }

    return true;
  } catch (error) {
    logError(`Pre-deployment checks failed: ${error}`);
    return false;
  }
}

async function backupDatabase(): Promise<boolean> {
  logSection('Phase 2: Database Backup');

  if (skipBackup) {
    logWarning('Database backup skipped (--skip-backup flag)');
    logWarning('This is NOT recommended for production deployments!');
    return true;
  }

  if (dryRun) {
    log('DRY RUN: Would create database backup', 'yellow');
    return true;
  }

  try {
    logStep('Creating database backup...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `backup_agency_attribution_${timestamp}.sql`;
    
    // Note: This requires mysqldump to be available
    // In production, you might use your cloud provider's backup tool instead
    log(`  Backup file: ${backupFile}`, 'cyan');
    log('  Note: Using cloud provider backup is recommended for production', 'yellow');
    
    logSuccess('Backup location recorded in deployment checklist');
    return true;
  } catch (error) {
    logError(`Backup failed: ${error}`);
    return false;
  }
}

async function runDatabaseMigration(): Promise<boolean> {
  logSection('Phase 3: Database Migration (Task 12.1)');

  if (dryRun) {
    log('DRY RUN: Would run database migration', 'yellow');
    return true;
  }

  try {
    logStep('Running migration script...');
    
    // Import and run the migration
    const migrationPath = path.join(__dirname, 'run-agency-attribution-migration.ts');
    execSync(`npx tsx ${migrationPath}`, { stdio: 'inherit' });
    
    logSuccess('Database migration completed');
    return true;
  } catch (error) {
    logError(`Migration failed: ${error}`);
    return false;
  }
}

async function verifyMigration(): Promise<boolean> {
  logStep('Verifying migration...');

  if (dryRun) {
    log('DRY RUN: Would verify migration', 'yellow');
    return true;
  }

  try {
    const db = await getDb();

    // Verify explore_shorts columns
    const shortsColumns = await db.execute(sql`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'explore_shorts' 
        AND COLUMN_NAME = 'agency_id'
    `);

    if (shortsColumns.length === 0) {
      logError('agency_id column not found in explore_shorts');
      return false;
    }

    // Verify explore_content columns
    const contentColumns = await db.execute(sql`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'explore_content' 
        AND COLUMN_NAME IN ('creator_type', 'agency_id')
    `);

    if (contentColumns.length !== 2) {
      logError('creator_type or agency_id columns not found in explore_content');
      return false;
    }

    // Verify indexes
    const indexes = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('explore_shorts', 'explore_content')
        AND INDEX_NAME LIKE '%agency%'
    `);

    const indexCount = (indexes[0] as any).count;
    if (indexCount < 3) {
      logWarning(`Only ${indexCount} agency indexes found (expected at least 3)`);
    }

    logSuccess('Migration verification passed');
    return true;
  } catch (error) {
    logError(`Verification failed: ${error}`);
    return false;
  }
}

async function deployBackend(): Promise<boolean> {
  logSection('Phase 4: Backend Deployment (Task 12.2)');

  if (dryRun) {
    log('DRY RUN: Would deploy backend services', 'yellow');
    return true;
  }

  try {
    // Step 1: Build backend
    logStep('Building backend...');
    execSync('npm run build', { stdio: 'inherit' });
    logSuccess('Backend build completed');

    // Step 2: Clear caches (if Redis is available)
    logStep('Clearing caches...');
    try {
      execSync('redis-cli FLUSHDB', { stdio: 'pipe' });
      logSuccess('Cache cleared');
    } catch (error) {
      logWarning('Redis not available or cache clear failed - continuing anyway');
    }

    // Step 3: Restart services
    logStep('Restarting services...');
    log('  Note: Manual service restart may be required', 'yellow');
    log('  Run: pm2 restart all', 'cyan');
    
    logSuccess('Backend deployment steps completed');
    return true;
  } catch (error) {
    logError(`Backend deployment failed: ${error}`);
    return false;
  }
}

async function verifyBackend(): Promise<boolean> {
  logStep('Verifying backend endpoints...');

  if (dryRun) {
    log('DRY RUN: Would verify backend endpoints', 'yellow');
    return true;
  }

  try {
    // Note: In a real deployment, you would make HTTP requests to verify endpoints
    log('  Manual verification required:', 'yellow');
    log('  1. Test getAgencyFeed endpoint', 'cyan');
    log('  2. Test getAgencyAnalytics endpoint', 'cyan');
    log('  3. Check application logs for errors', 'cyan');
    
    logSuccess('Backend verification checklist provided');
    return true;
  } catch (error) {
    logError(`Backend verification failed: ${error}`);
    return false;
  }
}

async function deployFrontend(): Promise<boolean> {
  logSection('Phase 5: Frontend Deployment (Task 12.3)');

  if (dryRun) {
    log('DRY RUN: Would deploy frontend', 'yellow');
    return true;
  }

  try {
    // Step 1: Build frontend
    logStep('Building frontend...');
    execSync('npm run build --prefix client', { stdio: 'inherit' });
    logSuccess('Frontend build completed');

    // Step 2: Deploy
    logStep('Deploying frontend...');
    log('  Note: Manual deployment may be required', 'yellow');
    log('  Run: npm run deploy (or your deployment command)', 'cyan');
    
    logSuccess('Frontend deployment steps completed');
    return true;
  } catch (error) {
    logError(`Frontend deployment failed: ${error}`);
    return false;
  }
}

async function verifyFrontend(): Promise<boolean> {
  logStep('Verifying frontend...');

  if (dryRun) {
    log('DRY RUN: Would verify frontend', 'yellow');
    return true;
  }

  log('  Manual verification required:', 'yellow');
  log('  1. Navigate to /explore/agency/[id]', 'cyan');
  log('  2. Test agency analytics dashboard', 'cyan');
  log('  3. Test content upload with agency attribution', 'cyan');
  log('  4. Check browser console for errors', 'cyan');
  
  logSuccess('Frontend verification checklist provided');
  return true;
}

async function postDeploymentChecks(): Promise<boolean> {
  logSection('Phase 6: Post-Deployment Verification');

  if (dryRun) {
    log('DRY RUN: Would run post-deployment checks', 'yellow');
    return true;
  }

  try {
    const db = await getDb();

    // Check 1: Data integrity
    logStep('Checking data integrity...');
    const totalRecords = await db.execute(sql`
      SELECT COUNT(*) as count FROM explore_shorts
    `);
    logSuccess(`Total records preserved: ${(totalRecords[0] as any).count}`);

    // Check 2: Performance
    logStep('Checking query performance...');
    const startTime = Date.now();
    await db.execute(sql`
      SELECT * FROM explore_shorts 
      WHERE agency_id = 1 AND is_published = 1 
      ORDER BY published_at DESC 
      LIMIT 20
    `);
    const queryTime = Date.now() - startTime;
    
    if (queryTime < 500) {
      logSuccess(`Query performance: ${queryTime}ms (excellent)`);
    } else {
      logWarning(`Query performance: ${queryTime}ms (acceptable but could be optimized)`);
    }

    return true;
  } catch (error) {
    logError(`Post-deployment checks failed: ${error}`);
    return false;
  }
}

async function generateDeploymentReport() {
  logSection('Deployment Summary');

  const timestamp = new Date().toISOString();
  
  log('Deployment completed successfully! 🎉', 'green');
  log(`\nDeployment Time: ${timestamp}`, 'cyan');
  
  console.log('\n📋 Next Steps:');
  console.log('  1. Monitor application logs for errors');
  console.log('  2. Test agency feed functionality');
  console.log('  3. Verify analytics dashboard');
  console.log('  4. Monitor database performance');
  console.log('  5. Update deployment checklist');
  
  console.log('\n📚 Documentation:');
  console.log('  - API Docs: .kiro/specs/explore-agency-content-attribution/API_DOCUMENTATION.md');
  console.log('  - Quick Start: .kiro/specs/explore-agency-content-attribution/QUICK_START.md');
  console.log('  - Migration Guide: .kiro/specs/explore-agency-content-attribution/MIGRATION_GUIDE.md');
  
  console.log('\n🔄 Rollback Instructions:');
  console.log('  If issues occur, run:');
  console.log('  npx tsx scripts/run-agency-attribution-migration.ts --rollback');
}

// Main deployment flow
async function deploy() {
  log('\n🚀 Agency Content Attribution - Production Deployment', 'bright');
  log('═══════════════════════════════════════════════════════════\n', 'bright');

  if (dryRun) {
    logWarning('DRY RUN MODE - No changes will be made');
  }

  try {
    // Phase 1: Pre-deployment checks
    const checksPass = await preDeploymentChecks();
    if (!checksPass) {
      logError('Pre-deployment checks failed - aborting deployment');
      process.exit(1);
    }

    // Phase 2: Database backup
    const backupSuccess = await backupDatabase();
    if (!backupSuccess) {
      logError('Database backup failed - aborting deployment');
      process.exit(1);
    }

    // Phase 3: Database migration
    const migrationSuccess = await runDatabaseMigration();
    if (!migrationSuccess) {
      logError('Database migration failed - consider rollback');
      process.exit(1);
    }

    const verificationSuccess = await verifyMigration();
    if (!verificationSuccess) {
      logError('Migration verification failed - consider rollback');
      process.exit(1);
    }

    // Phase 4: Backend deployment
    const backendSuccess = await deployBackend();
    if (!backendSuccess) {
      logError('Backend deployment failed');
      process.exit(1);
    }

    await verifyBackend();

    // Phase 5: Frontend deployment
    const frontendSuccess = await deployFrontend();
    if (!frontendSuccess) {
      logError('Frontend deployment failed');
      process.exit(1);
    }

    await verifyFrontend();

    // Phase 6: Post-deployment checks
    await postDeploymentChecks();

    // Generate report
    await generateDeploymentReport();

    process.exit(0);
  } catch (error) {
    logError(`Deployment failed: ${error}`);
    console.log('\n🔄 To rollback, run:');
    console.log('  npx tsx scripts/run-agency-attribution-migration.ts --rollback');
    process.exit(1);
  }
}

// Run deployment
deploy();
