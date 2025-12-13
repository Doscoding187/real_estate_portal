
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function checkPropertiesSchema() {
  console.log('Connecting to database...');
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, 
  });

  try {
    const [columns] = await connection.query('DESCRIBE properties');
    console.log('Columns in properties table:');
    (columns as any[]).forEach((col: any) => {
      console.log(`- ${col.Field} (${col.Type})`);
    });
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await connection.end();
  }
}

checkPropertiesSchema();
