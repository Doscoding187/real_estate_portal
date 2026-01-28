import { config } from 'dotenv';
config();
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  const r = await db.execute(sql`
    SELECT COLUMN_NAME 
    FROM information_schema.COLUMNS 
    WHERE TABLE_NAME = 'listings' 
    ORDER BY ORDINAL_POSITION
  `);
  console.table(r[0]);
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
