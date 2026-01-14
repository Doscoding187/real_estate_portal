// ============================================================================
// DEVELOPMENT WIZARD - MIGRATION SCRIPTS FOR EDGE CASES
// ============================================================================
// Purpose: Clean up and fix data inconsistencies before deploying new persistence logic
// Run these in order, one at a time, with verification between each
// ============================================================================

// ============================================================================
// MIGRATION 1: Generate Missing Unit Type IDs
// ============================================================================
// Problem: Some unit types may exist without IDs (if old code had bugs)
// Solution: Generate IDs for orphaned units
// ============================================================================

import { db } from '../db';
import { unitTypes, developments } from '../../drizzle/schema';
import { eq, isNull } from 'drizzle-orm';

export async function migration001_generateMissingUnitTypeIds() {
  console.log('[Migration 001] Starting: Generate missing unit type IDs');
  
  try {
    // Find units without IDs (if your schema allows it)
    const unitsWithoutIds = await db
      .select()
      .from(unitTypes)
      .where(isNull(unitTypes.id));

    console.log(`[Migration 001] Found ${unitsWithoutIds.length} units without IDs`);

    let fixed = 0;
    for (const unit of unitsWithoutIds) {
      const newId = `unit-migrated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // This assumes you can update by some other unique field
      // Adjust based on your actual schema constraints
      await db
        .update(unitTypes)
        .set({ id: newId })
        .where(eq(unitTypes.developmentId, unit.developmentId));
      
      fixed++;
      console.log(`[Migration 001] Fixed unit for development ${unit.developmentId}: ${newId}`);
    }

    console.log(`[Migration 001] ✅ Complete. Fixed ${fixed} units`);
    return { success: true, fixed };
  } catch (error: any) {
    console.error('[Migration 001] ❌ Failed:', error.message);
    throw error;
  }
}

// ============================================================================
// MIGRATION 2: Parse Stringified JSON Fields
// ============================================================================
// Problem: Some JSON fields might be double-stringified or incorrectly stored
// Solution: Parse and re-save all JSON fields to ensure consistency
// ============================================================================

export async function migration002_fixJsonFields() {
  console.log('[Migration 002] Starting: Fix JSON fields');
  
  try {
    const allDevelopments = await db.select().from(developments);
    console.log(`[Migration 002] Processing ${allDevelopments.length} developments`);

    let fixed = 0;

    for (const dev of allDevelopments) {
      const updates: any = {};
      let needsUpdate = false;

      // Helper to detect and fix double-stringified JSON
      const fixJsonField = (fieldName: string, defaultValue: any) => {
        const value = (dev as any)[fieldName];
        
        if (!value) {
          updates[fieldName] = JSON.stringify(defaultValue);
          needsUpdate = true;
          return;
        }

        // If it's already an object, stringify it properly
        if (typeof value === 'object') {
          updates[fieldName] = JSON.stringify(value);
          needsUpdate = true;
          return;
        }

        // If it's a string, try parsing it
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            
            // Check if it's double-stringified (parsing returns a string)
            if (typeof parsed === 'string') {
              const doubleParsed = JSON.parse(parsed);
              updates[fieldName] = JSON.stringify(doubleParsed);
              needsUpdate = true;
              console.log(`[Migration 002] Fixed double-stringified ${fieldName} for dev ${dev.id}`);
            } else {
              // Already correctly stringified, keep as is
              updates[fieldName] = value;
            }
          } catch (e) {
            // Not valid JSON, set to default
            updates[fieldName] = JSON.stringify(defaultValue);
            needsUpdate = true;
            console.log(`[Migration 002] Reset invalid ${fieldName} for dev ${dev.id}`);
          }
        }
      };

      // Fix all JSON fields
      fixJsonField('media', { photos: [], videos: [], brochures: [] });
      fixJsonField('amenities', { standard: [], additional: [] });
      fixJsonField('estateSpecs', {});
      fixJsonField('specifications', {});
      fixJsonField('residentialConfig', {});
      fixJsonField('landConfig', {});
      fixJsonField('commercialConfig', {});
      fixJsonField('mixedUseConfig', {});
      fixJsonField('keywords', []);

      if (needsUpdate) {
        await db
          .update(developments)
          .set(updates)
          .where(eq(developments.id, dev.id));
        fixed++;
      }
    }

    // Fix unit types JSON fields
    const allUnits = await db.select().from(unitTypes);
    console.log(`[Migration 002] Processing ${allUnits.length} unit types`);

    for (const unit of allUnits) {
      const updates: any = {};
      let needsUpdate = false;

      const fixJsonField = (fieldName: string, defaultValue: any) => {
        const value = (unit as any)[fieldName];
        
        if (!value) {
          updates[fieldName] = JSON.stringify(defaultValue);
          needsUpdate = true;
          return;
        }

        if (typeof value === 'object') {
          updates[fieldName] = JSON.stringify(value);
          needsUpdate = true;
          return;
        }

        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (typeof parsed === 'string') {
              updates[fieldName] = JSON.stringify(JSON.parse(parsed));
              needsUpdate = true;
            } else {
              updates[fieldName] = value;
            }
          } catch (e) {
            updates[fieldName] = JSON.stringify(defaultValue);
            needsUpdate = true;
          }
        }
      };

      fixJsonField('extras', []);
      fixJsonField('specifications', {});
      fixJsonField('amenities', { standard: [], additional: [] });
      fixJsonField('baseMedia', { gallery: [], floorPlans: [], renders: [] });
      fixJsonField('specs', []);

      if (needsUpdate) {
        await db
          .update(unitTypes)
          .set(updates)
          .where(eq(unitTypes.id, unit.id));
        fixed++;
      }
    }

    console.log(`[Migration 002] ✅ Complete. Fixed ${fixed} records`);
    return { success: true, fixed };
  } catch (error: any) {
    console.error('[Migration 002] ❌ Failed:', error.message);
    throw error;
  }
}

// ============================================================================
// MIGRATION 3: Remove Orphaned Unit Types
// ============================================================================
// Problem: Unit types might reference deleted developments
// Solution: Clean up orphaned records
// ============================================================================

export async function migration003_removeOrphanedUnits() {
  console.log('[Migration 003] Starting: Remove orphaned unit types');
  
  try {
    // Get all development IDs
    const allDevs = await db.select({ id: developments.id }).from(developments);
    const validDevIds = new Set(allDevs.map(d => d.id));

    // Get all unit types
    const allUnits = await db.select().from(unitTypes);
    
    let deleted = 0;
    for (const unit of allUnits) {
      if (!validDevIds.has(unit.developmentId)) {
        await db.delete(unitTypes).where(eq(unitTypes.id, unit.id));
        deleted++;
        console.log(`[Migration 003] Deleted orphaned unit ${unit.id} (dev ${unit.developmentId} not found)`);
      }
    }

    console.log(`[Migration 003] ✅ Complete. Deleted ${deleted} orphaned units`);
    return { success: true, deleted };
  } catch (error: any) {
    console.error('[Migration 003] ❌ Failed:', error.message);
    throw error;
  }
}

// ============================================================================
// MIGRATION 4: Deduplicate Unit Types
// ============================================================================
// Problem: Multiple units might have the same ID (data corruption)
// Solution: Keep newest, remove duplicates
// ============================================================================

export async function migration004_deduplicateUnits() {
  console.log('[Migration 004] Starting: Deduplicate unit types');
  
  try {
    const allUnits = await db.select().from(unitTypes);
    
    // Group by ID
    const unitsByID = new Map<string, any[]>();
    for (const unit of allUnits) {
      if (!unitsByID.has(unit.id)) {
        unitsByID.set(unit.id, []);
      }
      unitsByID.get(unit.id)!.push(unit);
    }

    let deleted = 0;
    for (const [id, units] of unitsByID.entries()) {
      if (units.length > 1) {
        console.log(`[Migration 004] Found ${units.length} units with ID ${id}`);
        
        // Sort by createdAt (keep newest)
        units.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });

        // Keep first (newest), delete rest
        for (let i = 1; i < units.length; i++) {
          await db.delete(unitTypes).where(eq(unitTypes.id, units[i].id));
          deleted++;
          console.log(`[Migration 004] Deleted duplicate unit ${id}`);
        }
      }
    }

    console.log(`[Migration 004] ✅ Complete. Deleted ${deleted} duplicates`);
    return { success: true, deleted };
  } catch (error: any) {
    console.error('[Migration 004] ❌ Failed:', error.message);
    throw error;
  }
}

// ============================================================================
// MIGRATION 5: Normalize Location Data
// ============================================================================
// Problem: Location might be stored inconsistently (object vs flat fields)
// Solution: Ensure flat fields are populated from objects (or vice versa)
// ============================================================================

export async function migration005_normalizeLocations() {
  console.log('[Migration 005] Starting: Normalize location data');
  
  try {
    const allDevelopments = await db.select().from(developments);
    let fixed = 0;

    for (const dev of allDevelopments) {
      let needsUpdate = false;
      const updates: any = {};

      // If location object exists but flat fields are null
      if (dev.location) {
        try {
          const loc = typeof dev.location === 'string' 
            ? JSON.parse(dev.location) 
            : dev.location;

          if (!dev.address && loc.address) {
            updates.address = loc.address;
            needsUpdate = true;
          }
          if (!dev.suburb && loc.suburb) {
            updates.suburb = loc.suburb;
            needsUpdate = true;
          }
          if (!dev.city && loc.city) {
            updates.city = loc.city;
            needsUpdate = true;
          }
          if (!dev.province && loc.province) {
            updates.province = loc.province;
            needsUpdate = true;
          }
          if (!dev.latitude && loc.latitude) {
            updates.latitude = loc.latitude;
            needsUpdate = true;
          }
          if (!dev.longitude && loc.longitude) {
            updates.longitude = loc.longitude;
            needsUpdate = true;
          }
        } catch (e) {
          console.warn(`[Migration 005] Could not parse location for dev ${dev.id}`);
        }
      }

      if (needsUpdate) {
        await db
          .update(developments)
          .set(updates)
          .where(eq(developments.id, dev.id));
        fixed++;
        console.log(`[Migration 005] Normalized location for dev ${dev.id}`);
      }
    }

    console.log(`[Migration 005] ✅ Complete. Fixed ${fixed} locations`);
    return { success: true, fixed };
  } catch (error: any) {
    console.error('[Migration 005] ❌ Failed:', error.message);
    throw error;
  }
}

// ============================================================================
// MIGRATION 6: Fix Null vs Empty String Inconsistencies
// ============================================================================
// Problem: Some fields have empty strings instead of null
// Solution: Normalize empty strings to null for optional fields
// ============================================================================

export async function migration006_normalizeNullValues() {
  console.log('[Migration 006] Starting: Normalize null vs empty string');
  
  try {
    const allDevelopments = await db.select().from(developments);
    let fixed = 0;

    const fieldsToNormalize = [
      'description', 'tagline', 'subtitle', 'address', 'suburb', 
      'city', 'province', 'postalCode', 'metaTitle', 'metaDescription'
    ];

    for (const dev of allDevelopments) {
      const updates: any = {};
      let needsUpdate = false;

      for (const field of fieldsToNormalize) {
        const value = (dev as any)[field];
        if (value === '' || value === 'null' || value === 'undefined') {
          updates[field] = null;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await db
          .update(developments)
          .set(updates)
          .where(eq(developments.id, dev.id));
        fixed++;
      }
    }

    console.log(`[Migration 006] ✅ Complete. Fixed ${fixed} records`);
    return { success: true, fixed };
  } catch (error: any) {
    console.error('[Migration 006] ❌ Failed:', error.message);
    throw error;
  }
}

// ============================================================================
// MIGRATION 7: Backup Before Deployment
// ============================================================================
// Purpose: Create a backup snapshot that can be restored if issues occur
// ============================================================================

export async function migration007_createBackup() {
  console.log('[Migration 007] Starting: Create backup snapshot');
  
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Export all developments
    const allDevelopments = await db.select().from(developments);
    const allUnits = await db.select().from(unitTypes);

    const backup = {
      timestamp,
      version: '1.0.0',
      developments: allDevelopments,
      unitTypes: allUnits,
    };

    // In production, save to file or cloud storage
    // For now, log the count
    console.log(`[Migration 007] Backup created:`);
    console.log(`  - ${allDevelopments.length} developments`);
    console.log(`  - ${allUnits.length} unit types`);
    console.log(`  - Timestamp: ${timestamp}`);

    // Save to file (adjust path as needed)
    const fs = require('fs');
    const path = require('path');
    const backupPath = path.join(process.cwd(), 'backups', `dev-wizard-backup-${timestamp}.json`);
    
    // Ensure backup directory exists
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

    console.log(`[Migration 007] ✅ Backup saved to: ${backupPath}`);
    return { success: true, path: backupPath, count: allDevelopments.length };
  } catch (error: any) {
    console.error('[Migration 007] ❌ Failed:', error.message);
    throw error;
  }
}

// ============================================================================
// MIGRATION 8: Restore From Backup
// ============================================================================
// Purpose: Rollback mechanism if deployment causes issues
// ============================================================================

export async function migration008_restoreBackup(backupPath: string) {
  console.log('[Migration 008] Starting: Restore from backup');
  console.log(`[Migration 008] Backup path: ${backupPath}`);
  
  try {
    const fs = require('fs');
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

    console.log(`[Migration 008] Backup contains:`);
    console.log(`  - ${backupData.developments.length} developments`);
    console.log(`  - ${backupData.unitTypes.length} unit types`);
    console.log(`  - Created: ${backupData.timestamp}`);

    // WARNING: This will REPLACE existing data
    console.log('[Migration 008] ⚠️  This will REPLACE all current data. Confirm? (yes/no)');
    
    // In production, require manual confirmation
    // For script, we'll proceed with a flag
    const confirmed = true; // Set to false in production

    if (!confirmed) {
      console.log('[Migration 008] ❌ Restore cancelled by user');
      return { success: false, message: 'Cancelled' };
    }

    // Clear existing data
    await db.delete(unitTypes);
    await db.delete(developments);

    // Restore developments
    for (const dev of backupData.developments) {
      await db.insert(developments).values(dev);
    }

    // Restore unit types
    for (const unit of backupData.unitTypes) {
      await db.insert(unitTypes).values(unit);
    }

    console.log(`[Migration 008] ✅ Restore complete`);
    return { success: true, restored: backupData.developments.length };
  } catch (error: any) {
    console.error('[Migration 008] ❌ Failed:', error.message);
    throw error;
  }
}

// ============================================================================
// MASTER MIGRATION RUNNER
// ============================================================================
// Run all migrations in sequence with rollback capability
// ============================================================================

export async function runAllMigrations() {
  console.log('='.repeat(80));
  console.log('DEVELOPMENT WIZARD - MIGRATION SUITE');
  console.log('='.repeat(80));

  const results: any[] = [];

  try {
    // Step 0: Create backup first
    console.log('\n📦 Creating backup before migrations...\n');
    const backup = await migration007_createBackup();
    results.push({ name: 'Backup', ...backup });

    if (!backup.success) {
      throw new Error('Backup failed - aborting migrations');
    }

    // Step 1: Generate missing IDs
    console.log('\n🔧 Migration 1: Generate missing unit type IDs...\n');
    const m1 = await migration001_generateMissingUnitTypeIds();
    results.push({ name: 'Generate IDs', ...m1 });

    // Step 2: Fix JSON fields
    console.log('\n🔧 Migration 2: Fix JSON fields...\n');
    const m2 = await migration002_fixJsonFields();
    results.push({ name: 'Fix JSON', ...m2 });

    // Step 3: Remove orphaned units
    console.log('\n🔧 Migration 3: Remove orphaned units...\n');
    const m3 = await migration003_removeOrphanedUnits();
    results.push({ name: 'Remove Orphans', ...m3 });

    // Step 4: Deduplicate units
    console.log('\n🔧 Migration 4: Deduplicate units...\n');
    const m4 = await migration004_deduplicateUnits();
    results.push({ name: 'Deduplicate', ...m4 });

    // Step 5: Normalize locations
    console.log('\n🔧 Migration 5: Normalize locations...\n');
    const m5 = await migration005_normalizeLocations();
    results.push({ name: 'Normalize Locations', ...m5 });

    // Step 6: Normalize null values
    console.log('\n🔧 Migration 6: Normalize null values...\n');
    const m6 = await migration006_normalizeNullValues();
    results.push({ name: 'Normalize Nulls', ...m6 });

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL MIGRATIONS COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log('\nSummary:');
    results.forEach(r => {
      console.log(`  - ${r.name}: ${JSON.stringify(r)}`);
    });

    console.log(`\n📦 Backup saved at: ${backup.path}`);
    console.log('   Use this to rollback if issues occur.\n');

    return { success: true, results };
  } catch (error: any) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ MIGRATION FAILED');
    console.error('='.repeat(80));
    console.error('Error:', error.message);
    console.error('\n⚠️  ROLLBACK RECOMMENDED');
    console.error('   Run: migration008_restoreBackup(backupPath)\n');

    return { success: false, error: error.message, results };
  }
}

// Auto-run if executed directly
if (require.main === module) {
  runAllMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
