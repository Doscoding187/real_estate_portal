/**
 * Quick check: Verify database has the data
 */

import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function quickCheck() {
  const db = await getDb();

  console.log('🔍 Checking database...\n');

  // Check Johannesburg specifically
  const jhb = await db.execute(sql`SELECT * FROM cities WHERE slug = 'johannesburg'`);
  console.log('Johannesburg:');
  console.table(jhb);

  // Check Gauteng province
  const gauteng = await db.execute(sql`SELECT * FROM provinces WHERE slug = 'gauteng'`);
  console.log('\nGauteng:');
  console.table(gauteng);

  console.log('\nDone!');
}

quickCheck().then(() => process.exit(0));
