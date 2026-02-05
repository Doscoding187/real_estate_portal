import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

import { sql } from 'drizzle-orm';
import { getDb } from '../db';

function safeStringify(x: any) {
  try {
    return JSON.stringify(x, null, 2);
  } catch {
    return String(x);
  }
}

async function main() {
  const db = await getDb();
  if (!db) throw new Error('DB not available');

  const r: any = await db.execute(sql`SHOW COLUMNS FROM users`);

  console.log('\n--- RAW RESULT TYPE ---');
  console.log('typeof r:', typeof r);
  console.log('isArray:', Array.isArray(r));
  console.log('keys:', r && typeof r === 'object' ? Object.keys(r) : 'n/a');

  const rows = r?.rows ?? r?.[0] ?? r;
  console.log('\n--- ROWS TYPE ---');
  console.log('typeof rows:', typeof rows);
  console.log('rows isArray:', Array.isArray(rows));
  console.log(
    'rows keys:',
    rows && typeof rows === 'object' && !Array.isArray(rows) ? Object.keys(rows) : 'n/a',
  );

  const first = Array.isArray(rows) ? rows[0] : rows;
  console.log('\n--- FIRST ROW ---');
  console.log(first);

  if (first && typeof first === 'object') {
    console.log('\n--- FIRST ROW KEYS ---');
    console.log(Object.keys(first));
  }

  console.log('\n--- RAW RESULT JSON (TRUNCATED-ish) ---');
  const s = safeStringify(r);
  console.log(s.length > 6000 ? s.slice(0, 6000) + '\n...<truncated>...' : s);

  console.log('\n--- END ---\n');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Failed:', err?.message ?? err);
    process.exit(1);
  });
