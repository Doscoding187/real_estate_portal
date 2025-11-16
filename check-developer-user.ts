/**
 * Check Property Developer User Script
 * Run with: pnpm tsx check-developer-user.ts
 */

import 'dotenv/config';
import * as db from './server/db';

async function checkDeveloperUser() {
  console.log('🔍 Checking property developer user...\n');

  try {
    // Check if user exists
    const user = await db.getUserByEmail('developer@example.com');
    
    if (!user) {
      console.log('❌ User not found: developer@example.com');
      return;
    }

    console.log('✅ User found!');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Email Verified: ${user.emailVerified ? 'Yes' : 'No'}`);
    
    if (user.role === 'property_developer') {
      console.log('\n🎉 User has the correct role for Property Developer Dashboard!');
      console.log('\n📋 Login credentials:');
      console.log('   Email: developer@example.com');
      console.log('   Password: password123');
      console.log('\n🔗 Dashboard URL: http://localhost:5173/developer/dashboard');
    } else {
      console.log(`\n⚠️  User has role "${user.role}" instead of "property_developer"`);
    }

  } catch (error) {
    console.error('❌ Failed to check user:', error);
  }
}

checkDeveloperUser().catch(console.error);