import 'dotenv/config';
import { readFileSync } from 'fs';
import { getDb } from '../server/db-connection';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  console.log('\n--- Applying Financial Columns Migration ---');
  
  const db = await getDb();
  if (!db) {
    console.error('❌ Database connection failed');
    return;
  }

  const migrationPath = join(__dirname, '../drizzle/0011_add_financial_columns.sql');
  const sql = readFileSync(migrationPath, 'utf8');
  
  // Split by SQL statements (semicolon + newline)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`\nFound ${statements.length} SQL statements to execute:\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    console.log(`[${i + 1}/${statements.length}] ${stmt.substring(0, 80)}...`);
    
    try {
      await db.execute(stmt);
      console.log('  ✅ Success');
    } catch (error: any) {
      // If column already exists, that's okay (idempotent)
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('  ⚠️  Column already exists (skipping)');
      } else {
        console.error('  ❌ Error:', error.message);
        throw error;
      }
    }
  }

  console.log('\n✅ Migration applied successfully!');
  process.exit(0);
}

applyMigration().catch((error) => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});
