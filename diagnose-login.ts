/**
 * Login Diagnostic Script
 * Run with: pnpm tsx diagnose-login.ts
 */

import 'dotenv/config';
import * as db from './server/db';
import { users } from './drizzle/schema';
import { authService } from './server/_core/auth';

async function diagnoseLogin() {
  console.log('🔍 Login Diagnostic Tool\n');
  
  // Step 1: Check database connection
  console.log('1️⃣ Checking database connection...');
  try {
    const dbInstance = await db.getDb();
    if (!dbInstance) {
      console.error('❌ Database not available. Check DATABASE_URL in .env');
      return;
    }
    console.log('✅ Database connected\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return;
  }

  // Step 2: Check JWT_SECRET
  console.log('2️⃣ Checking JWT_SECRET...');
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length === 0) {
    console.error('❌ JWT_SECRET not set in .env file');
    console.log('💡 Add this to your .env file:');
    console.log('   JWT_SECRET=your-super-secret-key-at-least-32-chars-long');
    return;
  }
  console.log(`✅ JWT_SECRET configured (${process.env.JWT_SECRET.length} characters)\n`);

  // Step 3: List users
  console.log('3️⃣ Checking users in database...');
  try {
    const dbInstance = await db.getDb();
    const allUsers = await dbInstance.select().from(users);
    
    if (allUsers.length === 0) {
      console.log('⚠️  No users found in database');
      console.log('💡 You need to create a user first. Run one of these:');
      console.log('   - Register via the UI at /login');
      console.log('   - Use the canonical guarded local demo lifecycle: pnpm db:authority:bootstrap:local');
      return;
    }

    console.log(`✅ Found ${allUsers.length} user(s):\n`);
    allUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. Email: ${user.email}`);
      console.log(`      Role: ${user.role}`);
      console.log(`      Has password: ${user.passwordHash ? '✅' : '❌'}`);
      console.log(`      Login method: ${user.loginMethod || 'not set'}`);
      console.log('');
    });

    // Step 4: Check if any user has password
    const usersWithPassword = allUsers.filter(u => u.passwordHash);
    if (usersWithPassword.length === 0) {
      console.log('⚠️  No users have passwords set');
      console.log('💡 This usually means:');
      console.log('   - Users were created via OAuth (old Manus system)');
      console.log('   - Users need to reset their password');
      console.log('\n💡 Solution: Create a new user with email/password via /login registration');
      return;
    }

    console.log(`✅ ${usersWithPassword.length} user(s) have password set\n`);

  } catch (error) {
    console.error('❌ Failed to query users:', error);
    return;
  }

  // Step 5: Test login flow
  console.log('4️⃣ Testing login flow...');
  console.log('To test login, I need email and password.');
  console.log('💡 Try logging in via the UI or run this script with test credentials\n');
  
  // Step 6: Common issues
  console.log('📋 Common Login Issues:\n');
  console.log('1. "Invalid email or password"');
  console.log('   → Email not found OR password incorrect');
  console.log('   → Check email spelling and password');
  console.log('');
  console.log('2. "Invalid or missing session cookie"');
  console.log('   → JWT_SECRET changed after token creation');
  console.log('   → Clear browser cookies and login again');
  console.log('');
  console.log('3. "This account uses OAuth login"');
  console.log('   → User account has no password (created via OAuth)');
  console.log('   → Create new account or add password reset feature');
  console.log('');
  console.log('4. Network error / 500 error');
  console.log('   → Check server console for detailed errors');
  console.log('   → Verify DATABASE_URL connection');
  console.log('');

  console.log('✅ Diagnostic complete!\n');
}

diagnoseLogin().catch(console.error);
