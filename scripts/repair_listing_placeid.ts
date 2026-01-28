import { config } from 'dotenv';
config();
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();

  console.log('--- Step 1: Repair listings with numeric placeId ---\n');

  // Find listings where placeId is numeric (misused as location_id)
  const badRecords = await db.execute(sql`
    SELECT id, placeId, location_id
    FROM listings
    WHERE placeId REGEXP '^[0-9]+$'
  `);

  console.log('Records with numeric placeId:', (badRecords[0] as any[]).length);
  console.table(badRecords[0]);

  // Repair: move numeric placeId to location_id
  const updateResult = await db.execute(sql`
    UPDATE listings
    SET location_id = CAST(placeId AS UNSIGNED),
        placeId = NULL
    WHERE placeId REGEXP '^[0-9]+$'
      AND location_id IS NULL
  `);

  console.log('\nUpdate result:', updateResult);

  // Verify
  console.log('\n--- Step 2: Verify repair ---\n');
  const verifyResult = await db.execute(sql`
    SELECT id, placeId, location_id
    FROM listings
    WHERE id = 360001
  `);
  console.table(verifyResult[0]);

  // Check if location_id now links correctly
  console.log('\n--- Step 3: Verify location link ---\n');
  const linkCheck = await db.execute(sql`
    SELECT 
      li.id as listingId,
      li.location_id,
      lo.id as locationId,
      lo.name,
      lo.type
    FROM listings li
    LEFT JOIN locations lo ON li.location_id = lo.id
    WHERE li.id = 360001
  `);
  console.table(linkCheck[0]);

  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
