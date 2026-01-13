import 'dotenv/config';
import { getDb } from '../server/db-connection';

async function checkColumns() {
  console.log('\n--- Checking if financial columns exist in database ---');
  
  const db = await getDb();
  if (!db) {
    console.error('❌ Database connection failed');
    return;
  }

  const [result] = await db.execute(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'developments' 
      AND COLUMN_NAME IN (
        'monthly_levy_from', 
        'monthly_levy_to', 
        'rates_from', 
        'rates_to',
        'transfer_costs_included',
        'is_high_demand',
        'dev_owner_type',
        'is_showcase',
        'estateSpecs'
      )
  `) as any;

  console.log('\nColumns found in database:', result);
  console.log('\nColumns count:', result.length);
  
  if (result.length === 0) {
    console.log('\n⚠️  NONE of the columns exist - migration should be ADD COLUMN, not MODIFY');
  } else {
    console.log('\n✅ Some columns exist - MODIFY is correct for those');
  }

  process.exit(0);
}

checkColumns().catch(console.error);
