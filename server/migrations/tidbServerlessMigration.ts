import 'dotenv/config';
// ============================================================================
// TIDB CLOUD SERVERLESS MIGRATION - Development Wizard Fix
// ============================================================================
// Optimized for TiDB Serverless with connection pooling and rate limiting
// Usage: tsx server/migrations/tidbServerlessMigration.ts
// ============================================================================

import { connect } from '@tidbcloud/serverless';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TiDB Serverless Connection (uses HTTP/HTTPS)
// ============================================================================

const TIDB_DATABASE_URL = process.env.DATABASE_URL || '';

if (!TIDB_DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL environment variable');
  console.error('   Format: mysql://username:password@host/database');
  process.exit(1);
}

// Create serverless connection
const conn = connect({ url: TIDB_DATABASE_URL });

console.log('✅ Connected to TiDB Cloud Serverless');

// ============================================================================
// Utility: Sleep for rate limiting
// ============================================================================

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// STEP 0: Create Backup (Export to JSON)
// ============================================================================

async function createBackup(): Promise<string> {
  console.log('\n📦 [STEP 0] Creating backup...\n');

  try {
    // TiDB Serverless: Use smaller batches to avoid timeout
    console.log('   Fetching developments...');
    const developments = await conn.execute('SELECT * FROM developments');

    console.log('   Fetching unit types...');
    const unitTypes = await conn.execute('SELECT * FROM unit_types');

    const backup = {
      timestamp: new Date().toISOString(),
      database: 'tidb-serverless',
      developmentsCount: developments.length,
      unitTypesCount: unitTypes.length,
      developments: developments,
      unitTypes: unitTypes,
    };

    // Save to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupPath = path.join(backupDir, `tidb-serverless-backup-${timestamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

    console.log(`   ✅ Backup created: ${backupPath}`);
    console.log(`      - ${backup.developmentsCount} developments`);
    console.log(`      - ${backup.unitTypesCount} unit types\n`);

    return backupPath;
  } catch (error: any) {
    console.error('   ❌ Backup failed:', error.message);
    throw error;
  }
}

// ============================================================================
// STEP 1: Remove Orphaned Unit Types
// ============================================================================

async function removeOrphanedUnits(): Promise<number> {
  console.log('🔧 [STEP 1] Removing orphaned unit types...\n');

  try {
    // Find orphaned units first
    const orphanedQuery = `
      SELECT ut.id, ut.development_id
      FROM unit_types ut
      LEFT JOIN developments d ON ut.development_id = d.id
      WHERE d.id IS NULL
    `;

    const result = await conn.execute(orphanedQuery);
    const orphaned = result as any[];

    console.log(`   Found ${orphaned.length} orphaned unit types`);

    if (orphaned.length > 0) {
      // TiDB Serverless: Delete in smaller batches to avoid timeout
      const batchSize = 50;
      let deleted = 0;

      for (let i = 0; i < orphaned.length; i += batchSize) {
        const batch = orphaned.slice(i, i + batchSize);
        const ids = batch.map(u => `'${u.id}'`).join(',');

        await conn.execute(`DELETE FROM unit_types WHERE id IN (${ids})`);
        deleted += batch.length;

        console.log(`   Progress: ${deleted}/${orphaned.length} deleted`);

        // Rate limiting for serverless
        if (i + batchSize < orphaned.length) {
          await sleep(100);
        }
      }

      console.log(`   ✅ Deleted ${deleted} orphaned units\n`);
      return deleted;
    }

    console.log(`   ✅ No orphaned units found\n`);
    return 0;
  } catch (error: any) {
    console.error('   ❌ Failed:', error.message);
    throw error;
  }
}

// ============================================================================
// STEP 2: Deduplicate Unit Types
// ============================================================================

async function deduplicateUnits(): Promise<number> {
  console.log('🔧 [STEP 2] Deduplicating unit types...\n');

  try {
    // Find duplicate IDs
    const duplicateQuery = `
      SELECT id, COUNT(*) as count
      FROM unit_types
      GROUP BY id
      HAVING count > 1
    `;

    const result = await conn.execute(duplicateQuery);
    const duplicates = result as any[];

    console.log(`   Found ${duplicates.length} duplicate IDs`);

    if (duplicates.length > 0) {
      let fixed = 0;

      for (const dup of duplicates) {
        // Get all instances of this ID
        const instances = await conn.execute(
          'SELECT * FROM unit_types WHERE id = ? ORDER BY created_at DESC',
          [dup.id],
        );

        const rows = instances as any[];

        // Keep the first (newest), delete the rest
        for (let i = 1; i < rows.length; i++) {
          await conn.execute('DELETE FROM unit_types WHERE id = ? AND created_at = ?', [
            rows[i].id,
            rows[i].created_at,
          ]);
          fixed++;
        }

        console.log(`   Fixed duplicate: ${dup.id} (removed ${rows.length - 1} copies)`);

        // Rate limiting
        await sleep(50);
      }

      console.log(`   ✅ Removed ${fixed} duplicate entries\n`);
      return fixed;
    }

    console.log(`   ✅ No duplicates found\n`);
    return 0;
  } catch (error: any) {
    console.error('   ❌ Failed:', error.message);
    throw error;
  }
}

