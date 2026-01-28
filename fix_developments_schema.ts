import 'dotenv/config';
import { getDb } from './server/db-connection';
import { sql } from 'drizzle-orm';

async function fixDevelopmentsSchema() {
  const db = await getDb();
  if (!db) {
    console.error('Failed to connect to database');
    process.exit(1);
  }

  console.log('Altering developments table to add missing columns...');

  const columnsToAdd = [
    { name: 'ownership_type', type: 'VARCHAR(255)' },
    { name: 'structural_type', type: 'VARCHAR(255)' },
    { name: 'floors', type: 'INT' }
  ];

  for (const col of columnsToAdd) {
    try {
      // Check if column exists first to avoid error
      const check = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM information_schema.columns 
        WHERE table_name = 'developments' 
        AND table_schema = DATABASE() 
        AND column_name = ${col.name}
      `);
      
      const exists = (check[0] as any)[0].count > 0;

      if (!exists) {
        console.log(`Adding ${col.name}...`);
        await db.execute(sql.raw(`ALTER TABLE developments ADD COLUMN ${col.name} ${col.type}`));
        console.log(`Added ${col.name}`);
      } else {
        console.log(`Column ${col.name} already exists.`);
      }
    } catch (e: any) {
      console.error(`Error adding ${col.name}:`, e.message);
    }
  }

  console.log('Schema update complete.');
  process.exit(0);
}

fixDevelopmentsSchema();
