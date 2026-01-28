#!/usr/bin/env tsx
/**
 * Quick DB diagnostic script
 * Checks migration table status
 */

import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  try {
    // 1. Check which database we're connected to
    const [dbResult] = await connection.query('SELECT DATABASE() as db');
    console.log('📍 Connected to database:', (dbResult as any)[0].db);
    console.log('');

    // 2. Check for drizzle/migration tables
    const [drizzleTables] = await connection.query("SHOW TABLES LIKE '%drizzle%'");
    console.log('🔍 Drizzle-related tables:', drizzleTables);
    console.log('');

    const [migrationTables] = await connection.query("SHOW TABLES LIKE '%migration%'");
    console.log('🔍 Migration-related tables:', migrationTables);
    console.log('');

    // 3. If __drizzle_migrations exists, show its contents
    try {
      const [migrations] = await connection.query(
        'SELECT * FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 10',
      );
      console.log('📋 Recent migrations:', migrations);
      console.log('');

      const [count] = await connection.query('SELECT COUNT(*) as total FROM __drizzle_migrations');
      console.log('📊 Total migrations applied:', (count as any)[0].total);
    } catch (err: any) {
      console.log('⚠️  __drizzle_migrations table does not exist or cannot be read');
      console.log('   Error:', err.message);
    }
    console.log('');

    // 4. Check developments table structure
    const [devColumns] = await connection.query(
      "SHOW COLUMNS FROM developments WHERE Field LIKE '%developer%' OR Field LIKE '%approval%' OR Field LIKE '%owner%'",
    );
    console.log('🏗️  Developments table columns (developer/approval/owner related):');
    console.log(devColumns);
    console.log('');

    // 5. Check unit_types table structure
    const [unitColumns] = await connection.query(
      "SHOW COLUMNS FROM unit_types WHERE Field LIKE '%development%' OR Field LIKE '%ownership%' OR Field LIKE '%structural%' OR Field LIKE '%price%'",
    );
    console.log('🏠 Unit_types table columns (development/ownership/structural/price related):');
    console.log(unitColumns);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
