import { getDb } from './db-connection';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import path from 'path';

// Force load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

async function run() {
  const db = await getDb();
  if (!db) return;

  const [rows] = (await db.execute(sql`SHOW DATABASES`)) as [{ Database: string }[], unknown];
  console.log(
    'Databases:',
    rows.map(r => r.Database),
  );
  process.exit(0);
}

run();
