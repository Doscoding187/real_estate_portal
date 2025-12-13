/**
 * Quick Bootstrap: Insert Essential Cities
 * 
 * Seeds the most popular SA cities so location pages work immediately.
 * The auto-population system will handle the rest as agents add properties.
 */

import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function bootstrapEssentialCities() {
  console.log('🏙️  Bootstrapping essential South African cities...\n');

  try {
    const db = await getDb();

    // Ensure cities and suburbs tables exist with slug columns
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS cities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        provinceId INT NOT NULL,
        name VARCHAR(150) NOT NULL,
        slug VARCHAR(100),
        latitude VARCHAR(20),
        longitude VARCHAR(21),
        isMetro INT DEFAULT 0 NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_province (provinceId),
        INDEX idx_name (name),
        INDEX idx_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS suburbs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cityId INT NOT NULL,
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(100),
        latitude VARCHAR(20),
        longitude VARCHAR(21),
        postalCode VARCHAR(10),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_city (cityId),
        INDEX idx_name (name),
        INDEX idx_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log('✅ Tables ready\n');

    // Essential cities to bootstrap (top cities for each province)
    const essentialCities = [
      // Gauteng (provinceId: 3)
      { name: 'Johannesburg', slug: 'johannesburg', provinceId: 3, lat: '-26.2041', lng: '28.0473', isMetro: 1 },
      { name: 'Pretoria', slug: 'pretoria', provinceId: 3, lat: '-25.7479', lng: '28.2293', isMetro: 1 },
      { name: 'Midrand', slug: 'midrand', provinceId: 3, lat: '-25.9784', lng: '28.1229', isMetro: 0 },
      { name: 'Centurion', slug: 'centurion', provinceId: 3, lat: '-25.8601', lng: '28.1889', isMetro: 0 },
      { name: 'Sandton', slug: 'sandton', provinceId: 3, lat: '-26.1076', lng: '28.0567', isMetro: 0 },
      
      // Western Cape (provinceId: 9)
      { name: 'Cape Town', slug: 'cape-town', provinceId: 9, lat: '-33.9249', lng: '18.4241', isMetro: 1 },
      { name: 'Stellenbosch', slug: 'stellenbosch', provinceId: 9, lat: '-33.9321', lng: '18.8602', isMetro: 0 },
      { name: 'Paarl', slug: 'paarl', provinceId: 9, lat: '-33.7328', lng: '18.9778', isMetro: 0 },
      { name: 'Somerset West', slug: 'somerset-west', provinceId: 9, lat: '-34.0782', lng: '18.8448', isMetro: 0 },
      
      // KwaZulu-Natal (provinceId: 4)
      { name: 'Durban', slug: 'durban', provinceId: 4, lat: '-29.8587', lng: '31.0218', isMetro: 1 },
      { name: 'Pietermaritzburg', slug: 'pietermaritzburg', provinceId: 4, lat: '-29.6001', lng: '30.3799', isMetro: 0 },
      { name: 'Ballito', slug: 'ballito', provinceId: 4, lat: '-29.5392', lng: '31.2133', isMetro: 0 },
      
      // Eastern Cape (provinceId: 1)
      { name: 'Port Elizabeth', slug: 'port-elizabeth', provinceId: 1, lat: '-33.9608', lng: '25.6022', isMetro: 0 },
      { name: 'East London', slug: 'east-london', provinceId: 1, lat: '-33.0148', lng: '27.9116', isMetro: 0 },
      
      // Free State (provinceId: 2)
      { name: 'Bloemfontein', slug: 'bloemfontein', provinceId: 2, lat: '-29.1212', lng: '26.2041', isMetro: 0 },
    ];

    console.log('📍 Inserting essential cities...\n');
    let inserted = 0;
    let skipped = 0;

    for (const city of essentialCities) {
      try {
        await db.execute(sql`
          INSERT INTO cities (provinceId, name, slug, latitude, longitude, isMetro)
          VALUES (${city.provinceId}, ${city.name}, ${city.slug}, ${city.lat}, ${city.lng}, ${city.isMetro})
          ON DUPLICATE KEY UPDATE 
            slug = ${city.slug},
            latitude = ${city.lat},
            longitude = ${city.lng}
        `);
        inserted++;
        console.log(`   ✅ ${city.name}`);
      } catch (err: any) {
        skipped++;
        console.log(`   ⚠️  ${city.name} (already exists)`);
      }
    }

    // Add a few popular suburbs for Johannesburg
    const johannesburgSuburbs = [
      { name: 'Sandton', slug: 'sandton', cityName: 'Johannesburg', lat: '-26.1076', lng: '28.0567' },
      { name: 'Rosebank', slug: 'rosebank', cityName: 'Johannesburg', lat: '-26.1486', lng: '28.0433' },
      { name: 'Fourways', slug: 'fourways', cityName: 'Johannesburg', lat: '-26.0127', lng: '28.0091' },
      { name: 'Bryanston', slug: 'bryanston', cityName: 'Johannesburg', lat: '-26.0742', lng: '28.0190' },
    ];

    // Add suburbs for Cape Town
    const capeTownSuburbs = [
      { name: 'Green Point', slug: 'green-point', cityName: 'Cape Town', lat: '-33.9067', lng: '18.4056' },
      { name: 'Sea Point', slug: 'sea-point', cityName: 'Cape Town', lat: '-33.9092', lng: '18.3816' },
      { name: 'Constantia', slug: 'constantia', cityName: 'Cape Town', lat: '-34.0050', lng: '18.4167' },
      { name: 'Camps Bay', slug: 'camps-bay', cityName: 'Cape Town', lat: '-33.9512', lng: '18.3775' },
    ];

    const allSuburbs = [...johannesburgSuburbs, ...capeTownSuburbs];

    console.log('\n🏘️  Inserting popular suburbs...\n');

    for (const suburb of allSuburbs) {
      try {
        // Get city ID
        const [cityResult] = await db.execute(sql`
          SELECT id FROM cities WHERE name = ${suburb.cityName} LIMIT 1
        `);
        
        const cityId = (cityResult as any)?.id;
        if (!cityId) {
          console.log(`   ⚠️  ${suburb.name}: City not found`);
          continue;
        }

        await db.execute(sql`
          INSERT INTO suburbs (cityId, name, slug, latitude, longitude)
          VALUES (${cityId}, ${suburb.name}, ${suburb.slug}, ${suburb.lat}, ${suburb.lng})
          ON DUPLICATE KEY UPDATE 
            slug = ${suburb.slug},
            latitude = ${suburb.lat},
            longitude = ${suburb.lng}
        `);
        console.log(`   ✅ ${suburb.name} (${suburb.cityName})`);
      } catch (err: any) {
        console.log(`   ⚠️  ${suburb.name}: ${err.message}`);
      }
    }

    // Verify
    const [provinces] = await db.execute(sql`SELECT COUNT(*) as count FROM provinces`);
    const [cities] = await db.execute(sql`SELECT COUNT(*) as count FROM cities`);
    const [suburbs] = await db.execute(sql`SELECT COUNT(*) as count FROM suburbs`);

    console.log('\n✅ Bootstrap Complete!\n');
    console.log(`📊 Database Summary:`);
    console.log(`   Provinces: ${(provinces as any).count}`);
    console.log(`   Cities: ${(cities as any).count}`);
    console.log(`   Suburbs: ${(suburbs as any).count}\n`);

    console.log('🎉 Location pages are now ready!\n');
    console.log('📝 Test these URLs:');
    console.log('   ✅ http://localhost:3001/gauteng');
    console.log('   ✅ http://localhost:3001/gauteng/johannesburg');
    console.log('   ✅ http://localhost:3001/gauteng/johannesburg/sandton');
    console.log('   ✅ http://localhost:3001/western-cape/cape-town');
    console.log('   ✅ http://localhost:3001/kwazulu-natal/durban\n');

    console.log('💡 Note: More cities and suburbs will auto-populate as agents add listings!\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

bootstrapEssentialCities()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
