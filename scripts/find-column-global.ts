
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function searchColumn() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await connection.execute(`
    SELECT TABLE_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE COLUMN_NAME = 'development_type'
    AND TABLE_SCHEMA = DATABASE()
  `);
  console.log('Tables with development_type column:');
  console.log(JSON.stringify(rows, null, 2));
  await connection.end();
}

searchColumn().catch(console.error);
