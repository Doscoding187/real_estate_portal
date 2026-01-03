/**
 * Check Unit Types Data
 * 
 * Run: npx tsx scripts/check-unit-types.ts
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';

async function checkUnitTypes() {
  console.log('🔎 Checking Unit Types Data...\n');

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
    // Find the Leopard's Rest development
    console.log('📌 Looking for Leopard\'s Rest Lifestyle Estate...');
    const [devs] = await connection.query<any[]>(`
      SELECT id, name FROM developments WHERE name LIKE '%Leopard%' LIMIT 1
    `);
    
    if (devs.length === 0) {
      console.log('❌ Development not found');
      return;
    }
    
    const devId = devs[0].id;
    console.log(`✅ Found: ${devs[0].name} (ID: ${devId})\n`);

    // Check development_units table
    console.log('📌 Checking development_units table...');
    const [units] = await connection.query<any[]>(`
      SELECT * FROM development_units WHERE development_id = ?
    `, [devId]);
    console.log(`Found ${units.length} records in development_units`);
    if (units.length > 0) {
      console.log('Sample record:', JSON.stringify(units[0], null, 2));
    }

    // Check unit_types table
    console.log('\n📌 Checking unit_types table...');
    const [types] = await connection.query<any[]>(`
      SELECT * FROM unit_types WHERE development_id = ?
    `, [devId]);
    console.log(`Found ${types.length} records in unit_types`);
    if (types.length > 0) {
      console.log('Sample record:', JSON.stringify(types[0], null, 2));
    }

    // If no data, list all data in unit_types
    if (types.length === 0 && units.length === 0) {
      console.log('\n📌 Checking ALL unit_types records...');
      const [allTypes] = await connection.query<any[]>(`
        SELECT id, development_id, name, bedrooms, base_price_from FROM unit_types LIMIT 5
      `);
      console.log('All unit_types:', allTypes);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

checkUnitTypes();
