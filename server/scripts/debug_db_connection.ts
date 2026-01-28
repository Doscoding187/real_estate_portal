import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function checkDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('No DATABASE_URL');
    return;
  }

  console.log('Connecting to:', url.replace(/:[^:@]+@/, ':***@')); // Mask password

  try {
    const conn = await createConnection(url);

    const [dbs] = await conn.query('SHOW DATABASES');
    console.log('Databases:', dbs);

    const [tables] = await conn.query('SHOW TABLES');
    console.log('Current DB Tables:', tables);

    await conn.end();
  } catch (e) {
    console.error('Error:', e);
  }
}

checkDb();
