import { config } from 'dotenv';
config();

import { getDb } from '../server/db';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('🚀 Running development location fields migration...');
  
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('Database connection failed');
    }

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../drizzle/migrations/add-development-location-fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    for (const statement of statements) {
      console.log(`\n  Executing: ${statement.substring(0, 80)}...`);
      try {
        await db.execute(statement);
        console.log('  ✅ Success');
      } catch (error: any) {
        if (error.message?.includes('Duplicate column name')) {
          console.log('  ⚠️  Column already exists, skipping');
        } else if (error.message?.includes('Duplicate key name')) {
          console.log('  ⚠️  Index already exists, skipping');
        } else {
          throw error;
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nAdded columns:');
    console.log('  - slug (VARCHAR(255))');
    console.log('  - isPublished (TINYINT)');
    console.log('  - publishedAt (TIMESTAMP)');
    console.log('  - showHouseAddress (TINYINT)');
    console.log('  - floorPlans (TEXT)');
    console.log('  - brochures (TEXT)');
    console.log('\nAdded indexes:');
    console.log('  - idx_developments_slug (UNIQUE)');
    console.log('  - idx_developments_location');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
