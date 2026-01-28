import { config } from 'dotenv';
config();
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const db = await getDb();
    console.log('Running backfill: listings.locationId from locations.place_id');

    // Perform UPDATE with JOIN
    // Note: Drizzle sql template might need raw string for complex updates if dialect specific,
    // but execute(sql`...`) passes raw SQL which is fine for TiDB/MySQL.
    const result = await db.execute(sql`
      UPDATE listings li
      JOIN locations lo ON lo.place_id = li.placeId
      SET li.locationId = lo.id
      WHERE li.locationId IS NULL
        AND li.placeId IS NOT NULL
        AND li.placeId <> ''
    `);

    console.log('✅ Backfill update executed.');

    // Verification
    const query = sql`
      SELECT
        COUNT(*) as total,
        SUM(locationId IS NOT NULL) as hasLocationId,
        SUM(locationId IS NULL) as missingLocationId
      FROM listings;
    `;
    const verifyResult = await db.execute(query);
    // @ts-ignore
    console.table(verifyResult[0]);

    process.exit(0);
  } catch (error) {
    console.error('Error running backfill:', error);
    process.exit(1);
  }
}

main();