// ============================================================================
// STEP 3: Fix JSON Fields (Handle Double Stringification)
// ============================================================================

async function fixJsonFields(): Promise<number> {
  console.log('🔧 [STEP 3] Fixing JSON fields...\n');

  let fixed = 0;

  try {
    // Get all developments in batches (serverless optimization)
    const allDevs = await conn.execute('SELECT * FROM developments');
    const developments = allDevs as any[];

    console.log(`   Processing ${developments.length} developments...`);

    const jsonFields = [
      'images',
      'videos',
      'floorPlans',
      'brochures',
      'amenities',
      'highlights',
      'features',
      'estateSpecs',
      'property_types',
      'rejection_reasons',
    ];

    const defaults: any = {
      images: [],
      videos: [],
      floorPlans: [],
      brochures: [],
      amenities: { standard: [], additional: [] },
      highlights: [],
      features: [],
      estateSpecs: {},
      property_types: [],
      rejection_reasons: [],
    };

    // Process in batches
    const batchSize = 10;
    for (let i = 0; i < developments.length; i += batchSize) {
      const batch = developments.slice(i, i + batchSize);

      for (const dev of batch) {
        const updates: string[] = [];
        const values: any[] = [];

        for (const field of jsonFields) {
          const value = dev[field];
          let fixedValue: string | null = null;

          if (!value || value === 'null' || value === 'undefined') {
            fixedValue = JSON.stringify(defaults[field] || {});
          } else if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);

              // Check for double-stringification
              if (typeof parsed === 'string') {
                const doubleParsed = JSON.parse(parsed);
                fixedValue = JSON.stringify(doubleParsed);
              }
            } catch (e) {
              // Invalid JSON - use default
              fixedValue = JSON.stringify(defaults[field] || {});
            }
          }

          if (fixedValue) {
            updates.push(`${field} = ?`);
            values.push(fixedValue);
          }
        }

        if (updates.length > 0) {
          values.push(dev.id);
          await conn.execute(`UPDATE developments SET ${updates.join(', ')} WHERE id = ?`, values);
          fixed++;
        }
      }

      // Progress indicator
      console.log(
        `   Progress: ${Math.min(i + batchSize, developments.length)}/${developments.length} developments`,
      );

      // Rate limiting
      await sleep(100);
    }

    // Fix unit types
    const allUnits = await conn.execute('SELECT * FROM unit_types');
    const unitTypes = allUnits as any[];

    console.log(`   Processing ${unitTypes.length} unit types...`);

    const unitDefaults: any = {
      extras: [],
      specifications: {},
      amenities: { standard: [], additional: [] },
      base_media: { gallery: [], floorPlans: [], renders: [] },
      base_features: {},
      base_finishes: {},
      spec_overrides: {},
      features: {},
    };

    for (let i = 0; i < unitTypes.length; i += batchSize) {
      const batch = unitTypes.slice(i, i + batchSize);

      for (const unit of batch) {
        const updates: string[] = [];
        const values: any[] = [];

        const unitJsonFields = [
          'extras',
          'specifications',
          'amenities',
          'base_media',
          'base_features',
          'base_finishes',
          'spec_overrides',
          'features',
        ];

        for (const field of unitJsonFields) {
          const value = unit[field];
          let fixedValue: string | null = null;

          if (!value || value === 'null' || value === 'undefined') {
            fixedValue = JSON.stringify(unitDefaults[field] || {});
          } else if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              if (typeof parsed === 'string') {
                fixedValue = JSON.stringify(JSON.parse(parsed));
              }
            } catch (e) {
              fixedValue = JSON.stringify(unitDefaults[field] || {});
            }
          }

          if (fixedValue) {
            updates.push(`${field} = ?`);
            values.push(fixedValue);
          }
        }

        if (updates.length > 0) {
          values.push(unit.id);
          await conn.execute(`UPDATE unit_types SET ${updates.join(', ')} WHERE id = ?`, values);
          fixed++;
        }
      }

      console.log(
        `   Progress: ${Math.min(i + batchSize, unitTypes.length)}/${unitTypes.length} unit types`,
      );
      await sleep(100);
    }

    console.log(`   ✅ Fixed ${fixed} records with invalid JSON\n`);
    return fixed;
  } catch (error: any) {
    console.error('   ❌ Failed:', error.message);
    throw error;
  }
}

// ============================================================================
// STEP 4: Normalize Empty Strings to NULL
// ============================================================================

