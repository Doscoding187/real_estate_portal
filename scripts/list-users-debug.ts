import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function listUsers() {
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

    const [rows] = await connection.execute('SELECT id, email, role, emailVerified, createdAt FROM users ORDER BY createdAt DESC LIMIT 5');
    console.log('Recent users:', rows);

  } catch (error) {
    console.error('❌ Failed to list users:', error);
  } finally {
    if (connection) await connection.end();
  }
}

listUsers();
