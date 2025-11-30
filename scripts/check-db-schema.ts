import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';
import 'dotenv/config';

async function checkSchema() {
  console.log('Checking database schema...');
  const db = await getDb();
  if (!db) {
    console.log('Failed to connect to DB');
    return;
  }

  try {
    console.log('Checking if agents table exists...');
    // @ts-ignore
    const [result] = await db.execute(sql`SHOW TABLES LIKE 'agents'`);
    console.log('Agents table check result:', result);
    
    if (Array.isArray(result) && result.length > 0) {
        console.log('Agents table exists. Checking columns...');
        // @ts-ignore
        const [columns] = await db.execute(sql`SHOW COLUMNS FROM agents`);
        console.log('Agents columns:', columns);
    } else {
        console.log('Agents table does NOT exist.');
    }
  } catch (e) {
    console.error('Error checking schema:', e);
  }
  process.exit(0);
}

checkSchema();
