
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { getDb } from '../server/db';
import { listings, users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('Failed to connect to DB');
    return;
  }

  console.log('--- CHECKING USER 90001 ---');
  try {
    // Assuming users table is plain, or use raw sql if unsure
    const result = await db.execute(sql`SELECT * FROM users WHERE id = 90001`);
    console.log('User 90001:', result[0]);
  } catch (e) {
    console.error('Error checking user:', e);
  }

  console.log('\n--- LISTINGS SCHEMA ---');
  try {
    const result = await db.execute(sql`SHOW CREATE TABLE listings`);
    // Result is usually [[{ 'Create Table': ... }]]
    // @ts-ignore
    console.log(result[0][0]['Create Table']);
  } catch (e) {
    console.error('Error checking schema:', e);
  }
  
  process.exit(0);
}

main();
