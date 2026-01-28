import dotenv from 'dotenv';
dotenv.config();
import { db, getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function run() {
  const query = process.argv[2];
  if (!query) {
    console.error('Please provide a SQL query as an argument');
    process.exit(1);
  }

  try {
    // Initialize DB connection
    await getDb();

    // Execute raw query
    const result = await db.execute(sql.raw(query));
    console.log(JSON.stringify(result[0], null, 2));
  } catch (error) {
    console.error('Error executing query:', error);
  }

  process.exit(0);
}

run();
