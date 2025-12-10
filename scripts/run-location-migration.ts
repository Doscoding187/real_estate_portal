/**
 * Master Script: Run complete location migration
 * Task: 19. Create data migration and sync scripts
 * 
 * This script orchestrates the complete migration process:
 * 1. Generate slugs for existing locations
 * 2. Sync locations to unified locations table
 * 3. (Optional) Migrate listings to use location_id
 * 4. Verify data integrity
 */

import { execSync } from 'child_process';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

function runScript(scriptPath: string, description: string): boolean {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${description}`);
  console.log(`${"=".repeat(60)}\n`);

  try {
    execSync(`npx tsx ${scriptPath}`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`\n❌ Script failed: ${scriptPath}`);
    return false;
  }
}

async function runMigration() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║        Google Places Location Migration Wizard             ║
║                                                            ║
║  This wizard will guide you through migrating your        ║
║  existing location data to the new unified structure.     ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);

  console.log(`
Migration Steps:
  1. Generate slugs for provinces, cities, and suburbs
  2. Sync data to unified locations table
  3. (Optional) Migrate listings to use location_id
  4. Verify data integrity

⚠️  IMPORTANT: This migration is safe to run multiple times.
   Existing data will be updated, not duplicated.

📋 Before proceeding, ensure:
   ✓ You have a database backup
   ✓ The Google Places migration has been run
   ✓ You have reviewed the migration scripts
  `);

  const proceed = await question('\nDo you want to proceed? (yes/no): ');
  
  if (proceed.toLowerCase() !== 'yes' && proceed.toLowerCase() !== 'y') {
    console.log('\n❌ Migration cancelled by user.\n');
    rl.close();
    process.exit(0);
  }

  // Step 1: Generate slugs
  console.log('\n📝 Step 1: Generating slugs...');
  const step1Success = runScript(
    'scripts/generate-location-slugs.ts',
    'STEP 1: Generate Location Slugs'
  );

  if (!step1Success) {
    console.log('\n❌ Migration failed at Step 1. Please fix errors and try again.\n');
    rl.close();
    process.exit(1);
  }

  // Step 2: Sync to locations table
  console.log('\n📝 Step 2: Syncing to locations table...');
  const step2Success = runScript(
    'scripts/sync-locations-table.ts',
    'STEP 2: Sync to Locations Table'
  );

  if (!step2Success) {
    console.log('\n❌ Migration failed at Step 2. Please fix errors and try again.\n');
    rl.close();
    process.exit(1);
  }

  // Step 3: Optional - Migrate listings
  console.log('\n📝 Step 3: Migrate listings (optional)...');
  const migrateListing = await question(
    '\nDo you want to migrate existing listings to use location_id? (yes/no): '
  );

  if (migrateListing.toLowerCase() === 'yes' || migrateListing.toLowerCase() === 'y') {
    const step3Success = runScript(
      'scripts/migrate-listings-location-id.ts',
      'STEP 3: Migrate Listings to use location_id'
    );

    if (!step3Success) {
      console.log('\n⚠️  Listing migration failed, but core migration is complete.');
      console.log('   You can run the listing migration separately later.\n');
    }
  } else {
    console.log('\n⏭️  Skipping listing migration. You can run it later if needed.');
  }

  // Step 4: Verify data integrity
  console.log('\n📝 Step 4: Verifying data integrity...');
  const step4Success = runScript(
    'scripts/verify-location-migration.ts',
    'STEP 4: Verify Data Integrity'
  );

  if (!step4Success) {
    console.log('\n⚠️  Verification failed. Please review the errors above.\n');
  }

  // Summary
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║              Migration Complete! 🎉                        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

Next Steps:
  1. Review the verification results above
  2. Test location pages in your application
  3. Monitor for any issues with location data
  4. (Optional) Run listing migration if you skipped it

Useful Commands:
  - Re-run verification: npx tsx scripts/verify-location-migration.ts
  - Analyze legacy data: npx tsx scripts/extract-legacy-location-data.ts
  - Migrate listings: npx tsx scripts/migrate-listings-location-id.ts

Documentation:
  - See .kiro/specs/google-places-autocomplete-integration/
  - Review TASK_19_MIGRATION_GUIDE.md for details
  `);

  rl.close();
}

// Run the migration wizard
runMigration().catch((error) => {
  console.error('\n❌ Migration wizard failed:', error);
  rl.close();
  process.exit(1);
});
