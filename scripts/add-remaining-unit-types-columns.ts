import 'dotenv/config';
import { getDb } from '../server/db-connection';

async function addRemainingColumns() {
  console.log('\n--- Adding Remaining Unit Types Columns ---');
  
  const db = await getDb();
  if (!db) {
    console.error('❌ Database connection failed');
    return;
  }

  const columns = [
    "ALTER TABLE `unit_types` ADD COLUMN `monthly_levy_from` int DEFAULT NULL",
    "ALTER TABLE `unit_types` ADD COLUMN `rates_and_taxes_from` int DEFAULT NULL",
    "ALTER TABLE `unit_types` ADD COLUMN `extras` json DEFAULT NULL"
  ];

  for (const sql of columns) {
    try {
      await db.execute(sql);
      const colName = sql.match(/ADD COLUMN `(\w+)`/)?.[1];
      console.log(`✅ Added: ${colName}`);
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        const colName = sql.match(/ADD COLUMN `(\w+)`/)?.[1];
        console.log(`⚠️  Already exists: ${colName}`);
      } else {
        throw error;
      }
    }
  }

  console.log('\n✅ All columns added!\n');
  process.exit(0);
}

addRemainingColumns().catch((error) => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});
