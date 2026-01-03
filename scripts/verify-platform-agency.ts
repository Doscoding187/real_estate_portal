/**
 * Verify Platform Agency
 * 
 * Run: npx tsx scripts/verify-platform-agency.ts
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';

async function verifyAgency() {
  console.log('🔍 Checking Platform Agency...\n');

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
    // Get the agency
    const [agencies] = await connection.query<any[]>(`
      SELECT * FROM agencies WHERE name LIKE '%Property Listify%'
    `);

    console.log('Agencies found:', agencies.length);
    agencies.forEach((a: any) => {
      console.log(`\n  ID: ${a.id}`);
      console.log(`  Name: ${a.name}`);
      console.log(`  Email: ${a.email}`);
      console.log(`  Plan: ${a.subscriptionPlan}`);
      console.log(`  Status: ${a.subscriptionStatus}`);
    });

    // Check agents table structure
    console.log('\n\n📌 Checking agents table columns...');
    const [columns] = await connection.query<any[]>(`
      SHOW COLUMNS FROM agents
    `);
    console.log('Agent table columns:', columns.map((c: any) => c.Field).join(', '));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

verifyAgency();
