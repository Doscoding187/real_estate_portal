/**
 * Script to list all users in the database
 * Run with: pnpm exec tsx scripts/list-all-users.ts
 */

import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function listAllUsers() {
  console.log('📋 Listing all users in database...\n');

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

    const [users]: any = await connection.execute(
      'SELECT id, name, email, role, emailVerified, createdAt FROM users ORDER BY createdAt DESC LIMIT 20'
    );

    console.log(`Found ${users.length} users:\n`);
    
    users.forEach((user: any, index: number) => {
      console.log(`${index + 1}. ${user.name || 'No name'}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Verified: ${user.emailVerified ? '✅ Yes' : '❌ No'}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Failed to list users:', error);
  } finally {
    if (connection) await connection.end();
  }
}

listAllUsers();
