import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function auditSchema() {
  console.log('--- AUDIT START ---');

  try {
    const tables = ['developments', 'developers', 'developer_profiles', 'developer_brand_profiles'];

    for (const table of tables) {
      console.log(`\n\n--- TABLE: ${table} ---`);
      try {
        const result = await db.execute(sql.raw(`SHOW COLUMNS FROM ${table}`));
        // Inspect the result structure
        // Usually result is [rows, fields] in mysql2
        const rows = result[0];
        console.log(JSON.stringify(rows, null, 2));
      } catch (err: any) {
        console.error(`Error querying table ${table}:`, err.message);
      }
    }
  } catch (error) {
    console.error('Audit failed:', error);
  } finally {
    console.log('\n--- AUDIT END ---');
    process.exit(0);
  }
}

auditSchema();
