/**
 * Agency Content Attribution Migration Runner
 * 
 * This script runs the agency attribution migration that adds:
 * - agency_id column to explore_shorts table
 * - creator_type and agency_id columns to explore_content table
 * - Composite indexes for performance optimization
 * 
 * Requirements: 4.1, 4.2, 4.3, 7.5
 * 
 * Usage:
 *   npm run tsx scripts/run-agency-attribution-migration.ts
 * 
 * Rollback:
 *   npm run tsx scripts/run-agency-attribution-migration.ts --rollback
 */

import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATION_FILE = path.join(__dirname, '../drizzle/migrations/add-agency-attribution.sql');
const ROLLBACK_FILE = path.join(__dirname, '../drizzle/migrations/rollback-agency-attribution.sql');

async function runMigration() {
  console.log('🚀 Starting Agency Attribution Migration...\n');

  try {
    // Initialize database connection
    const db = await getDb();
    
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf-8');
    
    // Remove comments and split into individual statements
    const cleanedSQL = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments
    
    // Split into individual statements (filter out SELECT verification queries)
    const statements = cleanedSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => 
        stmt.length > 0 && 
        !stmt.toUpperCase().startsWith('SELECT')
      );

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip verification queries
      if (statement.includes('INFORMATION_SCHEMA')) {
        continue;
      }

      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        await db.execute(sql.raw(statement));
        console.log(`✅ Statement ${i + 1} completed\n`);
      } catch (error: any) {
        // Check if error is due to column/index already existing
        if (
          error.message?.includes('Duplicate column') ||
          error.message?.includes('Duplicate key') ||
          error.message?.includes('already exists')
        ) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists)\n`);
          continue;
        }
        throw error;
      }
    }

    // Run verification queries
    console.log('\n🔍 Running verification queries...\n');

    // Verify explore_shorts columns
    const shortsColumns = await db.execute(sql`
      SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        IS_NULLABLE, 
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'explore_shorts' 
        AND COLUMN_NAME IN ('agency_id')
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('explore_shorts columns:');
    console.table(shortsColumns);

    // Verify explore_content columns
    const contentColumns = await db.execute(sql`
      SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        IS_NULLABLE, 
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'explore_content' 
        AND COLUMN_NAME IN ('creator_type', 'agency_id')
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('\nexplore_content columns:');
    console.table(contentColumns);

    // Verify indexes
    const indexes = await db.execute(sql`
      SELECT 
        TABLE_NAME,
        INDEX_NAME,
        GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS COLUMNS
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('explore_shorts', 'explore_content')
        AND INDEX_NAME LIKE '%agency%'
      GROUP BY TABLE_NAME, INDEX_NAME
      ORDER BY TABLE_NAME, INDEX_NAME
    `);
    
    console.log('\nIndexes:');
    console.table(indexes);

    // Verify foreign keys
    const foreignKeys = await db.execute(sql`
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('explore_shorts', 'explore_content')
        AND CONSTRAINT_NAME LIKE '%agency%'
      ORDER BY TABLE_NAME, CONSTRAINT_NAME
    `);
    
    console.log('\nForeign Keys:');
    console.table(foreignKeys);

    console.log('\n✅ Agency Attribution Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - Added agency_id to explore_shorts table');
    console.log('  - Added creator_type and agency_id to explore_content table');
    console.log('  - Created composite indexes for performance');
    console.log('  - Added foreign key constraints');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\n💡 To rollback, run:');
    console.error('   npm run tsx scripts/run-agency-attribution-migration.ts --rollback');
    process.exit(1);
  }
}

async function runRollback() {
  console.log('🔄 Starting Agency Attribution Rollback...\n');

  try {
    // Initialize database connection
    const db = await getDb();
    
    // Read the rollback SQL file
    const rollbackSQL = fs.readFileSync(ROLLBACK_FILE, 'utf-8');
    
    // Remove comments and split into individual statements
    const cleanedSQL = rollbackSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments
    
    // Split into individual statements (filter out SELECT verification queries)
    const statements = cleanedSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => 
        stmt.length > 0 && 
        !stmt.toUpperCase().startsWith('SELECT')
      );

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip verification queries
      if (statement.includes('INFORMATION_SCHEMA')) {
        continue;
      }

      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        await db.execute(sql.raw(statement));
        console.log(`✅ Statement ${i + 1} completed\n`);
      } catch (error: any) {
        // Check if error is due to column/index not existing
        if (
          error.message?.includes("Can't DROP") ||
          error.message?.includes("check that it exists") ||
          error.message?.includes("doesn't exist")
        ) {
          console.log(`⚠️  Statement ${i + 1} skipped (doesn't exist)\n`);
          continue;
        }
        throw error;
      }
    }

    console.log('\n✅ Agency Attribution Rollback completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - Removed agency_id from explore_shorts table');
    console.log('  - Removed creator_type and agency_id from explore_content table');
    console.log('  - Dropped all agency-related indexes');
    console.log('  - Dropped foreign key constraints');
    
  } catch (error) {
    console.error('\n❌ Rollback failed:', error);
    process.exit(1);
  }
}

// Main execution
const isRollback = process.argv.includes('--rollback');

if (isRollback) {
  runRollback()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Rollback error:', error);
      process.exit(1);
    });
} else {
  runMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}
