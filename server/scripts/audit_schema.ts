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
        // Filter out sensitive or irrelevant info if needed, but for now showing all as requested
        // The result usually comes as distinct rows. We'll try to print them clearly.
        // Drizzle execute result structure depends on driver, assuming standard mysql2/similar output
        const rows = result[0] as any[];
        if (Array.isArray(rows)) {
          console.table(
            rows.map((row: any) => ({
              Field: row.Field,
              Type: row.Type,
              Null: row.Null,
              Key: row.Key,
              Default: row.Default,
              Extra: row.Extra,
            })),
          );
        } else {
          console.log('Unexpected result format:', result);
        }
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
