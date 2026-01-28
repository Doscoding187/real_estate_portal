import { config } from 'dotenv';
config();
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const db = await getDb();
    console.log('--- Properties Inspection ---');
    // @ts-ignore
    const rows = await db.execute(
      sql`SELECT id, title, placeId, city, suburbId, location_id FROM properties LIMIT 5`,
    );
    // @ts-ignore
    console.table(rows[0]);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
