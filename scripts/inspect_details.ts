import { config } from 'dotenv';
config();
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const db = await getDb();
    console.log('--- Listings Property Details ---');
    const result = await db.execute(
      sql`SELECT id, propertyDetails FROM listings WHERE propertyDetails IS NOT NULL LIMIT 5`,
    );
    // @ts-ignore
    const rows = result[0] as any[];
    for (const row of rows) {
      console.log(`Listing ${row.id}:`, JSON.stringify(row.propertyDetails, null, 2));
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
