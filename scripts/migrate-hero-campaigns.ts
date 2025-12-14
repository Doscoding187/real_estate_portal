
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  console.log('Starting manual migration for hero_campaigns...');
  
  try {
    const database = await getDb();
    if (!database) {
      throw new Error('Could not connect to database');
    }

    console.log('Creating hero_campaigns table...');
    
    // Raw SQL to create the table if it doesn't exist
    // Using MySQL syntax compatible with TiDB
    await database.execute(sql`
      CREATE TABLE IF NOT EXISTS hero_campaigns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        location_type ENUM('province', 'city', 'suburb') NOT NULL,
        target_slug VARCHAR(255) NOT NULL,
        image_url VARCHAR(1024) NOT NULL,
        landing_page_url VARCHAR(1024),
        alt_text VARCHAR(255),
        start_date TIMESTAMP NULL,
        end_date TIMESTAMP NULL,
        is_active TINYINT NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_hero_campaigns_slug (target_slug),
        INDEX idx_hero_campaigns_active (is_active),
        INDEX idx_hero_campaigns_dates (start_date, end_date)
      );
    `);

    console.log('✅ hero_campaigns table created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
