
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

async function checkCreateTable() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows]: any = await connection.execute('SHOW CREATE TABLE developments');
  fs.writeFileSync('developments_sql.txt', rows[0]['Create Table']);
  await connection.end();
  console.log('Saved CREATE TABLE to developments_sql.txt');
}

checkCreateTable().catch(console.error);
