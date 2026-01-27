import 'dotenv/config';
import { getDb } from './server/db-connection';
import { sql } from 'drizzle-orm';

async function checkSchema() {
  const db = await getDb();
  if (!db) {
    console.error('Failed to connect to DB');
    return;
  }

  try {
    const databaseName = process.env.DB_NAME || 'real_estate_portal'; // Adjust if needed or query current db
    console.log('Checking schema for tables in current database...');

    // developments
    const devColumns = await db.execute(sql`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM information_schema.columns 
      WHERE table_name = 'developments' AND table_schema = DATABASE()
      ORDER BY COLUMN_NAME
    `);
    
    console.log('\n--- DEVELOPMENTS Table Columns (Sorted) ---');
    // Log as list to avoid truncation
    const cols = (devColumns[0] as any[]).map(c => c.COLUMN_NAME + ' (' + c.DATA_TYPE + ')');
    console.log(cols.join('\n'));


    // unit_types
    const unitColumns = await db.execute(sql`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY 
      FROM information_schema.columns 
      WHERE table_name = 'unit_types' AND table_schema = DATABASE()
    `);
    
    console.log('\n--- UNIT_TYPES Table Columns ---');
    console.table(unitColumns[0]);


  } catch (e) {
    console.error('Error querying information_schema:', e);
  }
  
  process.exit(0);
}

checkSchema();
