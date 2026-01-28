import { config } from 'dotenv';
config();
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();

  console.log('--- Listings PlaceId vs Locations Mismatch ---\n');

  const result = await db.execute(sql`
    SELECT
      li.id,
      li.status,
      li.city,
      li.suburb,
      li.province,
      li.placeId,
      lo.id AS locationRowId,
      lo.type,
      lo.name,
      lo.parentId
    FROM listings li
    LEFT JOIN locations lo ON lo.place_id = li.placeId
    WHERE li.placeId IS NOT NULL AND li.placeId <> ''
  `);

  const rows = result[0] as any[];
  console.log(`Found ${rows.length} listings with placeId:\n`);
  console.table(rows);

  // Summary
  const matched = rows.filter(r => r.locationRowId !== null).length;
  const unmatched = rows.filter(r => r.locationRowId === null).length;
  console.log(`\n--- Summary ---`);
  console.log(`Matched (location found): ${matched}`);
  console.log(`Unmatched (no location): ${unmatched}`);

  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
