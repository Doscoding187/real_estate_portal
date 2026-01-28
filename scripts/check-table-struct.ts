
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkTable() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await connection.execute('DESCRIBE developments');
  console.log(JSON.stringify(rows, null, 2));
  await connection.end();
}

checkTable().catch(console.error);
