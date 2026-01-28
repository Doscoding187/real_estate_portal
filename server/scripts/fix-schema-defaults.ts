/**
 * Check developments table schema and apply missing defaults
 * Run: npx tsx server/scripts/fix-schema-defaults.ts
 */
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

import { getDb } from '../db-connection';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  console.log('\n--- 1. Checking current schema for views/isFeatured ---\n');

  // Check current column definitions
  const [columns] = await db.execute(sql`
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'developments' 
    AND COLUMN_NAME IN ('views', 'isFeatured')
  `);

  console.log('Current column definitions:');
  console.log(JSON.stringify(columns, null, 2));

  console.log('\n--- 2. Applying default value migrations ---\n');

  // Apply the fixes
  try {
    await db.execute(sql`
      ALTER TABLE developments 
      MODIFY COLUMN views INT NOT NULL DEFAULT 0
    `);
    console.log('✅ Applied: views INT NOT NULL DEFAULT 0');
  } catch (e: any) {
    console.log(`⚠️ views: ${e.message}`);
  }

  try {
    await db.execute(sql`
      ALTER TABLE developments 
      MODIFY COLUMN isFeatured INT NOT NULL DEFAULT 0
    `);
    console.log('✅ Applied: isFeatured INT NOT NULL DEFAULT 0');
  } catch (e: any) {
    console.log(`⚠️ isFeatured: ${e.message}`);
  }

  console.log('\n--- 3. Verifying updated schema ---\n');

  const [updatedColumns] = await db.execute(sql`
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'developments' 
    AND COLUMN_NAME IN ('views', 'isFeatured')
  `);

  console.log('Updated column definitions:');
  console.log(JSON.stringify(updatedColumns, null, 2));

  console.log('\n✅ Schema fix complete.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