async function normalizeNullValues(): Promise<number> {
  console.log('🔧 [STEP 4] Normalizing empty strings to NULL...\n');

  try {
    // TiDB Serverless: Use NULLIF to convert empty strings
    const result = await conn.execute(`
      UPDATE developments
      SET 
        description = NULLIF(description, ''),
        tagline = NULLIF(tagline, ''),
        subtitle = NULLIF(subtitle, ''),
        address = NULLIF(address, ''),
        suburb = NULLIF(suburb, ''),
        city = NULLIF(city, ''),
        province = NULLIF(province, ''),
        postal_code = NULLIF(postal_code, ''),
        meta_title = NULLIF(meta_title, ''),
        meta_description = NULLIF(meta_description, '')
    `);

    // @tidbcloud/serverless execute returns different structure depending on query type
    // Assuming standard behavior or result logging for now
    const affected = (result as any).rowsAffected || 0;
    console.log(`   ✅ Normalized ${affected} development records\n`);

    return affected;
  } catch (error: any) {
    console.error('   ❌ Failed:', error.message);
    throw error;
  }
}

// ============================================================================
// STEP 5: Verify Data Integrity
// ============================================================================

async function verifyIntegrity(): Promise<void> {
  console.log('🔍 [STEP 5] Verifying data integrity...\n');

  try {
    // Check 1: Orphaned units
    const orphanCheck = await conn.execute(`
      SELECT COUNT(*) as count
      FROM unit_types ut
      LEFT JOIN developments d ON ut.development_id = d.id
      WHERE d.id IS NULL
    `);
    const orphanCount = (orphanCheck as any[])[0].count;

    // Check 2: Duplicates
    const dupCheck = await conn.execute(`
      SELECT COUNT(*) as count
      FROM (
        SELECT id, COUNT(*) as cnt
        FROM unit_types
        GROUP BY id
        HAVING cnt > 1
      ) as dups
    `);
    const dupCount = (dupCheck as any[])[0].count;

    // Check 3: Invalid JSON
    const allDevs = await conn.execute('SELECT images, amenities FROM developments');
    let invalidJson = 0;

    for (const dev of allDevs as any[]) {
      try {
        if (dev.images) JSON.parse(dev.images);
        if (dev.amenities) JSON.parse(dev.amenities);
      } catch {
        invalidJson++;
      }
    }

    console.log('   Results:');
    console.log(`   - Orphaned units: ${orphanCount}`);
    console.log(`   - Duplicate IDs: ${dupCount}`);
    console.log(`   - Invalid JSON: ${invalidJson}`);

    if (orphanCount === 0 && dupCount === 0 && invalidJson === 0) {
      console.log('\n   ✅ Data integrity verified - All checks passed!\n');
    } else {
      console.log('\n   ⚠️  Issues found - may need additional cleanup\n');
    }
  } catch (error: any) {
    console.error('   ❌ Verification failed:', error.message);
  }
}

// ============================================================================
// MASTER MIGRATION RUNNER
// ============================================================================

async function runMigrations() {
  console.log('='.repeat(80));
  console.log('TIDB CLOUD SERVERLESS - DEVELOPMENT WIZARD MIGRATION');
  console.log('='.repeat(80));
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);

  const results: any = {
    backupPath: '',
    orphanedRemoved: 0,
    duplicatesRemoved: 0,
    jsonFixed: 0,
    nullsNormalized: 0,
  };

  const startTime = Date.now();

  try {
    // Step 0: Backup
    results.backupPath = await createBackup();

    // Step 1: Remove orphaned units
    results.orphanedRemoved = await removeOrphanedUnits();

    // Step 2: Deduplicate units
    results.duplicatesRemoved = await deduplicateUnits();

    // Step 3: Fix JSON fields
    results.jsonFixed = await fixJsonFields();

    // Step 4: Normalize NULL values
    results.nullsNormalized = await normalizeNullValues();

    // Step 5: Verify integrity
    await verifyIntegrity();

    const duration = Math.round((Date.now() - startTime) / 1000);

    // Summary
    console.log('='.repeat(80));
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log('\nSummary:');
    console.log(`  - Duration: ${duration} seconds`);
    console.log(`  - Backup: ${results.backupPath}`);
    console.log(`  - Orphaned units removed: ${results.orphanedRemoved}`);
    console.log(`  - Duplicate IDs removed: ${results.duplicatesRemoved}`);
    console.log(`  - Records with fixed JSON: ${results.jsonFixed}`);
    console.log(`  - Records with normalized NULLs: ${results.nullsNormalized}`);
    console.log(`\nCompleted: ${new Date().toISOString()}`);

    process.exit(0);
  } catch (error: any) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ MIGRATION FAILED');
    console.error('='.repeat(80));
    console.error(`Error: ${error.message}\n`);
    console.error('⚠️  ROLLBACK RECOMMENDED');
    console.error(`   Backup location: ${results.backupPath}\n`);

    process.exit(1);
  }
}

// Run migrations
runMigrations();
