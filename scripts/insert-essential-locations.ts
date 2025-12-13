/**
 * Quick Fix: Insert Essential Location Data
 * 
 * This script directly inserts the minimum required data to test location pages
 */

import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function insertEssentialData() {
  console.log('⚡ Quick Fix: Inserting essential location data...\n');

  try {
    const db = await getDb();

    // Insert key cities with slugs if they don't exist
    const cityData = [
      // Gauteng cities
      { name: 'Johannesburg', slug: 'johannesburg', provinceId: 3 },
      { name: 'Pretoria', slug: 'pretoria', provinceId: 3 },
      { name: 'Midrand', slug: 'midrand', provinceId: 3 },
      { name: 'Centurion', slug: 'centurion', provinceId: 3 },
      { name: 'Roodepoort', slug: 'roodepoort', provinceId: 3 },
      { name: 'Boksburg', slug: 'boksburg', provinceId: 3 },
      { name: 'Benoni', slug: 'benoni', provinceId: 3 },
      // Western Cape cities
      { name: 'Cape Town', slug: 'cape-town', provinceId: 9 },
      { name: 'Stellenbosch', slug: 'stellenbosch', provinceId: 9 },
      { name: 'Paarl', slug: 'paarl', provinceId: 9 },
      { name: 'Somerset West', slug: 'somerset-west', provinceId: 9 },
      // KZN cities
      { name: 'Durban', slug: 'durban', provinceId: 4 },
      { name: 'Pietermaritzburg', slug: 'pietermaritzburg', provinceId: 4 },
      { name: 'Ballito', slug: 'ballito', provinceId: 4 },
    ];

    console.log('📍 Inserting cities...');
    for (const city of cityData) {
      try {
        await db.execute(sql`
          INSERT INTO cities (name, slug, provinceId, isMetro, latitude, longitude)
          VALUES (${city.name}, ${city.slug}, ${city.provinceId}, 0, 0, 0)
          ON DUPLICATE KEY UPDATE slug = ${city.slug}
        `);
        console.log(`   ✅ ${city.name}`);
      } catch (err: any) {
        if (!err.message.includes('Duplicate')) {
          console.log(`   ⚠️  ${city.name}: ${err.message}`);
        }
      }
    }

    // Insert key suburbs
    const suburbData = [
      // Johannesburg suburbs (cityId will be looked up)
      { name: 'Sandton', slug: 'sandton', cityName: 'Johannesburg' },
      { name: 'Rosebank', slug: 'rosebank', cityName: 'Johannesburg' },
      { name: 'Fourways', slug: 'fourways', cityName: 'Johannesburg' },
      { name: 'Bryanston', slug: 'bryanston', cityName: 'Johannesburg' },
      { name: 'Hyde Park', slug: 'hyde-park', cityName: 'Johannesburg' },
      // Cape Town suburbs
      { name: 'Green Point', slug: 'green-point', cityName: 'Cape Town' },
      { name: 'Sea Point', slug: 'sea-point', cityName: 'Cape Town' },
      { name: 'Constantia', slug: 'constantia', cityName: 'Cape Town' },
      { name: 'Camps Bay', slug: 'camps-bay', cityName: 'Cape Town' },
      // Durban suburbs
      { name: 'Umhlanga', slug: 'umhlanga', cityName: 'Durban' },
      { name: 'Durban North', slug: 'durban-north', cityName: 'Durban' },
      { name: 'Westville', slug: 'westville', cityName: 'Durban' },
    ];

    console.log('\n🏘️  Inserting suburbs...');
    for (const suburb of suburbData) {
      try {
        // First get the cityId
        const [cityResult] = await db.execute(sql`
          SELECT id FROM cities WHERE name = ${suburb.cityName} LIMIT 1
        `);
        
        const cityId = (cityResult as any)?.id;
        if (!cityId) {
          console.log(`   ⚠️  ${suburb.name}: City '${suburb.cityName}' not found`);
          continue;
        }

        await db.execute(sql`
          INSERT INTO suburbs (name, slug, cityId, latitude, longitude)
          VALUES (${suburb.name}, ${suburb.slug}, ${cityId}, 0, 0)
          ON DUPLICATE KEY UPDATE slug = ${suburb.slug}
        `);
        console.log(`   ✅ ${suburb.name} (${suburb.cityName})`);
      } catch (err: any) {
        if (!err.message.includes('Duplicate')) {
          console.log(`   ⚠️  ${suburb.name}: ${err.message}`);
        }
      }
    }

    // Verify counts
    console.log('\n🔍 Verifying data...\n');
    
    const [provinces] = await db.execute(sql`SELECT COUNT(*) as count FROM provinces`);
    const [cities] = await db.execute(sql`SELECT COUNT(*) as count FROM cities`);
    const [suburbs] = await db.execute(sql`SELECT COUNT(*) as count FROM suburbs`);

    console.log(`✅ Provinces: ${(provinces as any).count}`);
    console.log(`✅ Cities: ${(cities as any).count}`);
    console.log(`✅ Suburbs: ${(suburbs as any).count}`);

    console.log('\n🎉 Quick fix complete!\n');
    console.log('📝 Test these URLs:');
    console.log('   - http://localhost:3001/gauteng');
    console.log('   - http://localhost:3001/gauteng/johannesburg');
    console.log('   - http://localhost:3001/gauteng/johannesburg/sandton');
    console.log('   - http://localhost:3001/western-cape/cape-town\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

insertEssentialData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
