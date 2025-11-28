import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkDevelopersTable() {
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

    const [columns] = await connection.execute('SHOW COLUMNS FROM developers');
    console.log('Developers table columns:', JSON.stringify(columns, null, 2));

  } catch (error) {
    console.error('❌ Failed to check columns:', error);
  } finally {
    if (connection) await connection.end();
  }
}

checkDevelopersTable();
