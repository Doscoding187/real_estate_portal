/**
 * Create Role-Based Test Users Script
 * Run with: pnpm tsx create-role-users.ts
 */

import 'dotenv/config';
import * as db from './server/db';
import bcrypt from 'bcryptjs';

async function createRoleBasedUsers() {
  console.log('🔧 Creating role-based test users...\n');

  // Database connection
  const database = await db.getDb();
  if (!database) {
    console.error('❌ Database connection failed');
    return;
  }
  console.log('✅ Database connected successfully');

  // User data for different roles
  const users = [
    {
      email: 'user@example.com',
      password: 'password123',
      name: 'Regular User',
      role: 'visitor'
    },
    {
      email: 'developer@example.com',
      password: 'password123',
      name: 'Property Developer',
      role: 'agency_admin' // Using agency_admin as property developer role
    },
    {
      email: 'agent@example.com',
      password: 'password123',
      name: 'Real Estate Agent',
      role: 'agent'
    },
    {
      email: 'agency@example.com',
      password: 'password123',
      name: 'Agency Admin',
      role: 'agency_admin'
    }
  ];

  // Note: Super admin already exists according to the user

  for (const userData of users) {
    try {
      // Check if user already exists
      const existingUser = await db.getUserByEmail(userData.email);

      if (existingUser) {
        console.log(`⚠️  User already exists: ${userData.email} (${userData.role})`);
        continue;
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(userData.password, saltRounds);

      // Create new user with appropriate role
      const userInsertData = {
        email: userData.email,
        passwordHash: passwordHash,
        name: userData.name,
        role: userData.role,
        emailVerified: 1,
        loginMethod: 'email',
        isSubaccount: 0, // Add this required field
      };

      await db.createUser(userInsertData as any);

      console.log(`✅ ${userData.name} created successfully`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   Password: ${userData.password}`);
      console.log(`   Role: ${userData.role}\n`);

    } catch (error) {
      console.error(`❌ Failed to create ${userData.name}:`, error);
    }
  }

  console.log('🚀 You can now login with any of these accounts at: http://localhost:5173/login\n');
}

createRoleBasedUsers().catch(console.error);