import 'dotenv/config';
import * as db from './server/db';
import { users, developers } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function diagnose() {
  console.log('🔍 Diagnosing Developer Login Issues...\n');

  try {
    const _db = await db.getDb();
    if (!_db) {
        console.error("No DB connection");
        return;
    }

    // 1. Get all users with property_developer role
    const developerUsers = await _db.select().from(users).where(eq(users.role, 'property_developer'));
    console.log(`Found ${developerUsers.length} users with 'property_developer' role.`);

    for (const user of developerUsers) {
        console.log(`\nUser: ${user.email} (ID: ${user.id})`);
        
        // 2. Check for developer profile
        const developer = await _db.select().from(developers).where(eq(developers.userId, user.id)).limit(1);
        
        if (developer.length > 0) {
            console.log(`✅ Developer Profile Found: ID ${developer[0].id}, Status: ${developer[0].status}`);
        } else {
            console.log(`❌ NO Developer Profile Found! This user is stuck in setup loop.`);
        }
    }
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
}

diagnose();
