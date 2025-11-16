/**
 * Verify Property Developer User Script
 * Run with: pnpm tsx verify-developer-user.ts
 */

import 'dotenv/config';
import { createConnection } from 'mysql2/promise';

async function verifyDeveloperUser() {
  console.log('🔍 Verifying property developer user...\n');

  try {
    // Create database connection
    const connection = await createConnection({
      host: 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
      user: '292qWmvn2YGy2jW.root',
      password: 'TOdjCJY1bepCcJg1',
      port: 4000,
      database: 'listify_property_sa',
      ssl: {},
    });

    console.log('✅ Database connected successfully');

    // Check if user exists
    const [rows]: any = await connection.execute(
      'SELECT id, email, name, role FROM users WHERE email = ?',
      ['developer@example.com']
    );

    if (rows.length === 0) {
      console.log('❌ User not found: developer@example.com');
      await connection.end();
      return;
    }

    const user = rows[0];
    console.log('✅ User found!');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);

    if (user.role === 'property_developer') {
      console.log('\n🎉 User has the correct role for Property Developer Dashboard!');
      console.log('\n📋 Login credentials:');
      console.log('   Email: developer@example.com');
      console.log('   Password: password123');
      console.log('\n🔗 Dashboard URL: http://localhost:5173/developer/dashboard');
    } else {
      console.log(`\n⚠️  User has role "${user.role}" instead of "property_developer"`);
      
      // Update the user's role if needed
      console.log('\n🔧 Updating user role to property_developer...');
      await connection.execute(
        'UPDATE users SET role = ? WHERE email = ?',
        ['property_developer', 'developer@example.com']
      );
      
      console.log('✅ User role updated successfully!');
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Failed to verify user:', error);
  }
}

verifyDeveloperUser().catch(console.error);