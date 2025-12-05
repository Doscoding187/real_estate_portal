import { db } from '../server/db';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
  console.log('🚀 Running Development Wizard Optimization Migration...\n');

  try {
    // Read the SQL migration file
    const migrationSQL = readFileSync(
      join(__dirname, '../drizzle/migrations/add-wizard-optimization-fields.sql'),
      'utf-8'
    );

    // Split by semicolons and filter out empty statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        await db.execute(statement);
        console.log(`✅ Statement ${i + 1} completed successfully\n`);
      } catch (error: any) {
        // Check if error is about column already existing
        if (error.message?.includes('Duplicate column name') || 
            error.message?.includes('already exists')) {
          console.log(`⚠️  Statement ${i + 1} skipped (already applied)\n`);
          continue;
        }
        throw error;
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('\n📊 New fields added to developments table:');
    console.log('   - suburb (VARCHAR)');
    console.log('   - postal_code (VARCHAR)');
    console.log('   - gps_accuracy (ENUM)');
    console.log('   - rating (DECIMAL)');
    console.log('   - amenities (JSON)');
    console.log('   - highlights (JSON)');
    console.log('   - features (JSON)');
    console.log('\n🔄 Status enum updated with new values');
    console.log('\n📈 Indexes created for performance');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

runMigration();
