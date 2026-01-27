
import * as dotenv from 'dotenv';
dotenv.config();

import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const dbConn = await getDb();
  if (!dbConn) {
    console.error('No DB connection');
    return;
  }

  console.log('Describing developments table...');
  try {
     const result = await dbConn.execute(sql`DESCRIBE developments`);
     const rows = result[0];
     
     console.log('Schema for developments table:');
     if (Array.isArray(rows)) {
        rows.forEach((row: any) => {
            console.log(JSON.stringify(row));
        });
     } else {
        console.log(rows);
     }

  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

main().catch(console.error);
