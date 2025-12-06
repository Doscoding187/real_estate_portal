/**
 * Run Explore Discovery Engine Performance Indexes Migration
 * Task 17.3: Optimize database queries
 * 
 * Usage: npx tsx scripts/run-explore-performance-indexes.ts
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('🚀 Starting Explore Performance Indexes Migration...\n');

  const migrationPath = path.join(__dirname, '../drizzle/migrations/add-explore-performance-indexes.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  // Split by semicolons and filter out comments/empty statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const statement of statements) {
    // Skip comment-only blocks
    if (statement.split('\n').every(line => line.trim().startsWith('--') || line.trim() === '')) {
      continue;
    }

    // Extract index name for logging
    const indexMatch = statement.match(/CREATE INDEX.*?(\w+)\s+ON/i);
    const indexName = indexMatch ? indexMatch[1] : 'unknown';

    try {
      await db.execute(sql.raw(statement));
      console.log(`✅ Created index: ${indexName}`);
      successCount++;
    } catch (error: any) {
      if (error.message?.includes('Duplicate key name') || 
          error.message?.includes('already exists') ||
          error.code === 'ER_DUP_KEYNAME') {
        console.log(`⏭️  Index already exists: ${indexName}`);
        skipCount++;
      } else {
        console.error(`❌ Failed to create index ${indexName}:`, error.message);
        errorCount++;
      }
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Created: ${successCount}`);
  console.log(`   ⏭️  Skipped (already exist): ${skipCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log('\n✨ Migration complete!');

  process.exit(errorCount > 0 ? 1 : 0);
}

runMigration().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
