import dotenv from 'dotenv';
import path from 'path';
import { sql } from 'drizzle-orm';
import { getDb } from '../db';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

async function showColumns(db: any, table: string) {
  console.log(`\n--- SHOW COLUMNS FROM ${table} ---`);
  try {
    const r: any = await db.execute(sql.raw(`SHOW COLUMNS FROM \`${table}\``));
    // mysql2 returns [rows, fields] sometimes; your earlier output showed r isArray true with index 0 holding rows
    const rows = Array.isArray(r) ? r[0] : (r?.rows ?? r);
    if (!Array.isArray(rows)) {
      console.log('Unexpected shape:', rows);
      return;
    }
    for (const row of rows) console.log(row);
  } catch (e: any) {
    console.log(`ERROR: ${e?.message || e}`);
  }
  console.log(`--- END ${table} ---`);
}

async function main() {
  const db = await getDb();

  await showColumns(db, 'developments');
  await showColumns(db, 'developers');

  // IMPORTANT: based on your users columns + your report, this table is likely the correct one:
  await showColumns(db, 'developer_brand_profiles');

  // If your codebase really has developer_profiles, this will confirm too:
  await showColumns(db, 'developer_profiles');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
