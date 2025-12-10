/**
 * Run Location Performance Optimization Migration
 * 
 * Task 21: Add performance optimizations
 * 
 * This script applies performance indexes for the location system:
 * - Composite indexes for location-based queries
 * - Indexes for trending suburbs calculation
 * - Indexes for search history
 * - Covering indexes for common query patterns
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { getDb } from '../server/db';

async function runMigration() {
  console.log('🚀 Starting location performance optimization migration...\n');

  try {
    const db = await getDb();
    
    // Read the migration SQL file
    const migrationPath = join(__dirname, '../drizzle/migrations/add-location-performance-indexes.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Split into individual statements (filter out comments and empty lines)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => 
        stmt.length > 0 && 
        !stmt.startsWith('--') && 
        !stmt.startsWith('/*')
      );
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    let successCount = 0;
    let skipCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Extract index name for logging
      const indexMatch = statement.match(/CREATE INDEX (?:IF NOT EXISTS )?(\w+)/i);
      const indexName = indexMatch ? indexMatch[1] : `Statement ${i + 1}`;
      
      try {
        await db.execute(statement);
        console.log(`✅ Created index: ${indexName}`);
        successCount++;
      } catch (error: any) {
        if (error.message?.includes('already exists') || error.message?.includes('Duplicate key')) {
          console.log(`⏭️  Skipped (already exists): ${indexName}`);
          skipCount++;
        } else {
          console.error(`❌ Failed to create index ${indexName}:`, error.message);
          throw error;
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully created: ${successCount} indexes`);
    console.log(`⏭️  Skipped (existing): ${skipCount} indexes`);
    console.log(`📈 Total processed: ${successCount + skipCount} indexes`);
    console.log('='.repeat(60));
    
    console.log('\n✨ Performance optimization migration completed successfully!\n');
    
    // Verify indexes were created
    console.log('🔍 Verifying indexes...\n');
    
    const verifyQueries = [
      {
        name: 'Listings indexes',
        query: `SHOW INDEX FROM listings WHERE Key_name LIKE 'idx_listings_%'`,
      },
      {
        name: 'Locations indexes',
        query: `SHOW INDEX FROM locations WHERE Key_name LIKE 'idx_locations_%'`,
      },
      {
        name: 'Location searches indexes',
        query: `SHOW INDEX FROM location_searches WHERE Key_name LIKE 'idx_location_searches_%'`,
      },
    ];
    
    for (const { name, query } of verifyQueries) {
      try {
        const result = await db.execute(query);
        const indexes = result.rows || [];
        console.log(`✅ ${name}: ${indexes.length} indexes found`);
      } catch (error) {
        console.log(`⚠️  Could not verify ${name} (table may not exist yet)`);
      }
    }
    
    console.log('\n📚 Performance Tips:');
    console.log('='.repeat(60));
    console.log('1. Monitor query performance with EXPLAIN ANALYZE');
    console.log('2. Check index usage with SHOW INDEX FROM table_name');
    console.log('3. Consider ANALYZE TABLE after bulk data imports');
    console.log('4. Monitor index size with information_schema.STATISTICS');
    console.log('5. Combine with Redis caching for optimal performance');
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();
