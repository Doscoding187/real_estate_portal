/**
 * Check development provinces
 * 
 * Run: npx tsx scripts/check-provinces.ts
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';

async function checkProvinces() {
  console.log('🔎 Checking Development Provinces...\n');

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
    // Get all distinct provinces
    console.log('📌 Distinct provinces in developments table:');
    const [provinces] = await connection.query<any[]>(`
      SELECT DISTINCT province, COUNT(*) as count 
      FROM developments 
      GROUP BY province
    `);
    
    provinces.forEach((p: any) => {
      console.log(`  "${p.province}" -> ${p.count} development(s)`);
    });

    // Get all developments with their provinces
    console.log('\n📌 All developments:');
    const [devs] = await connection.query<any[]>(`
      SELECT id, name, province, isPublished FROM developments LIMIT 20
    `);
    
    devs.forEach((d: any) => {
      console.log(`  [${d.id}] "${d.name}" | Province: "${d.province}" | Published: ${d.isPublished}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

checkProvinces();
