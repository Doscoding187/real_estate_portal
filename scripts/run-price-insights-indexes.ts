import { db } from '../server/db';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Run price insights indexes migration
 * Adds indexes to optimize price insights queries
 */
async function runMigration() {
  console.log('🔧 Running price insights indexes migration...');

  try {
    const dbInstance = await db;
    
    // Read the SQL migration file
    const migrationSQL = readFileSync(
      join(__dirname, '../drizzle/migrations/add-price-insights-indexes.sql'),
      'utf-8'
    );

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 60)}...`);
      await dbInstance.execute(statement);
    }

    console.log('✅ Price insights indexes migration completed successfully!');
    console.log('\nIndexes added:');
    console.log('  - idx_properties_cityId');
    console.log('  - idx_properties_suburbId');
    console.log('  - idx_properties_cityId_status');
    console.log('  - idx_properties_cityId_area');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
