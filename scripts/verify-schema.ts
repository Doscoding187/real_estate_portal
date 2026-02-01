import dotenv from 'dotenv';
import path from 'path';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

async function verifySchema() {
  console.log('🔍 Verifying developer_brand_profiles schema...');
  try {
    // Run SHOW CREATE TABLE
    const result = await db.execute(sql`SHOW CREATE TABLE developer_brand_profiles`);

    // Log the raw result to see the exact schema
    console.log('----------------------------------------');
    // Handle different result structures (mysql2 vs others)
    const rows = (result as any)[0];
    if (Array.isArray(rows) && rows.length > 0) {
      console.log(rows[0]['Create Table']);
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
    console.log('----------------------------------------');
    console.log('✅ Schema verification completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Schema verification failed:', error);
    process.exit(1);
  }
}

verifySchema().catch(console.error);
