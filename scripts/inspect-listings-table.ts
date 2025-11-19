import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function inspectTable() {
  const db = await getDb();
  if (!db) {
    console.error('Failed to connect to database');
    return;
  }
  
  try {
    const columns = await db.execute(sql`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'listify_property_sa' 
      AND TABLE_NAME = 'listings';
    `);
    
    console.log('Columns in listings table:');
    console.table(columns[0]);

    const mediaColumns = await db.execute(sql`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'listify_property_sa' 
      AND TABLE_NAME = 'listing_media';
    `);

    console.log('Columns in listing_media table:');
    console.table(mediaColumns[0]);

  } catch (error) {
    console.error('Error inspecting table:', error);
  }
  process.exit(0);
}

inspectTable();
