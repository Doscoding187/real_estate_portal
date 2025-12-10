import { getDb } from '../server/db';
import { provinces, cities, suburbs } from '../drizzle/schema';
import { eq, sql } from 'drizzle-orm';

async function testLocationPages() {
  const db = await getDb();
  
  console.log('\n=== Testing Location Pages Data ===\n');
  
  // Test 1: Check if provinces exist
  console.log('1. Checking provinces...');
  const allProvinces = await db.select().from(provinces);
  console.log(`Found ${allProvinces.length} provinces:`);
  allProvinces.forEach(p => console.log(`  - ${p.name} (id: ${p.id})`));
  
  // Test 2: Check if cities exist
  console.log('\n2. Checking cities...');
  const allCities = await db.select().from(cities).limit(10);
  console.log(`Found ${allCities.length} cities (showing first 10):`);
  allCities.forEach(c => console.log(`  - ${c.name} (id: ${c.id}, provinceId: ${c.provinceId})`));
  
  // Test 3: Check if suburbs exist
  console.log('\n3. Checking suburbs...');
  const allSuburbs = await db.select().from(suburbs).limit(10);
  console.log(`Found ${allSuburbs.length} suburbs (showing first 10):`);
  allSuburbs.forEach(s => console.log(`  - ${s.name} (id: ${s.id}, cityId: ${s.cityId})`));
  
  // Test 4: Test slug matching for provinces
  console.log('\n4. Testing province slug matching...');
  const testProvinceSlugs = ['gauteng', 'western-cape', 'kwazulu-natal'];
  
  for (const slug of testProvinceSlugs) {
    const cleanName = slug.replace(/-/g, ' ');
    console.log(`\n  Testing slug: "${slug}" -> cleanName: "${cleanName}"`);
    
    const [province] = await db
      .select()
      .from(provinces)
      .where(eq(sql`LOWER(${provinces.name})`, cleanName))
      .limit(1);
    
    if (province) {
      console.log(`  ✓ Found: ${province.name}`);
    } else {
      console.log(`  ✗ Not found`);
      
      // Try alternative matching
      const [altMatch] = await db
        .select()
        .from(provinces)
        .where(sql`LOWER(REPLACE(${provinces.name}, ' ', '-')) = ${slug}`)
        .limit(1);
      
      if (altMatch) {
        console.log(`  ✓ Alternative match found: ${altMatch.name}`);
      }
    }
  }
  
  // Test 5: Test slug matching for cities
  console.log('\n5. Testing city slug matching...');
  const testCitySlugs = ['johannesburg', 'cape-town', 'durban'];
  
  for (const slug of testCitySlugs) {
    const cleanName = slug.replace(/-/g, ' ');
    console.log(`\n  Testing slug: "${slug}" -> cleanName: "${cleanName}"`);
    
    const [city] = await db
      .select()
      .from(cities)
      .where(eq(sql`LOWER(${cities.name})`, cleanName))
      .limit(1);
    
    if (city) {
      console.log(`  ✓ Found: ${city.name}`);
    } else {
      console.log(`  ✗ Not found`);
    }
  }
  
  // Test 6: Test slug matching for suburbs
  console.log('\n6. Testing suburb slug matching...');
  const testSuburbSlugs = ['sandton', 'rosebank', 'green-point'];
  
  for (const slug of testSuburbSlugs) {
    const cleanName = slug.replace(/-/g, ' ');
    console.log(`\n  Testing slug: "${slug}" -> cleanName: "${cleanName}"`);
    
    const [suburb] = await db
      .select()
      .from(suburbs)
      .where(eq(sql`LOWER(${suburbs.name})`, cleanName))
      .limit(1);
    
    if (suburb) {
      console.log(`  ✓ Found: ${suburb.name}`);
    } else {
      console.log(`  ✗ Not found`);
    }
  }
  
  console.log('\n=== Test Complete ===\n');
  process.exit(0);
}

testLocationPages().catch(console.error);
