import 'dotenv/config';
// ============================================================================
// TIDB MIGRATION SCRIPT - Development Wizard Data Fix
// ============================================================================
// Purpose: Clean up and fix data in TiDB before deploying new code
// Usage: tsx server/migrations/tidbDevWizardMigration.ts
// ============================================================================

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { developments, unitTypes } from '../../drizzle/schema';
import { eq, isNull, sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TiDB Connection
// ============================================================================

const connection = await mysql.createConnection({
  host: process.env.TIDB_HOST || '',
  port: parseInt(process.env.TIDB_PORT || '4000'),
  user: process.env.TIDB_USER || '',
  password: process.env.TIDB_PASSWORD || '',
  database: process.env.TIDB_DATABASE || '',
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true,
  },
});

const db = drizzle(connection);

console.log('✅ Connected to TiDB');

// ============================================================================
// STEP 0: Create Backup
// ============================================================================

async function createBackup(): Promise<string> {
  console.log('\n📦 [STEP 0] Creating backup...\n');

  try {
    // Get all data
    const [devRows] = await connection.execute('SELECT * FROM developments');
    const [unitRows] = await connection.execute('SELECT * FROM unit_types');

    const backup = {
      timestamp: new Date().toISOString(),
      database: 'tidb',
      developmentsCount: (devRows as any[]).length,
      unitTypesCount: (unitRows as any[]).length,
      developments: devRows,
      unitTypes: unitRows,
    };

    // Save to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupPath = path.join(backupDir, `tidb-backup-${timestamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

    console.log(`✅ Backup created: ${backupPath}`);
    console.log(`   - ${backup.developmentsCount} developments`);
    console.log(`   - ${backup.unitTypesCount} unit types\n`);

    return backupPath;
  } catch (error: any) {
    console.error('❌ Backup failed:', error.message);
    throw error;
  }
}

// ============================================================================
// STEP 1: Remove Orphaned Unit Types
// ============================================================================

async function removeOrphanedUnits(): Promise<number> {
  console.log('🔧 [STEP 1] Removing orphaned unit types...\n');

  try {
    // TiDB-compatible query to find orphaned units
    const [orphanedRows] = await connection.execute(`
      SELECT ut.id, ut.development_id
      FROM unit_types ut
      LEFT JOIN developments d ON ut.development_id = d.id
      WHERE d.id IS NULL
    `);

    const orphaned = orphanedRows as any[];
    console.log(`   Found ${orphaned.length} orphaned unit types`);

    if (orphaned.length > 0) {
      // Delete orphaned units
      await connection.execute(`
        DELETE ut FROM unit_types ut
        LEFT JOIN developments d ON ut.development_id = d.id
        WHERE d.id IS NULL
      `);
      
      console.log(`   ✅ Deleted ${orphaned.length} orphaned units\n`);
    }

    return orphaned.length;
  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    throw error;
  }
}

// ============================================================================
// STEP 2: Deduplicate Unit Types
// ============================================================================

async function deduplicateUnits(): Promise<number> {
  console.log('🔧 [STEP 2] Deduplicating unit types...\n');

  try {
    // Find duplicates
    const [duplicateRows] = await connection.execute(`
      SELECT id, COUNT(*) as count
      FROM unit_types
      GROUP BY id
      HAVING count > 1
    `);

    const duplicates = duplicateRows as any[];
    console.log(`   Found ${duplicates.length} duplicate IDs`);

    if (duplicates.length > 0) {
      // For each duplicate ID, keep the newest (based on created_at)
      for (const dup of duplicates) {
        await connection.execute(`
          DELETE FROM unit_types
          WHERE id = ?
          AND created_at < (
            SELECT MAX(created_at) FROM (
              SELECT created_at FROM unit_types WHERE id = ?
            ) as temp
          )
        `, [dup.id, dup.id]);
      }

      console.log(`   ✅ Removed duplicate entries\n`);
    }

    return duplicates.length;
  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    throw error;
  }
}

// ============================================================================
// STEP 3: Fix JSON Fields (Double Stringification)
// ============================================================================

