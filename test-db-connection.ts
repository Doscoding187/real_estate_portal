/**
 * Test Database Connection
 * Run with: pnpm tsx test-db-connection.ts
 */

import { getDb } from './server/db.ts';
import { users } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

async function testDatabase() {
  console.log('🔍 Testing database connection...\n');
  
  try {
    const db = await getDb();
    
    if (!db) {
      console.error('❌ Database connection failed');
      return;
    }
    
    console.log('✅ Database connected successfully');
    
    // Test querying users table
    console.log('\n2️⃣ Testing users table query...');
    try {
      const result = await db.select().from(users).limit(5);
      console.log('✅ Users query successful');
      console.log('Found', result.length, 'users');
      
      if (result.length > 0) {
        console.log('Sample user:', {
          id: result[0].id,
          email: result[0].email,
          // Don't log password or sensitive data
        });
      }
    } catch (queryError) {
      console.error('❌ Users query failed:', queryError);
      return;
    }
    
    // Test specific user lookup
    console.log('\n3️⃣ Testing specific user lookup...');
    try {
      const userEmail = 'admin@realestate.com';
      const userResult = await db.select().from(users).where(eq(users.email, userEmail)).limit(1);
      
      if (userResult.length > 0) {
        console.log('✅ User found:', {
          id: userResult[0].id,
          email: userResult[0].email,
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