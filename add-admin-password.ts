/**
 * Add password to existing admin user
 * Run with: pnpm tsx add-admin-password.ts
 */

import 'dotenv/config';
import { authService } from './server/_core/auth';
import * as db from './server/db';
import { users } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function addAdminPassword() {
  console.log('🔧 Adding password to admin user...\n');

  const adminEmail = 'admin@realestate.com';
  const adminPassword = 'Admin@123456'; // Strong password

  try {
    // Get the admin user
    const adminUser = await db.getUserByEmail(adminEmail);
    if (!adminUser) {
      console.error(`❌ Admin user not found: ${adminEmail}`);
      return;
    }

    console.log(`Found user: ${adminEmail}`);
    console.log(`Current role: ${adminUser.role}`);
    console.log(`Has password: ${adminUser.passwordHash ? 'Yes' : 'No'}\n`);

    // Hash the password
    const passwordHash = await authService.hashPassword(adminPassword);

    // Update the user with password
    const dbInstance = await db.getDb();
    if (!dbInstance) {
      console.error('❌ Database not available');
      return;
    }

    await dbInstance
      .update(users)
      .set({ 
        passwordHash,
        loginMethod: 'email'
      })
      .where(eq(users.id, adminUser.id));

    console.log('✅ Password added successfully!\n');
    console.log('Login credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role: ${adminUser.role}\n`);
    console.log('🚀 You can now login at: http://localhost:5173/login\n');
    console.log('⚠️  IMPORTANT: Change this password after first login!\n');

  } catch (error) {
    console.error('❌ Failed to add password:', error);
  }
}

addAdminPassword().catch(console.error).finally(() => process.exit(0));
