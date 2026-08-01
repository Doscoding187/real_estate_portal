import { getDb } from './server/db';
import { properties } from './drizzle/schema';

async function checkProperties() {
  try {
    const db = await getDb();
    if (!db) {
      console.log('❌ Database not available');
      return;
    }

    const allProperties = await db.select().from(properties);
    
    console.log(`\n📊 Total properties in database: ${allProperties.length}\n`);
    
    if (allProperties.length === 0) {
      console.log('❌ No properties found. You need to run a seed script.');
      console.log('\nRun: pnpm db:verify:local-demo after the canonical local demo lifecycle');
      return;
    }

    // Group by province
    const byProvince = allProperties.reduce((acc, prop) => {
      const province = prop.province || 'Unknown';
      if (!acc[province]) acc[province] = 0;
      acc[province]++;
      return acc;
    }, {} as Record<string, number>);

    console.log('Properties by Province:');
    Object.entries(byProvince).forEach(([province, count]) => {
      console.log(`  ${province}: ${count}`);
    });

    console.log('\n✅ Sample properties:');
    allProperties.slice(0, 3).forEach(prop => {
      console.log(`  - ${prop.title} (${prop.city}, ${prop.province}) - ${prop.status}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkProperties();
