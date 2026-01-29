import dotenv from 'dotenv';
import path from 'path';
import mysql from 'mysql2/promise';

// Load .env.local explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debugDb() {
  const dbUrl = process.env.DATABASE_URL;
  console.log('Target DB URL:', dbUrl);

  const url = new URL(dbUrl!);
  try {
    const connection = await mysql.createConnection({
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: 'listify_local_dev',
    });

    const [rows] = await connection.query('SHOW TABLES');
    console.log('Tables in listify_local_dev:', rows);
    await connection.end();
  } catch (err) {
    console.error('PROBE FAILED:', err);
  }
}

debugDb();
