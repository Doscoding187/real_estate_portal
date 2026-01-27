import 'dotenv/config'; // Load env vars
import { getDb } from '../server/db-connection';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('🔍 Starting Schema Investigation...');

  try {
    const db = await getDb();
    if (!db) {
        console.error('❌ Failed to connect to DB (getDb returned null)');
        process.exit(1);
    }
    console.log('✅ Connection established');

    const tables = ['developments', 'unit_types', 'locations'];
    
    for (const table of tables) {
      console.log(`\n📄 Schema for table: ${table}`);
      try {
        const [createResult] = await db.execute(sql.raw(`SHOW CREATE TABLE ${table}`));
        // @ts-ignore
        console.log(createResult[0]['Create Table']);
      } catch (e: any) {
        console.error(`❌ Failed to get schema for ${table}:`, e.message);
      }
    }

    // 2. Check Constraints/Foreign Keys (covered by SHOW CREATE TABLE)
    
    // 3. Check for specific ENUM columns
    const enumsToCheck = [
      { table: 'developments', column: 'status' },
      { table: 'developments', column: 'dev_owner_type' }, // Check snake_case mapping
      { table: 'unit_types', column: 'parking' },
    ];

    console.log('\n📊 Checking ENUM columns...');
    for (const item of enumsToCheck) {
        try {
            const [cols] = await db.execute(sql.raw(`SHOW COLUMNS FROM ${item.table} LIKE '${item.column}'`));
             // @ts-ignore
            if (Array.isArray(cols) && cols.length > 0) {
                 // @ts-ignore
                console.log(`${item.table}.${item.column} Type:`, cols[0].Type);
            } else {
                console.log(`⚠️ Column ${item.column} not found in ${item.table}`);
            }
        } catch (e: any) {
             console.error(`❌ Failed to check enum ${item.table}.${item.column}:`, e.message);
        }
    }
    
    // 4. Counts
    console.log('\n🔢 Row Counts:');
    for (const table of tables) {
        try {
            const [countRes] = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
             // @ts-ignore
            console.log(`${table}:`, countRes[0].count);
        } catch (e) {}
    }

  } catch (error) {
    console.error('🔥 Fatal Error:', error);
  }

  process.exit(0);
}

main();
