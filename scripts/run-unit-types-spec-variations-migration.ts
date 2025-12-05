import { db } from '../server/db';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
  console.log('🚀 Running Unit Types & Spec Variations Migration...\n');

  try {
    // Read the SQL migration file
    const migrationSQL = readFileSync(
      join(__dirname, '../drizzle/migrations/create-unit-types-spec-variations.sql'),
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
        // Check if error is about table already existing
        if (error.message?.includes('already exists') || 
            error.message?.includes('Duplicate')) {
          console.log(`⚠️  Statement ${i + 1} skipped (already applied)\n`);
          continue;
        }
        throw error;
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Tables created:');
    console.log('   ✓ unit_types (Base Configuration)');
    console.log('   ✓ spec_variations (Specs & Variations)');
    console.log('   ✓ development_documents (Documents)');
    console.log('\n🔗 Specification Inheritance Model:');
    console.log('   Final Spec = Unit Type Base + Overrides');
    console.log('\n📈 Indexes created for performance');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

runMigration();