async function fixJsonFields(): Promise<number> {
  console.log('🔧 [STEP 3] Fixing JSON fields...\n');

  let fixed = 0;

  try {
    // Get all developments
    const allDevs = await db.select().from(developments);
    console.log(`   Processing ${allDevs.length} developments...`);

    const jsonFields = [
      'media', 'amenities', 'estateSpecs', 'specifications',
      'residentialConfig', 'landConfig', 'commercialConfig', 
      'mixedUseConfig', 'keywords'
    ];

    for (const dev of allDevs) {
      const updates: any = {};
      let needsUpdate = false;

      for (const field of jsonFields) {
        const value = (dev as any)[field];
        
        if (!value || value === 'null') {
          // Set default based on field
          const defaults: any = {
            media: { photos: [], videos: [], brochures: [] },
            amenities: { standard: [], additional: [] },
            estateSpecs: {},
            specifications: {},
            residentialConfig: {},
            landConfig: {},
            commercialConfig: {},
            mixedUseConfig: {},
            keywords: [],
          };
          
          updates[field] = JSON.stringify(defaults[field] || {});
          needsUpdate = true;
          continue;
        }

        // If it's already an object (shouldn't happen in TiDB), skip
        if (typeof value === 'object') continue;

        // Try parsing to detect double-stringification
        try {
          const parsed = JSON.parse(value);
          
          // If parsing returns a string, it's double-stringified
          if (typeof parsed === 'string') {
            const doubleParsed = JSON.parse(parsed);
            updates[field] = JSON.stringify(doubleParsed);
            needsUpdate = true;
          }
        } catch (e) {
          // Invalid JSON - set to default
          const defaults: any = {
            media: { photos: [], videos: [], brochures: [] },
            amenities: { standard: [], additional: [] },
            estateSpecs: {},
            specifications: {},
            residentialConfig: {},
            landConfig: {},
            commercialConfig: {},
            mixedUseConfig: {},
            keywords: [],
          };
          
          updates[field] = JSON.stringify(defaults[field] || {});
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await db.update(developments)
          .set(updates)
          .where(eq(developments.id, dev.id));
        fixed++;
      }
    }

    // Fix unit types JSON fields
    const allUnits = await db.select().from(unitTypes);
    console.log(`   Processing ${allUnits.length} unit types...`);

    for (const unit of allUnits) {
      const updates: any = {};
      let needsUpdate = false;

      const unitJsonFields = ['extras', 'specifications', 'amenities', 'baseMedia', 'specs'];

      for (const field of unitJsonFields) {
        const value = (unit as any)[field];
        
        if (!value || value === 'null') {
          const defaults: any = {
            extras: [],
            specifications: {},
            amenities: { standard: [], additional: [] },
            baseMedia: { gallery: [], floorPlans: [], renders: [] },
            specs: [],
          };
          
          updates[field] = JSON.stringify(defaults[field] || {});
          needsUpdate = true;
          continue;
        }

        if (typeof value === 'object') continue;

        try {
          const parsed = JSON.parse(value);
          if (typeof parsed === 'string') {
            updates[field] = JSON.stringify(JSON.parse(parsed));
            needsUpdate = true;
          }
        } catch (e) {
          const defaults: any = {
            extras: [],
            specifications: {},
            amenities: { standard: [], additional: [] },
            baseMedia: { gallery: [], floorPlans: [], renders: [] },
            specs: [],
          };
          
          updates[field] = JSON.stringify(defaults[field] || {});
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await db.update(unitTypes)
          .set(updates)
          .where(eq(unitTypes.id, unit.id));
        fixed++;
      }
    }

    console.log(`   ✅ Fixed ${fixed} records with invalid JSON\n`);
    return fixed;
  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    throw error;
  }
}

// ============================================================================
// STEP 4: Normalize Empty Strings to NULL
// ============================================================================

async function normalizeNullValues(): Promise<number> {
  console.log('🔧 [STEP 4] Normalizing empty strings to NULL...\n');

  try {
    // TiDB supports NULLIF for converting empty strings to NULL
    const result = await connection.execute(`
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

    const affected = (result as any)[0].affectedRows || 0;
    console.log(`   ✅ Normalized ${affected} development records\n`);

    return affected;
  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    throw error;
  }
}

// ============================================================================
// STEP 5: Verify Data Integrity
// ============================================================================

async function verifyIntegrity(): Promise<void> {
  console.log('🔍 [STEP 5] Verifying data integrity...\n');

  try {
    // Check 1: Count orphaned units
    const [orphanCheck] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM unit_types ut
      LEFT JOIN developments d ON ut.development_id = d.id
      WHERE d.id IS NULL
    `);
    const orphanCount = (orphanCheck as any[])[0].count;

    // Check 2: Count duplicates
    const [dupCheck] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM (
        SELECT id, COUNT(*) as cnt
        FROM unit_types
        GROUP BY id
        HAVING cnt > 1
      ) as dups
    `);
    const dupCount = (dupCheck as any[])[0].count;

    // Check 3: Count invalid JSON
    const allDevs = await db.select().from(developments);
    let invalidJson = 0;
    
    for (const dev of allDevs) {
      try {
        if (dev.media) JSON.parse(dev.media as string);
        if (dev.amenities) JSON.parse(dev.amenities as string);
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
    console.error('❌ Verification failed:', error.message);
    throw error;
  }
}

// ============================================================================
// MASTER MIGRATION RUNNER
// ============================================================================

async function runMigrations() {
  console.log('='.repeat(80));
  console.log('TIDB DEVELOPMENT WIZARD MIGRATION');
  console.log('='.repeat(80));
  console.log(`Started: ${new Date().toISOString()}\n`);

  const results: any = {
    backupPath: '',
    orphanedRemoved: 0,
    duplicatesRemoved: 0,
    jsonFixed: 0,
    nullsNormalized: 0,
  };

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

    // Summary
    console.log('='.repeat(80));
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log('\nSummary:');
    console.log(`  - Backup: ${results.backupPath}`);
    console.log(`  - Orphaned units removed: ${results.orphanedRemoved}`);
    console.log(`  - Duplicate IDs removed: ${results.duplicatesRemoved}`);
    console.log(`  - Records with fixed JSON: ${results.jsonFixed}`);
    console.log(`  - Records with normalized NULLs: ${results.nullsNormalized}`);
    console.log(`\nCompleted: ${new Date().toISOString()}\n`);

    await connection.end();
    process.exit(0);
  } catch (error: any) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ MIGRATION FAILED');
    console.error('='.repeat(80));
    console.error(`Error: ${error.message}\n`);
    console.error('⚠️  ROLLBACK RECOMMENDED');
    console.error(`   Backup location: ${results.backupPath}\n`);

    await connection.end();
    process.exit(1);
  }
}

// Run migrations
runMigrations();
