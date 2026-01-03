/**
 * Check unit type baseMedia structure
 * 
 * Run: npx tsx scripts/check-unit-media.ts
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';

async function checkUnitMedia() {
  console.log('🔎 Checking Unit Types Media Structure...\n');

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
    // Get unit types with their media
    console.log('📌 Unit types with baseMedia:');
    const [units] = await connection.query<any[]>(`
      SELECT ut.id, ut.name, ut.base_media, d.name as dev_name
      FROM unit_types ut
      JOIN developments d ON ut.development_id = d.id
      LIMIT 10
    `);
    
    units.forEach((u: any) => {
      console.log(`\n[${u.id}] "${u.name}" (${u.dev_name})`);
      console.log('  base_media:', u.base_media ? JSON.stringify(u.base_media).slice(0, 200) : 'NULL');
      
      // Try to parse JSON
      if (u.base_media) {
        try {
          const parsed = typeof u.base_media === 'string' ? JSON.parse(u.base_media) : u.base_media;
          console.log('  Parsed structure:', JSON.stringify(parsed, null, 2).slice(0, 500));
        } catch (e) {
          console.log('  Failed to parse:', e);
        }
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

checkUnitMedia();
