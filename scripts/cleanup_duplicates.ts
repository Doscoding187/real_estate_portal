import dotenv from 'dotenv';
dotenv.config();
import { db, getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    await getDb();

    console.log('Cleaning duplicate provinces...');
    // Delete provinces with ID > 20 (assuming 1-9 are the canonical ones)
    // We use a safe delete that only targets the duplicates
    const result = await db.execute(sql`
      DELETE FROM provinces 
      WHERE id > 20
    `);

    console.log('Deleted duplicate provinces. Result:', result[0]);

    // Check remaining
    const remaining = await db.execute(sql`SELECT id, name FROM provinces ORDER BY id`);
    console.log('Remaining provinces:', JSON.stringify(remaining[0], null, 2));
  } catch (error) {
    console.error('Error cleaning duplicates:', error);
  }
  process.exit(0);
}

run();
