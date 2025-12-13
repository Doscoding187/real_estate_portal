/**
 * Seed Provinces Only
 * 
 * Run this once to create the 9 South African provinces.
 * Cities and suburbs will be auto-created from Google Places data.
 */

import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function seedProvinces() {
  console.log('🗺️  Seeding South African Provinces...\n');

  try {
    const db = await getDb();

    // Ensure provinces table exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS provinces (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(10) UNIQUE NOT NULL,
        slug VARCHAR(100),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_name (name),
        INDEX idx_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log('✅ Provinces table ready\n');

    // Insert 9 SA provinces
    const provinces = [
      { name: 'Eastern Cape', code: 'EC', slug: 'eastern-cape', lat: -32.2968, lng: 26.2772 },
      { name: 'Free State', code: 'FS', slug: 'free-state', lat: -28.4541, lng: 26.7968 },
      { name: 'Gauteng', code: 'GP', slug: 'gauteng', lat: -26.2041, lng: 28.0473 },
      { name: 'KwaZulu-Natal', code: 'KZN', slug: 'kwazulu-natal', lat: -29.0122, lng: 30.4497 },
      { name: 'Limpopo', code: 'LP', slug: 'limpopo', lat: -23.8864, lng: 29.4179 },
      { name: 'Mpumalanga', code: 'MP', slug: 'mpumalanga', lat: -25.5653, lng: 30.5279 },
      { name: 'Northern Cape', code: 'NC', slug: 'northern-cape', lat: -29.0467, lng: 21.8569 },
      { name: 'North West', code: 'NW', slug: 'north-west', lat: -26.6639, lng: 25.2837 },
      { name: 'Western Cape', code: 'WC', slug: 'western-cape', lat: -33.2277, lng: 21.8569 }
    ];

    console.log('📍 Inserting provinces...\n');
    let inserted = 0;
    let skipped = 0;

    for (const province of provinces) {
      try {
        await db.execute(sql`
          INSERT INTO provinces (name, code, slug, latitude, longitude)
          VALUES (${province.name}, ${province.code}, ${province.slug}, ${province.lat}, ${province.lng})
          ON DUPLICATE KEY UPDATE 
            slug = ${province.slug},
            latitude = ${province.lat},
            longitude = ${province.lng}
        `);
        inserted++;
        console.log(`   ✅ ${province.name}`);
      } catch (err: any) {
        skipped++;
        console.log(`   ⚠️  ${province.name} (already exists)`);
      }
    }

    // Verify
    const [result] = await db.execute(sql`SELECT COUNT(*) as count FROM provinces`);
    const count = (result as any).count;

    console.log(`\n✅ Complete! ${count} provinces in database`);
    console.log(`   📊 Inserted: ${inserted}, Skipped: ${skipped}\n`);
    
    console.log('📋 Provinces will be used for location pages');
    console.log('🏙️  Cities and suburbs will auto-create when agents add properties!\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

seedProvinces()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
