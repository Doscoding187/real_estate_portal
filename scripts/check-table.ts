import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkTable() {
  const db = await getDb();
  if (!db) return;
  
  try {
    await db.execute(sql`SELECT 1 FROM listings LIMIT 1`);
    console.log('Listings table exists');
  } catch (error) {
    console.log('Listings table does NOT exist or error:', error.message);
  }
  process.exit(0);
}

checkTable();
