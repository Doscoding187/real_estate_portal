
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

async function checkTable() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await connection.execute('DESCRIBE developers');
  fs.writeFileSync('developers_struct.json', JSON.stringify(rows, null, 2));
  await connection.end();
  console.log('Saved developers table structure to JSON.');
}

checkTable().catch(console.error);
