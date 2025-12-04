import { getDb } from '../server/db';

async function checkColumns() {
  try {
    console.log('🔍 Checking developments table columns...\n');
    
    const database = await getDb();
    
    // Get column information
    const [columns] = await database.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'developments'
      ORDER BY ORDINAL_POSITION;
    `);
    
    console.log('📋 Current columns in developments table:');
    console.table(columns);
    
    // Check for specific columns we need
    const columnNames = (columns as any[]).map(col => col.COLUMN_NAME);
    const requiredColumns = ['slug', 'isPublished', 'publishedAt', 'showHouseAddress', 'floorPlans', 'brochures'];
    
    console.log('\n✅ Column Status:');
    requiredColumns.forEach(col => {
      const exists = columnNames.includes(col);
      console.log(`  ${exists ? '✓' : '✗'} ${col}: ${exists ? 'EXISTS' : 'MISSING'}`);
    });
    
    // Check indexes
    const [indexes] = await database.execute(`
      SHOW INDEX FROM developments;
    `);
    
    console.log('\n📊 Current indexes:');
    console.table(indexes);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkColumns();
