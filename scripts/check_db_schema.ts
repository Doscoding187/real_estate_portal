import { config } from 'dotenv';
config();
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const db = await getDb();
    console.log('--- Listings Columns ---');
    const cols1 = await db.execute(sql`SHOW COLUMNS FROM listings`);
    // @ts-ignore
    console.table(cols1[0]);

    console.log('\n--- Developments Columns ---');
    const cols2 = await db.execute(sql`SHOW COLUMNS FROM developments`);
    // @ts-ignore
    console.table(cols2[0]);

    console.log('\n--- Unit Types Columns ---'); // Table name might be unit_types or unitTypes
    try {
      const cols3 = await db.execute(sql`SHOW COLUMNS FROM unit_types`);
      // @ts-ignore
      console.table(cols3[0]);
    } catch (e) {
      console.log('unit_types not found, trying unitTypes...');
      try {
        const cols4 = await db.execute(sql`SHOW COLUMNS FROM unitTypes`);
        // @ts-ignore
        console.table(cols4[0]);
      } catch (e2) {
        console.log('Neither unit_types nor unitTypes found.');
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
