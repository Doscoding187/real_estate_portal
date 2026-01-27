/**
 * Read-only helper to dump recent unit_type rows for troubleshooting.
 * Run: npx tsx server/scripts/debug_unit_sql.ts
 */
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { db, getDb } from '../db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    await getDb(); // Initialize connection
    console.log('Running debug query for recent unit types...');

    // Using SELECT * to see all columns including potential 'category' or others
    const rows = await db.execute(sql`
      SELECT *
      FROM unit_types 
      ORDER BY updated_at DESC
      LIMIT 5
    `);

    // Rows is usually [data, metadata] in mysql2
    const data = (rows as any)[0];

    console.log('Found', data.length, 'rows');
    data.forEach((row: any, i: number) => {
      console.log(`\n--- Row ${i + 1} ---`);
      console.log('ID:', row.id);
      console.log('Structural Type:', row.structural_type);
      console.log('Name:', row.name);
      console.log('Category (if exists):', row.category);
      console.log('Base Media (Raw):', row.base_media);
      // console.log("Full Row:", JSON.stringify(row, null, 2)); // Reduced output for conciseness
    });
  } catch (e) {
    console.error('Query failed:', e);
  }
  process.exit(0);
}

main();
