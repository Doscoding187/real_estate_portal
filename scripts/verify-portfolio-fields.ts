import { getDb } from '../server/db';
import { developers } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function verifyPortfolioFields() {
  console.log('🔍 Verifying portfolio fields implementation...\n');

  const db = await getDb();
  if (!db) {
    console.error('❌ Database not available');
    process.exit(1);
  }

  // Check if we can query with portfolio fields
  try {
    const [testDeveloper] = await db
      .select({
        id: developers.id,
        name: developers.name,
        totalProjects: developers.totalProjects,
        completedProjects: developers.completedProjects,
        currentProjects: developers.currentProjects,
        upcomingProjects: developers.upcomingProjects,
      })
      .from(developers)
      .limit(1);

    if (testDeveloper) {
      console.log('✅ Portfolio fields are accessible in queries');
      console.log('\n📊 Sample developer data:');
      console.log(`   Name: ${testDeveloper.name}`);
      console.log(`   Total Projects: ${testDeveloper.totalProjects ?? 'NULL'}`);
      console.log(`   Completed Projects: ${testDeveloper.completedProjects ?? 'NULL'}`);
      console.log(`   Current Projects: ${testDeveloper.currentProjects ?? 'NULL'}`);
      console.log(`   Upcoming Projects: ${testDeveloper.upcomingProjects ?? 'NULL'}`);
    } else {
      console.log('ℹ️  No developers in database yet');
    }

    console.log('\n✅ All portfolio fields are properly configured!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Database schema has portfolio columns');
    console.log('   ✅ Drizzle schema includes portfolio fields');
    console.log('   ✅ Fields are queryable');
    console.log('\n🎉 Task 0.1 Complete: Database schema updated for portfolio metrics');

  } catch (error: any) {
    console.error('❌ Error querying portfolio fields:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

verifyPortfolioFields();
