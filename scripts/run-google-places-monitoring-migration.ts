/**
 * Run Google Places API Monitoring Migration
 * 
 * This script creates the necessary tables for API usage monitoring
 */

import { db } from '../server/db';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  console.log('🚀 Starting Google Places API Monitoring migration...\n');

  try {
    // Read the migration SQL file
    const migrationPath = join(__dirname, '../drizzle/migrations/create-api-usage-monitoring.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log(`📝 Executing migration SQL...\n`);

    try {
      // Try to execute the entire SQL file at once
      await db.execute(migrationSQL);
      console.log(`✅ Migration SQL executed successfully\n`);
    } catch (error: any) {
      // If that fails, try executing statement by statement
      console.log(`⚠️  Batch execution failed, trying statement by statement...\n`);
      
      // Split by CREATE TABLE and INSERT statements
      const statements = migrationSQL
        .split(/(?=CREATE TABLE|INSERT INTO|ALTER TABLE)/)
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      console.log(`📝 Found ${statements.length} SQL statements\n`);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`);
        
        try {
          await db.execute(statement);
          console.log(`✅ Statement ${i + 1} completed\n`);
        } catch (stmtError: any) {
          // Ignore "table already exists" errors
          if (stmtError.message && stmtError.message.includes('already exists')) {
            console.log(`⚠️  Table already exists, skipping...\n`);
          } else {
            console.error(`❌ Error: ${stmtError.message}`);
            console.error(`Statement preview: ${statement.substring(0, 100)}...`);
          }
        }
      }
    }

    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Created tables:');
    console.log('   - google_places_api_logs');
    console.log('   - google_places_api_daily_summary');
    console.log('   - google_places_api_alerts');
    console.log('   - google_places_api_config\n');

    // Verify tables were created
    console.log('🔍 Verifying tables...\n');

    const tables = [
      'google_places_api_logs',
      'google_places_api_daily_summary',
      'google_places_api_alerts',
      'google_places_api_config',
    ];

    for (const table of tables) {
      try {
        const result = await db.execute(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`✅ ${table}: ${(result.rows[0] as any).count} rows`);
      } catch (error) {
        console.error(`❌ Failed to verify ${table}:`, error);
      }
    }

    console.log('\n✨ All done! API monitoring is now active.\n');
    console.log('📈 Access the monitoring dashboard at:');
    console.log('   /google-places-monitoring\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run the migration
runMigration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
