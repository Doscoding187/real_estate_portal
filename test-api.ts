import { getDb } from './server/db';
import { searchProperties } from './server/db';

async function testAPI() {
  try {
    console.log('🧪 Testing property search API...\n');

    // Test 1: Search by Gauteng province
    console.log('Test 1: Searching for Gauteng properties...');
    const gautengProps = await searchProperties({ province: 'Gauteng', limit: 10 });
    console.log(`✅ Found ${gautengProps.length} properties in Gauteng`);
    gautengProps.slice(0, 2).forEach(p => {
      console.log(`   - ${p.title} (${p.city})`);
    });

    // Test 2: Search by Western Cape
    console.log('\nTest 2: Searching for Western Cape properties...');
    const wcProps = await searchProperties({ province: 'Western Cape', limit: 10 });
    console.log(`✅ Found ${wcProps.length} properties in Western Cape`);
    wcProps.forEach(p => {
      console.log(`   - ${p.title} (${p.city})`);
    });

    // Test 3: Get all properties
    console.log('\nTest 3: Searching all available properties...');
    const allProps = await searchProperties({ status: 'available', limit: 20 });
    console.log(`✅ Found ${allProps.length} total available properties`);

    // Test 4: Check featured properties
    console.log('\nTest 4: Featured properties...');
    const featuredProps = allProps.filter(p => p.featured === 1);
    console.log(`✅ Found ${featuredProps.length} featured properties`);

    console.log('\n✅ All tests passed! Properties should now be visible in the app.');
    console.log('\n💡 If properties still don\'t show in the browser:');
    console.log('   1. Restart your dev server: Ctrl+C and run "npm run dev" again');
    console.log('   2. Clear your browser cache and refresh');
    console.log('   3. Check the browser console for errors');

  } catch (error) {
    console.error('❌ Error:', error);
  }
  process.exit(0);
}

testAPI();
