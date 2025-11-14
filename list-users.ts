import 'dotenv/config';
import * as db from './server/db';
import { users } from './drizzle/schema'; // Import the users table directly

async function listUsers() {
  console.log('📋 Listing all users in the database...\n');
  
  const database = await db.getDb();
  if (!database) {
    console.error('❌ Database connection failed');
    return;
  }
  
  try {
    const usersList = await database.select().from(users);
    console.log(`✅ Found ${usersList.length} users:\n`);
    
    usersList.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'No name'} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log(`   Last signed in: ${user.lastSignedIn}`);
      console.log('---');
    });
  } catch (error) {
    console.error('❌ Failed to list users:', error);
  }
}

listUsers().catch(console.error);