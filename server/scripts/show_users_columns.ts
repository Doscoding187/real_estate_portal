import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

import { sql } from 'drizzle-orm';
import { getDb } from '../db';

async function main() {
  const db = await getDb();
  if (!db) throw new Error('DB not available');

  console.log('\n--- USERS TABLE COLUMNS ---');

  // Works on MySQL/TiDB
  const r: any = await db.execute(sql`SHOW COLUMNS FROM users`);

  const rows = r?.rows ?? (Array.isArray(r) ? r : []);
  for (const row of rows) {
    // Typical shape: Field, Type, Null, Key, Default, Extra
    console.log(
      `${row.Field} | ${row.Type} | null=${row.Null} | key=${row.Key} | default=${row.Default} | extra=${row.Extra}`,
    );
  }

  console.log('--- END ---\n');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Failed:', err?.message ?? err);
    process.exit(1);
  });
