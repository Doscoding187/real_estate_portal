import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkColumns() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL!,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    console.log('Checking developers table columns...\n');

    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'listify_property_sa' 
      AND TABLE_NAME = 'developers'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('All columns in developers table:');
    console.log('=====================================');
    (columns as any[]).forEach(col => {
      console.log(`${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
    process.exit(0);
  }
}

checkColumns();
