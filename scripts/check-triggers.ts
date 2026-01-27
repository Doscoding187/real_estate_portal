
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkTriggers() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await connection.execute('SHOW TRIGGERS LIKE "developments"');
  console.log(JSON.stringify(rows, null, 2));
  await connection.end();
}

checkTriggers().catch(console.error);
