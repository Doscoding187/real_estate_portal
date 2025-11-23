
import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const db = await getDb();
    console.log('Running migration...');

    // Create table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        place_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        full_address TEXT NOT NULL,
        location_type VARCHAR(50) NOT NULL,
        province VARCHAR(100),
        country VARCHAR(100) DEFAULT 'South Africa',
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // Create indexes (check if they exist first or just ignore error if they do)
    try {
      await db.execute(sql`CREATE INDEX idx_locations_place_id ON locations(place_id);`);
    } catch (e) { console.log('Index idx_locations_place_id might already exist'); }

    try {
      await db.execute(sql`CREATE INDEX idx_locations_name ON locations(name);`);
    } catch (e) { console.log('Index idx_locations_name might already exist'); }

    try {
      await db.execute(sql`CREATE INDEX idx_locations_type ON locations(location_type);`);
    } catch (e) { console.log('Index idx_locations_type might already exist'); }

    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
