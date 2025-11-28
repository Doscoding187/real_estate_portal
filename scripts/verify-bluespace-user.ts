/**
 * Script to verify bluescpacepools@gmail.com email
 * Run with: tsx scripts/verify-bluespace-user.ts
 */

import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function verifyBlueSpaceUser() {
  const email = 'bluespacepools@gmail.com';
  console.log(`🔍 Verifying email for user: ${email}`);

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

    // First check if user exists
    const [users]: any = await connection.execute(
      'SELECT id, email, emailVerified, role FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      console.error(`❌ User ${email} not found in database`);
      process.exit(1);
    }

    console.log('📋 Current user status:', users[0]);

    // Update email verification
    const [result]: any = await connection.execute(
      'UPDATE users SET emailVerified = 1, emailVerificationToken = NULL WHERE email = ?',
      [email]
    );

    console.log(`✅ Updated ${result.affectedRows} row(s)`);

    // Verify the update
    const [updatedUsers]: any = await connection.execute(
      'SELECT id, email, emailVerified, role FROM users WHERE email = ?',
      [email]
    );

    console.log('📋 Updated user status:', updatedUsers[0]);
    console.log(`✅ User ${email} verified successfully!`);

  } catch (error) {
    console.error('❌ Failed to verify user:', error);
  } finally {
    if (connection) await connection.end();
  }
}

verifyBlueSpaceUser();
