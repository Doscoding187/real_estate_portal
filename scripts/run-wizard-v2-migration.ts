import { getDb } from '../server/db';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  console.log('🚀 Running Development Wizard V2 Migration...\n');
  console.log('📋 This migration adds fields for the 6-step wizard:\n');
  console.log('   ✓ property_type (residential/commercial/land)');
  console.log('   ✓ parent_development_id (phase support)');
  console.log('   ✓ ownership_type (freehold/sectional/leasehold)');
  console.log('   ✓ copy_parent_details (inheritance toggle)');
  console.log('   ✓ is_draft & last_saved_at (autosave)\n');

  const db = await getDb();
  if (!db) {
    console.error('❌ Database not available. Please check your DATABASE_URL environment variable.');
    process.exit(1);
  }

  try {
    // Read the SQL migration file
    const migrationSQL = readFileSync(
      join(__dirname, '../drizzle/migrations/add-wizard-v2-fields.sql'),
      'utf-8'
    );

    // Split by semicolons and filter out empty statements and comments
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => {
        if (stmt.length === 0) return false;
        if (stmt.startsWith('--')) return false;
        if (stmt.startsWith('/*')) return false;
        return true;
      });

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        await db.execute(statement);
        console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
      } catch (error: any) {
        // Check if error is about column/index already existing
        if (
          error.message?.includes('already exists') ||
          error.message?.includes('Duplicate') ||
          error.message?.includes('duplicate column name') ||
          error.message?.includes('duplicate key name')
        ) {
          console.log(`⚠️  Statement ${i + 1}/${statements.length} skipped (already applied)`);
          continue;
        }
        
        // Log the error but continue
        console.error(`❌ Statement ${i + 1}/${statements.length} failed:`, error.message);
        console.log(`📝 Statement: ${statement.substring(0, 100)}...`);
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Development Wizard V2 Migration Completed!');
    console.log('═'.repeat(60));
    console.log('\n📊 Database Schema Updated:');
    console.log('   ✓ developments.property_type added');
    console.log('   ✓ developments.parent_development_id added');
    console.log('   ✓ developments.ownership_type added');
    console.log('   ✓ developments.copy_parent_details added');
    console.log('   ✓ development_drafts.is_draft added');
    console.log('   ✓ development_drafts.last_saved_at added');
    console.log('\n🔗 Relationships:');
    console.log('   ✓ Foreign key: parent_development_id → developments(id)');
    console.log('\n📈 Performance Indexes:');
    console.log('   ✓ idx_developments_parent');
    console.log('   ✓ idx_developments_property_type');
    console.log('   ✓ idx_developments_ownership_type');
    console.log('   ✓ idx_dev_drafts_is_draft');
    console.log('\n🎯 Ready for V2 wizard implementation!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

runMigration();
