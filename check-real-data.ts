import { db } from './server/db';
import {
  users,
  developers,
  agencies,
  agents,
  listings,
  developments,
  developerSubscriptions,
  agencySubscriptions,
} from './drizzle/schema';
import { sql } from 'drizzle-orm';

async function checkDatabaseData() {
  console.log('\n🔍 Checking Database for Remaining Data...\n');

  try {
    // Count users
    const userCount = await db.select({ count: sql`COUNT(*)` }).from(users);
    console.log(`👥 Users: ${userCount[0].count}`);

    // List all users
    const allUsers = await db
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users);
    console.log('\nAll Users:');
    allUsers.forEach(u => console.log(`  - ID: ${u.id}, Email: ${u.email}, Role: ${u.role}`));

    // Count developers
    const devCount = await db.select({ count: sql`COUNT(*)` }).from(developers);
    console.log(`\n🏗️  Developers: ${devCount[0].count}`);

    // Count agencies
    const agencyCount = await db.select({ count: sql`COUNT(*)` }).from(agencies);
    console.log(`🏢 Agencies: ${agencyCount[0].count}`);

    // Count agents
    const agentCount = await db.select({ count: sql`COUNT(*)` }).from(agents);
    console.log(`👨‍💼 Agents: ${agentCount[0].count}`);

    // Count listings
    const listingCount = await db.select({ count: sql`COUNT(*)` }).from(listings);
    console.log(`📋 Listings: ${listingCount[0].count}`);

    // Count developments
    const devtCount = await db.select({ count: sql`COUNT(*)` }).from(developments);
    console.log(`🏘️  Developments: ${devtCount[0].count}`);

    // Count developer subscriptions
    const devSubCount = await db.select({ count: sql`COUNT(*)` }).from(developerSubscriptions);
    console.log(`💳 Developer Subscriptions: ${devSubCount[0].count}`);

    // Count agency subscriptions
    const agencySubCount = await db.select({ count: sql`COUNT(*)` }).from(agencySubscriptions);
    console.log(`💳 Agency Subscriptions: ${agencySubCount[0].count}`);

    console.log('\n✅ Database check complete!\n');
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    process.exit(0);
  }
}

checkDatabaseData();
