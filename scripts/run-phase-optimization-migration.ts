import { getDb } from '../server/db';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  console.log('🚀 Running phase optimization migration...\n');

  try {
    const db = await getDb();
    if (!db) {
      throw new Error('Database connection failed');
    }

    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'drizzle/migrations/add-phase-optimization-fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolon and filter out empty statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    // Execute each statement
    for (const statement of statements) {
      const cleanStatement = statement.replace(/--.*$/gm, '').trim();
      if (cleanStatement) {
        console.log(`Executing: ${cleanStatement.substring(0, 80)}...`);
        await db.execute(cleanStatement);
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nAdded fields:');
    console.log('  - spec_type (ENUM)');
    console.log('  - custom_spec_type (VARCHAR)');
    console.log('  - finishing_differences (JSON)');
    console.log('  - phase_highlights (JSON)');
    console.log('  - latitude (VARCHAR)');
    console.log('  - longitude (VARCHAR)');
    console.log('  - Index on spec_type');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
