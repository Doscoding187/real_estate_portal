import { config } from 'dotenv';
config();
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const db = await getDb();
    console.log('--- Listings PlaceIDs ---');
    const result1 = await db.execute(
      sql`SELECT id, placeId, city, suburb FROM listings WHERE placeId IS NOT NULL`,
    );
    // @ts-ignore
    console.table(result1[0]);

    console.log('\n--- Locations Sample ---');
    const result2 = await db.execute(sql`SELECT id, place_id, name, type FROM locations LIMIT 10`);
    // @ts-ignore
    console.table(result2[0]);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
