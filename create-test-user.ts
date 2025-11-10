/**
 * Create Test User Script
 * Run with: pnpm tsx create-test-user.ts
 */

import 'dotenv/config';
import { authService } from './server/_core/auth';
import * as db from './server/db';

async function createTestUser() {
  console.log('🔧 Creating test user...\n');

  // Test user credentials
  const testEmail = 'test@example.com';
  const testPassword = 'password123';
  const testName = 'Test User';

  try {
    // Check if user already exists
    const existingUser = await db.getUserByEmail(testEmail);
    if (existingUser) {
      console.log(`⚠️  User already exists: ${testEmail}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Has password: ${existingUser.passwordHash ? 'Yes' : 'No'}\n`);
      
      if (!existingUser.passwordHash) {
        console.log('💡 This user has no password. You can:');
        console.log('   1. Delete this user and create a new one');
        console.log('   2. Implement password reset feature');
        console.log('   3. Use a different email to create new user\n');
      } else {
        console.log('✅ You can login with:');
        console.log(`   Email: ${testEmail}`);
        console.log(`   Password: (your existing password)\n`);
      }
      return;
    }

    // Create new user
    const { user } = await authService.register(testEmail, testPassword, testName);
    
    console.log('✅ Test user created successfully!\n');
    console.log('Login credentials:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    console.log(`   Role: ${user.role}\n`);
    
    console.log('🚀 You can now login at: http://localhost:5173/login\n');

  } catch (error) {
    console.error('❌ Failed to create test user:', error);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check DATABASE_URL in .env');
    console.log('   2. Verify MySQL is running');
    console.log('   3. Ensure users table exists (run migrations)\n');
  }
}

createTestUser().catch(console.error);
