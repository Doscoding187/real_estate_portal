
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

async function seedFallback() {
  console.log('Seeding fallback campaigns...');
  
  try {
    const database = await getDb();
    if (!database) throw new Error('No database connection');

    // 1. Clean up potential conflicts
    await database.execute(sql`
      DELETE FROM hero_campaigns 
      WHERE target_slug IN ('western-cape', 'western-cape/cape-town');
    `);

    // 2. Insert ONLY a Province campaign (Western Cape)
    await database.execute(sql`
      INSERT INTO hero_campaigns (
        location_type, target_slug, image_url, landing_page_url, alt_text, is_active
      ) VALUES (
        'province',
        'western-cape',
        'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?q=80&w=2671&auto=format&fit=crop',
        '/developments/western-cape-summer',
        'Summer in the Cape - Province Wide Special',
        1
      );
    `);

    console.log('✅ Created Province campaign: western-cape');
    console.log('ℹ️  No City campaign created for Cape Town.');
    console.log('👉 Visit /western-cape/cape-town to verify it shows the Western Cape banner.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedFallback();
