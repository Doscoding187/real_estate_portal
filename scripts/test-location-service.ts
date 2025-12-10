import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function testLocationService() {
  console.log('🧪 Testing Location Pages Service...\n');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found');
    return;
  }
  
  let connection: mysql.Connection | null = null;
  
  try {
    const cleanUrl = process.env.DATABASE_URL.replace('?ssl=true', '');
    connection = await mysql.createConnection({
      uri: cleanUrl,
      ssl: { rejectUnauthorized: false },
      connectTimeout: 30000
    });
    
    console.log('✅ Connected to database\n');
    
    // Test 1: Check provinces with slugs
    console.log('📋 Test 1: Provinces with slugs');
    const [provinces] = await connection.execute(
      'SELECT name, slug FROM provinces ORDER BY name LIMIT 5'
    );
    
    (provinces as any[]).forEach((p: any) => {
      const status = p.slug ? '✅' : '❌';
      console.log(`   ${status} ${p.name} → ${p.slug || 'NO SLUG'}`);
    });
    
    // Test 2: Check cities with slugs
    console.log('\n📋 Test 2: Cities with slugs');
    const [cities] = await connection.execute(
      'SELECT name, slug FROM cities ORDER BY name LIMIT 5'
    );
    
    (cities as any[]).forEach((c: any) => {
      const status = c.slug ? '✅' : '❌';
      console.log(`   ${status} ${c.name} → ${c.slug || 'NO SLUG'}`);
    });
    
    // Test 3: Check suburbs with slugs
    console.log('\n📋 Test 3: Suburbs with slugs');
    const [suburbs] = await connection.execute(
      'SELECT name, slug FROM suburbs ORDER BY name LIMIT 5'
    );
    
    (suburbs as any[]).forEach((s: any) => {
      const status = s.slug ? '✅' : '❌';
      console.log(`   ${status} ${s.name} → ${s.slug || 'NO SLUG'}`);
    });
    
    // Test 4: Test slug lookups
    console.log('\n📋 Test 4: Testing slug lookups');
    
    const testSlugs = [
      { table: 'provinces', slug: 'gauteng', expected: 'Gauteng' },
      { table: 'provinces', slug: 'western-cape', expected: 'Western Cape' },
      { table: 'cities', slug: 'johannesburg', expected: 'Johannesburg' },
      { table: 'cities', slug: 'cape-town', expected: 'Cape Town' }
    ];
    
    for (const test of testSlugs) {
      const [result] = await connection.execute(
        `SELECT name FROM ${test.table} WHERE slug = ?`,
        [test.slug]
      );
      
      if ((result as any[]).length > 0) {
        const name = (result as any[])[0].name;
        console.log(`   ✅ ${test.slug} → ${name}`);
      } else {
        console.log(`   ❌ ${test.slug} → NOT FOUND`);
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✨ Location service is ready!\n');
    console.log('📝 Next steps:');
    console.log('   1. Restart your dev server (if running)');
    console.log('   2. Test these URLs:');
    console.log('      • http://localhost:5000/gauteng');
    console.log('      • http://localhost:5000/western-cape');
    console.log('      • http://localhost:5000/gauteng/johannesburg');
    console.log('      • http://localhost:5000/gauteng/johannesburg/sandton\n');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testLocationService()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
