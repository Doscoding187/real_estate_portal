import { config } from 'dotenv';
config();
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const db = await getDb();
    console.log('--- Row Counts ---');
    const c1 = await db.execute(sql`SELECT COUNT(*) as count FROM listings`);
    // @ts-ignore
    console.log('Listings count:', c1[0][0].count);

    const c2 = await db.execute(sql`SELECT COUNT(*) as count FROM properties`);
    // @ts-ignore
    console.log('Properties count:', c2[0][0].count);

    console.log('\n--- Location ID Populated Counts ---');
    // Check location_id in properties
    const pLoc = await db.execute(
      sql`SELECT COUNT(*) as count FROM properties WHERE location_id IS NOT NULL`,
    );
    // @ts-ignore
    console.log('Properties with location_id != NULL:', pLoc[0][0].count);

    // Check locationId in listings (if exists)
    try {
      const lLoc = await db.execute(
        sql`SELECT COUNT(*) as count FROM listings WHERE locationId IS NOT NULL`,
      );
      // @ts-ignore
      console.log('Listings with locationId != NULL:', lLoc[0][0].count);
    } catch (e) {
      console.log('Listings locationId check failed (column missing?)');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
