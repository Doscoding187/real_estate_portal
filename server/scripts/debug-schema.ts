import { db, getDb } from '../db';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

async function run() {
  await getDb();
  try {
    const [createTable] = await db.execute(sql`SHOW CREATE TABLE audit_logs`);
    console.log('SHOW CREATE TABLE audit_logs:', createTable);

    const [columns] = await db.execute(sql`SHOW COLUMNS FROM audit_logs`);
    console.log('SHOW COLUMNS FROM audit_logs:', columns);
  } catch (err) {
    console.error('Error describing table:', err);
  }
  process.exit(0);
}

run();
