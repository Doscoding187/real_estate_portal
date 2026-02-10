import { sql } from 'drizzle-orm';
import { db, getDb } from './db-connection';
import * as dotenv from 'dotenv';
import path from 'path';

// Force load .env.local if not in production/staging explicitly
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
}

async function verify() {
  console.log('--- Environment Verification ---');
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined (defaults to dev)'}`);

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing!');
    process.exit(1);
  }

  const dbUrl = new URL(process.env.DATABASE_URL);
  console.log(`DATABASE_NAME (from URL): ${dbUrl.pathname.replace('/', '')}`);
  console.log(`DATABASE_HOST (from URL): ${dbUrl.hostname}`);

  try {
    const _drizzle = await getDb(); // This triggers the [Database] Connected to... log internally

    // Manual SQL verify
    // @ts-expect-error
    const pool = _drizzle.session.client;
    // Drizzle mysql2 pool access might differ, but getDb uses the pool.
    // actually getDb returns the drizzle instance.
    // We can use sql execute

    const [rows] = await _drizzle.execute(sql`SELECT DATABASE() as db, @@hostname as host`);
    console.log('SQL Verification Output:', rows[0]);
  } catch (e) {
    console.error('Verification failed:', e);
    process.exit(1);
  }
  process.exit(0);
}

verify();
