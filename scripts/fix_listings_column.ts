import { config } from 'dotenv';
config();
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const db = await getDb();
    console.log('Renaming listings.locationId to location_id...');

    // Check if locationId exists
    try {
      await db.execute(sql`ALTER TABLE listings CHANGE locationId location_id INT NULL`);
      console.log('✅ Renamed locationId to location_id');
    } catch (e: any) {
      if (e.message.includes("Unknown column 'locationId'")) {
        console.log('ℹ️  locationId column not found (maybe already renamed?)');
      } else {
        throw e;
      }
    }

    // Drop old index if exists (it was idx_listings_location_id on locationId)
    // The previous script created 'idx_listings_location_id'.
    // Rename column usually keeps index but update metadata?
    // Let's ensure index exists on new column.

    // Re-create index to be sure
    try {
      await db.execute(sql`DROP INDEX idx_listings_location_id ON listings`);
    } catch (e) {} // ignore if missing

    try {
      await db.execute(sql`CREATE INDEX idx_listings_location_id ON listings(location_id)`);
      console.log('✅ Re-created idx_listings_location_id on location_id');
    } catch (e: any) {
      console.log('Index creation info:', e.message);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
