import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkDevelopers() {
  console.log('🔍 Checking developers in database...\n');
  
  const db = await getDb();
  if (!db) {
    console.error('❌ Failed to connect to database');
    process.exit(1);
  }

  try {
    const result = await db.execute(sql`SELECT id, name, status, isVerified FROM developers`);
    
    console.log('Found developers:');
    if (Array.isArray(result[0])) {
        result[0].forEach((dev: any) => {
            console.log(`- [${dev.id}] "${dev.name}" | Status: ${dev.status} | Verified: ${dev.isVerified}`);
        });
    }
    // Test search logic
    // Test: Lowercase search "co" (should work now)
    console.log('\n🔍 Test: Lowercase search "co"...');
    const searchQuery = 'co';
    // We simulate the exact query logic we just added to db.ts
    const searchResult = await db.execute(sql`
      SELECT id, name, status 
      FROM developers 
      WHERE LOWER(name) LIKE ${`%${searchQuery.toLowerCase()}%`} 
      AND status = 'approved'
    `);
    
    console.log('Result:', searchResult[0]);

  } catch (error) {
    console.error('❌ Error querying developers:', error);
  }
  
  process.exit(0);
}

checkDevelopers();
