import 'dotenv/config';
import { getDb } from './server/db';
import { users } from './drizzle/schema';
import { eq, or } from 'drizzle-orm';

async function checkSuperAdmins() {
  console.log('🔍 Checking for super admin accounts...\n');
  
  try {
    const db = await getDb();
    if (!db) {
      console.error('❌ Database connection failed');
      process.exit(1);
    }

    // Get all users with super_admin or agency_admin roles
    const adminUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      })
      .from(users)
      .where(or(eq(users.role, 'super_admin'), eq(users.role, 'agency_admin')));

    if (adminUsers.length === 0) {
      console.log('⚠️  No super admin or admin accounts found!\n');
      console.log('You may need to create a super admin account.');
    } else {
      console.log(`✅ Found ${adminUsers.length} admin account(s):\n`);
      
      adminUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.role?.toUpperCase()}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email || 'N/A'}`);
        console.log(`   Name: ${user.name || 'N/A'}`);
        console.log(`   Email Verified: ${user.emailVerified ? 'Yes' : 'No'}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log(`   Last Sign In: ${user.lastSignedIn || 'Never'}`);
        console.log('');
      });

      const superAdmins = adminUsers.filter(u => u.role === 'super_admin');
      const agencyAdmins = adminUsers.filter(u => u.role === 'agency_admin');

      console.log('📊 Summary:');
      console.log(`   Super Admins: ${superAdmins.length}`);
      console.log(`   Agency Admins: ${agencyAdmins.length}`);
      console.log(`   Total: ${adminUsers.length}`);
    }

    console.log('\n✅ Check complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking super admins:', error);
    process.exit(1);
  }
}

checkSuperAdmins();
