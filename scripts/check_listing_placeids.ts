import { config } from 'dotenv';
config();
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const db = await getDb();

    console.log('--- Query 1: Published Listings PlaceId Coverage ---');
    const query1 = sql`
      SELECT
        COUNT(*) AS published,
        SUM(placeId IS NOT NULL AND placeId <> '') AS publishedHasPlaceId,
        SUM(placeId IS NULL OR placeId = '') AS publishedMissingPlaceId
      FROM listings
      WHERE status = 'published';
    `;
    const result1 = await db.execute(query1);
    // @ts-ignore
    console.table(result1[0]);

    console.log('\n--- Query 2: PlaceId Resolver Coverage ---');
    const query2 = sql`
      SELECT
        COUNT(*) AS listingPlaceIds,
        SUM(l.id IS NOT NULL) AS matchedInLocations,
        SUM(l.id IS NULL) AS missingFromLocations
      FROM (
        SELECT DISTINCT placeId
        FROM listings
        WHERE placeId IS NOT NULL AND placeId <> ''
      ) lp
      LEFT JOIN locations l ON l.place_id = lp.placeId;
    `;
    const result2 = await db.execute(query2);
    // @ts-ignore
    console.table(result2[0]);

    process.exit(0);
  } catch (error) {
    console.error('Error running script:', error);
    process.exit(1);
  }
}

main();
