import { getDb } from './db-connection';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

async function run() {
  const db = await getDb();
  if (!db) return;

  // @ts-ignore
  await db.execute(sql`CREATE DATABASE IF NOT EXISTS listify_test`);
  console.log('✅ Created/Verified listify_test database');
  process.exit(0);
}

run();
