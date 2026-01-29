import dotenv from 'dotenv';
import path from 'path';

// Replicate start.ts loading logic
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

import { getDb } from '../db';
import { sql } from 'drizzle-orm';

async function verifyLocalDb() {
  console.log('Testing application database connection...');
  try {
    const db = await getDb();
    if (!db) {
      console.error('❌ Failed to connect to database');
      return;
    }

    // Check current database name
    const result = await db.execute(sql`SELECT DATABASE() as dbName`);
    const dbName = (result[0] as any)[0].dbName;

    console.log(`✅ Connected to database: ${dbName}`);

    if (dbName === 'listify_local_dev') {
      console.log('🎉 SUCCESS: Application is using the LOCAL database.');
    } else {
      console.error('⚠️ WARNING: Application is NOT using the expected local database.');
    }
  } catch (error) {
    console.error('Error querying database:', error);
  }
  process.exit(0);
}

verifyLocalDb();
