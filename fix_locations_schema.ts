import 'dotenv/config';
import { getDb } from './server/db-connection';
import { sql } from 'drizzle-orm';

async function fixLocationsSchema() {
  const db = await getDb();
  if (!db) {
    console.error('Failed to connect to DB');
    return;
  }

  try {
    console.log('Altering locations table to add missing columns...');

    // Add place_id
    await db.execute(sql`
      ALTER TABLE locations 
      ADD COLUMN IF NOT EXISTS place_id VARCHAR(255)
    `);
    console.log('Added place_id column');

    try {
        await db.execute(sql`
          ALTER TABLE locations 
          ADD INDEX idx_locations_place_id (place_id)
        `);
        console.log('Added place_id index');
    } catch (e: any) {
        if (e.code === 'ER_DUP_KEYNAME') {
            console.log('Index idx_locations_place_id already exists');
        } else {
            console.error('Failed to create index:', e);
        }
    }

    // Add viewport columns
    await db.execute(sql`
      ALTER TABLE locations 
      ADD COLUMN IF NOT EXISTS viewport_ne_lat DECIMAL(10, 8),
      ADD COLUMN IF NOT EXISTS viewport_ne_lng DECIMAL(11, 8),
      ADD COLUMN IF NOT EXISTS viewport_sw_lat DECIMAL(10, 8),
      ADD COLUMN IF NOT EXISTS viewport_sw_lng DECIMAL(11, 8)
    `);
    console.log('Added viewport columns');

    // Add SEO columns
    await db.execute(sql`
      ALTER TABLE locations 
      ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255),
      ADD COLUMN IF NOT EXISTS seo_description TEXT,
      ADD COLUMN IF NOT EXISTS hero_image VARCHAR(500)
    `);
    console.log('Added SEO columns');

    console.log('Schema update complete.');

  } catch (e) {
    console.error('Error updating schema:', e);
  }
  
  process.exit(0);
}

fixLocationsSchema();
