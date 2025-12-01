import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runExploreShortsMigration() {
  console.log('🚀 Starting Explore Shorts migration...');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(
      __dirname,
      '../drizzle/migrations/create-explore-shorts-tables.sql',
    );
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      await db.execute(sql.raw(statement));
    }

    console.log('✅ Explore Shorts tables created successfully!');
    console.log('\nCreated tables:');
    console.log('  - explore_shorts');
    console.log('  - explore_interactions');
    console.log('  - explore_highlight_tags');
    console.log('  - explore_user_preferences');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runExploreShortsMigration();
