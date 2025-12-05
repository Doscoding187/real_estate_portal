import { db } from '../server/db';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
  try {
    console.log('🚀 Running enhanced unit types migration...');

    const migrationSQL = readFileSync(
      join(__dirname, '../drizzle/migrations/add-enhanced-unit-types.sql'),
      'utf-8'
    );

    // Split by semicolon and filter out empty statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 100) + '...');
      await db.execute(statement);
    }

    console.log('✅ Enhanced unit types migration completed successfully!');
    console.log('\nNew features added:');
    console.log('  ✓ Comprehensive unit type configuration');
    console.log('  ✓ Specification inheritance and overrides');
    console.log('  ✓ Unit-specific media management');
    console.log('  ✓ Upgrade packs and optional extras');
    console.log('  ✓ Custom specifications support');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
