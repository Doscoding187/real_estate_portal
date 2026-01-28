import { config } from 'dotenv';
config();
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const db = await getDb();
    console.log('Running manual migration: Add locationId to listings');

    // 1. Add column
    try {
      await db.execute(sql`ALTER TABLE listings ADD COLUMN locationId INT NULL`);
      console.log('✅ Added locationId column');
    } catch (e: any) {
      if (e.message.includes('Duplicate column name')) {
        console.log('ℹ️  locationId column already exists');
      } else {
        throw e;
      }
    }

    // 2. Add Indexes
    try {
      await db.execute(sql`CREATE INDEX idx_listings_location_id ON listings(locationId)`);
      console.log('✅ Created idx_listings_location_id');
    } catch (e: any) {
      if (e.message.includes('Duplicate key name')) {
        console.log('ℹ️  idx_listings_location_id already exists');
      } else {
        console.warn('⚠️  Could not create idx_listings_location_id:', e.message);
      }
    }

    try {
      await db.execute(sql`CREATE INDEX idx_listings_place_id ON listings(placeId)`);
      console.log('✅ Created idx_listings_place_id');
    } catch (e: any) {
      if (e.message.includes('Duplicate key name')) {
        console.log('ℹ️  idx_listings_place_id already exists');
      } else {
        console.warn('⚠️  Could not create idx_listings_place_id:', e.message);
      }
    }

    // 3. Verification
    const query = sql`
      SELECT
        COUNT(*) as total,
        SUM(locationId IS NOT NULL) as hasLocationId,
        SUM(locationId IS NULL) as missingLocationId
      FROM listings;
    `;
    const result = await db.execute(query);
    // @ts-ignore
    console.table(result[0]);

    process.exit(0);
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

main();
