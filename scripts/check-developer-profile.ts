/**
 * Script to check if user has a developer profile
 * Run with: pnpm exec tsx scripts/check-developer-profile.ts
 */

import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkDeveloperProfile() {
  const email = 'bluespacepools@gmail.com';
  console.log(`🔍 Checking developer profile for: ${email}\n`);

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not defined');
    process.exit(1);
  }

  let connection;
  try {
    const dbUrl = new URL(process.env.DATABASE_URL);
    const sslParam = dbUrl.searchParams.get('ssl');
    dbUrl.searchParams.delete('ssl');
    
    connection = await createConnection({
        uri: dbUrl.toString(),
        ssl: sslParam === 'true' || sslParam === '{"rejectUnauthorized":true}' 
          ? { rejectUnauthorized: true } 
          : { rejectUnauthorized: false }
    });

    // Get user
    const [users]: any = await connection.execute(
      'SELECT id, email, role, emailVerified FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      console.error(`❌ User ${email} not found`);
      process.exit(1);
    }

    const user = users[0];
    console.log('👤 User Info:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Verified: ${user.emailVerified ? '✅ Yes' : '❌ No'}`);
    console.log('');

    // Check for developer profile
    const [developers]: any = await connection.execute(
      'SELECT * FROM developers WHERE userId = ?',
      [user.id]
    );

    if (developers.length === 0) {
      console.log('❌ No developer profile found');
      console.log('💡 User needs to complete developer registration');
    } else {
      const dev = developers[0];
      console.log('✅ Developer Profile Found:');
      console.log(`   Developer ID: ${dev.id}`);
      console.log(`   Company: ${dev.companyName || 'Not set'}`);
      console.log(`   Status: ${dev.status}`);
      console.log(`   Approved: ${dev.isApproved ? '✅ Yes' : '❌ No'}`);
      console.log(`   Created: ${dev.createdAt}`);
    }

    // Check for subscription
    const [subscriptions]: any = await connection.execute(
      'SELECT * FROM developer_subscriptions WHERE developer_id IN (SELECT id FROM developers WHERE userId = ?)',
      [user.id]
    );

    console.log('');
    if (subscriptions.length === 0) {
      console.log('❌ No subscription found');
    } else {
      const sub = subscriptions[0];
      console.log('💳 Subscription Info:');
      console.log(`   Tier: ${sub.tier}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Trial Ends: ${sub.trial_ends_at || 'N/A'}`);
    }

  } catch (error) {
    console.error('❌ Failed to check developer profile:', error);
  } finally {
    if (connection) await connection.end();
  }
}

checkDeveloperProfile();
