import { config } from 'dotenv';
config();
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const db = await getDb();
    console.log('--- Listings Columns (Names) ---');
    const cols = await db.execute(
      sql`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'listify_property_sa' AND TABLE_NAME = 'listings'`,
    );
    // @ts-ignore
    const rows = cols[0];
    // @ts-ignore
    console.log(rows.map(r => r.COLUMN_NAME).join(', '));

    console.log('\n--- Unit Types Columns ---');
    const cols2 = await db.execute(
      sql`SELECT COLUMN_NAME, TABLE_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'listify_property_sa' AND TABLE_NAME LIKE 'unit%'`,
    );
    // @ts-ignore
    console.table(cols2[0]);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
