/**
 * Check Database Columns
 * Run with: pnpm tsx check-db-columns.ts
 */

import { getDb } from './server/db';
import { users } from './drizzle/schema';

async function checkColumns() {
  console.log('🔍 Checking database columns...\n');
  
  try {
    const db = await getDb();
    if (!db) {
      console.error('❌ Database connection failed');
      return;
    }
    
    console.log('✅ Database connected successfully');
    
    // Try to query the users table with the new columns
    const result = await db.select({
      id: users.id,
      email: users.email,
      passwordResetToken: users.passwordResetToken,
      passwordResetTokenExpiresAt: users.passwordResetTokenExpiresAt,
      emailVerificationToken: users.emailVerificationToken
    }).from(users).limit(1);
    
    console.log('✅ Query successful with new columns');
    console.log('Sample result:', result[0] || 'No users found');
    
  } catch (error: any) {
    console.error('❌ Database query failed:', error.message);
    console.error('This indicates the new columns may not exist in the database yet');
  }
}

checkColumns().catch(console.error);