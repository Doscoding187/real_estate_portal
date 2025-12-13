/**
 * Diagnose Location Pages - Check what's in the database
 */

import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function diagnose() {
  console.log('🔍 Diagnosing Location Pages Database...\n');

  try {
    const db = await getDb();

    // Check provinces
    console.log('📍 PROVINCES:');
    const provinceList = await db.execute(sql`SELECT id, name, slug FROM provinces ORDER BY name`);
    console.table(provinceList);

    // Check cities
    console.log('\n🏙️  CITIES (showing all):');
    const cityList = await db.execute(sql`SELECT id, name, slug, provinceId FROM cities ORDER BY name`);
    console.table(cityList);

    // Check suburbs
    console.log('\n🏘️  SUBURBS (showing all):');
    const suburbList = await db.execute(sql`SELECT id, name, slug, cityId FROM suburbs ORDER BY name`);
    console.table(suburbList);

    // Test specific lookups
    console.log('\n🔎 Testing specific lookups:');
    
    console.log('\n1. Looking for "johannesburg" slug in cities:');
    const jhbBySlug = await db.execute(sql`SELECT * FROM cities WHERE slug = 'johannesburg'`);
    console.table(jhbBySlug);

    console.log('\n2. Looking for "gauteng" slug in provinces:');
    const gautengBySlug = await db.execute(sql`SELECT * FROM provinces WHERE slug = 'gauteng'`);
    console.table(gautengBySlug);

    if (gautengBySlug.length === 0) {
      console.log('\n⚠️  "gaut eng" slug not found! Let me add it...');
      await db.execute(sql`UPDATE provinces SET slug = 'gauteng' WHERE name = 'Gauteng'`);
      console.log('   ✅ Updated Gauteng slug');
    }

    if ((jhbBySlug as any[]).length === 0) {
      console.log('\n⚠️  "johannesburg" slug not found in cities!');
      console.log('   Let me check the actual data...');
      const allCityData = await db.execute(sql`SELECT id, name, slug FROM cities WHERE name LIKE '%Johan%'`);
      console.table(allCityData);
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

diagnose()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
