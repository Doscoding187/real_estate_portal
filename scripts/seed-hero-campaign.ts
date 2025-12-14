
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

async function seed() {
  console.log('Seeding sample hero campaign...');
  
  try {
    const database = await getDb();
    if (!database) throw new Error('No database connection');

    // Clean up existing test campaign for this slug
    await database.execute(sql`
      DELETE FROM hero_campaigns 
      WHERE target_slug = 'gauteng/johannesburg';
    `);

    // Insert sample campaign
    await database.execute(sql`
      INSERT INTO hero_campaigns (
        location_type, target_slug, image_url, landing_page_url, alt_text, is_active
      ) VALUES (
        'city',
        'gauteng/johannesburg',
        'https://images.unsplash.com/photo-1577083288073-40892c0860a4?q=80&w=2670&auto=format&fit=crop',
        '/developments/sandton-skye',
        'Sandton Skye - Luxury Apartments Now Selling',
        1
      );
    `);

    console.log('✅ Sample campaign created for gauteng/johannesburg');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
