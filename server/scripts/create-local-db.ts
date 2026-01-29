import dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mysql from 'mysql2/promise';

async function initLocalDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || !dbUrl.includes('localhost')) {
    console.error('❌ SAFETY CHECK FAILED: DATABASE_URL is not localhost.');
    console.error('Current URL:', dbUrl);
    process.exit(1);
  }

  console.log('🔄 Initializing local database...');

  // Parse connection details
  // Assumes format: mysql://user:pass@host:port/dbname
  const url = new URL(dbUrl);

  try {
    const connection = await mysql.createConnection({
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
    });

    console.log('Recreating database...');
    await connection.query('DROP DATABASE IF EXISTS listify_local_dev');
    await connection.query('CREATE DATABASE listify_local_dev');

    console.log('✅ Local database `listify_local_dev` (re)created.');
    await connection.end();
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

initLocalDb();
