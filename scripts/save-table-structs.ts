
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

async function checkTable() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await connection.execute('DESCRIBE developments');
  fs.writeFileSync('developments_struct.json', JSON.stringify(rows, null, 2));
  
  const [unitRows] = await connection.execute('DESCRIBE unit_types');
  fs.writeFileSync('unit_types_struct.json', JSON.stringify(unitRows, null, 2));
  
  await connection.end();
  console.log('Saved table structures to JSON files.');
}

checkTable().catch(console.error);
