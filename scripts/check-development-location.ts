/**
 * Check Development Location Data
 * 
 * Run: npx tsx scripts/check-development-location.ts
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';

async function checkDevelopmentLocation() {
  console.log('🔍 Checking development location data...\n');

  const dbUrl = process.env.DATABASE_URL!;
  const url = new URL(dbUrl);
  
  const config = {
    host: url.hostname,
    port: parseInt(url.port || '3306'),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: url.searchParams.get('ssl') === 'true' ? { rejectUnauthorized: true } : undefined,
  };

  const connection = await mysql.createConnection(config);

  try {
    // Get all published developments with location info
    const [devs] = await connection.query<any[]>(`
      SELECT 
        id, 
        name, 
        city, 
        suburb, 
        province, 
        address,
        location_id,
        isPublished,
        approval_status,
        status
      FROM developments 
      WHERE isPublished = 1
      ORDER BY id DESC
      LIMIT 10
    `);

    console.log('Published Developments:\n');
    devs.forEach((d: any) => {
      console.log(`ID: ${d.id}`);
      console.log(`  Name: ${d.name}`);
      console.log(`  City: ${d.city}`);
      console.log(`  Suburb: ${d.suburb}`);
      console.log(`  Province: ${d.province}`);
      console.log(`  Address: ${d.address}`);
      console.log(`  Location ID: ${d.location_id}`);
      console.log(`  Status: ${d.status}, Published: ${d.isPublished}, Approval: ${d.approval_status}`);
      console.log('');
    });

    // Check cities table
    console.log('\nChecking matching cities...\n');
    for (const dev of devs) {
      if (dev.city) {
        const [matchedCities] = await connection.query<any[]>(`
          SELECT id, name, slug FROM cities 
          WHERE LOWER(name) = LOWER(?) OR name LIKE ?
          LIMIT 5
        `, [dev.city, `%${dev.city}%`]);
        
        console.log(`City "${dev.city}" matches:`, matchedCities.length > 0 ? matchedCities : 'NONE FOUND');
      }
    }

    // Check the query being used in locationPagesService
    console.log('\n\n📌 Testing location service query for Alberton...\n');
    
    const [albertonDevs] = await connection.query<any[]>(`
      SELECT id, name, city, suburb, province, isPublished, status
      FROM developments
      WHERE city = 'Alberton' AND isPublished = 1
    `);
    console.log(`Developments in "Alberton":`, albertonDevs.length, albertonDevs);

    // Also check with LIKE
    const [likeDevs] = await connection.query<any[]>(`
      SELECT id, name, city, suburb, province, isPublished, status
      FROM developments
      WHERE (city LIKE '%Alberton%' OR suburb LIKE '%Albert%') AND isPublished = 1
    `);
    console.log(`\nDevelopments matching Albert*:`, likeDevs.length, likeDevs);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

checkDevelopmentLocation()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error);
    process.exit(1);
  });
