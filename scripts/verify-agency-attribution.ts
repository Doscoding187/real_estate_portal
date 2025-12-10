import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function verify() {
  console.log('🔍 Verifying Agency Attribution Migration...\n');

  const db = await getDb();

  // Check explore_shorts columns
  console.log('📋 explore_shorts table:');
  const shortsColumns = await db.execute(sql`
    SELECT 
      COLUMN_NAME, 
      DATA_TYPE, 
      IS_NULLABLE, 
      COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'explore_shorts' 
      AND COLUMN_NAME = 'agency_id'
  `);
  console.log(shortsColumns);

  // Check explore_content columns
  console.log('\n📋 explore_content table:');
  const contentColumns = await db.execute(sql`
    SELECT 
      COLUMN_NAME, 
      DATA_TYPE, 
      IS_NULLABLE, 
      COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'explore_content' 
      AND COLUMN_NAME IN ('creator_type', 'agency_id')
    ORDER BY ORDINAL_POSITION
  `);
  console.log(contentColumns);

  // Check indexes
  console.log('\n📊 Indexes:');
  const indexes = await db.execute(sql`
    SELECT 
      TABLE_NAME,
      INDEX_NAME,
      GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS COLUMNS
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('explore_shorts', 'explore_content')
      AND INDEX_NAME LIKE '%agency%'
    GROUP BY TABLE_NAME, INDEX_NAME
    ORDER BY TABLE_NAME, INDEX_NAME
  `);
  console.log(indexes);

  console.log('\n✅ Verification complete!');
}

verify()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
