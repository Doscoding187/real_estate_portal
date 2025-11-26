/**
 * Create Test User Script
 * Run with: pnpm tsx create-test-user.ts
 */

import 'dotenv/config';
import { authService } from './server/_core/auth';
import * as db from './server/db';

async function createTestUser() {
  console.log('🔧 Creating test user...\n');

  // NOTE: Default test user credentials have been removed for security
  // Users should provide their own credentials when running this script
  console.log('⚠️  This script requires manual input of user credentials for security.');
  console.log('💡 Please modify this script with your own test credentials before running.\n');
  
  console.log('🔧 To create a test user:');
  console.log('   1. Uncomment the credential lines below');
  console.log('   2. Replace with your own secure test credentials');
  console.log('   3. Run: pnpm tsx create-test-user.ts\n');

  /*
  // Test user credentials - COMMENTED OUT FOR SECURITY
  const testEmail = 'your-test-email@example.com';  // Change this
  const testPassword = 'your-secure-password';       // Change this
  const testName = 'Your Test User';                // Change this

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
        console.log('✅ You can login with your existing credentials\n');
      }
      return;
    }

    // Create new user
    const { user } = await authService.register(testEmail, testPassword, testName);
    
    console.log('✅ Test user created successfully!\n');
    console.log('Login credentials:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: [YOUR SECURE PASSWORD]\n`);
    console.log(`   Role: ${user.role}\n`);
    
    console.log('🚀 You can now login at: http://localhost:5173/login\n');

  } catch (error) {
    console.error('❌ Failed to create test user:', error);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check DATABASE_URL in .env');
    console.log('   2. Verify MySQL is running');
    console.log('   3. Ensure users table exists (run migrations)\n');
  }
  */
}

createTestUser().catch(console.error);