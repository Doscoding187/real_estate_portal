/**
 * Simple Database Test
 * Run with: pnpm tsx test-simple-db.ts
 */

import { getDb } from './server/db';
import { users } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function testDatabase() {
  console.log('🔍 Testing database connection...\n');
  
  try {
    // Test database connection
    const db = await getDb();
    
    if (!db) {
      console.error('❌ Database connection failed');
      return;
    }
    
    console.log('✅ Database connected successfully');
    
    // Test a simple query
    console.log('\n2️⃣ Testing simple users query...');
    try {
      const result = await db.select({
        id: users.id,
        email: users.email,
        name: users.name,
      }).from(users).limit(3);
      
      console.log('✅ Simple query successful');
      console.log('Users found:', result.length);
      
      result.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} (${user.name || 'No name'})`);
      });
      
    } catch (queryError) {
      console.error('❌ Simple query failed:', queryError);
      return;
    }
    
    // Test specific user lookup
    console.log('\n3️⃣ Testing specific user lookup...');
    try {
      const userEmail = 'admin@realestate.com';
      const result = await db.select().from(users).where(eq(users.email, userEmail)).limit(1);
      
      if (result.length > 0) {
        console.log('✅ User found:', {
          id: result[0].id,
          email: result[0].email,
          name: result[0].name,
        });
      } else {
        console.log('ℹ️ User not found in database');
      }
    } catch (lookupError) {
      console.error('❌ User lookup failed:', lookupError);
    }
    
  } catch (error) {
    console.error('❌ Database test failed with error:', error);
  }
}

testDatabase().catch(console.error);