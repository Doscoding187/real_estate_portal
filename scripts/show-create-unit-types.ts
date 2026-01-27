
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';
import 'dotenv/config';

async function showCreateUnitTypes() {
  console.log('Fetching SHOW CREATE TABLE unit_types...');
  const db = await getDb();
  if (!db) {
    console.log('Failed to connect to DB');
    return;
  }

  try {
    // @ts-ignore
    const [result] = await db.execute(sql`SHOW CREATE TABLE unit_types`);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('Error fetching create table:', e);
  }
  process.exit(0);
}

showCreateUnitTypes();
