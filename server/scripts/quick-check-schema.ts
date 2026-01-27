/**
 * Read-only helper to print selected column definitions from the schema.
 * Run: npx tsx server/scripts/quick-check-schema.ts
 */
import 'dotenv/config';
import { getDb } from '../db-connection';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('Failed to connect to DB');
    return;
  }

  const queries = [
    "SHOW COLUMNS FROM development_phases LIKE 'id'",
    "SHOW COLUMNS FROM developments LIKE 'amenities'",
    "SHOW COLUMNS FROM developments LIKE 'highlights'",
    "SHOW COLUMNS FROM developments LIKE 'features'",
    "SHOW COLUMNS FROM unit_types LIKE 'baseMedia'",
  ];

  for (const q of queries) {
    console.log(`\nRunning: ${q}`);
    // Use raw query execution
    const result: any = await db.execute(sql.raw(q));

    // MySQL2 returns [rows, fields]
    const rows = result[0];

    if (Array.isArray(rows)) {
      rows.forEach((row: any) => {
        // CSV Format as requested
        console.log(
          `"${row.Field}","${row.Type}","${row.Null}","${row.Key}","${row.Default || ''}","${row.Extra}"`,
        );
      });
    } else {
      console.log('No rows returned or unexpected format', rows);
    }
  }
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
