
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { users } from '../drizzle/schema';
import { count } from 'drizzle-orm';

dotenv.config();

async function check() {
  try {
    const connection = await mysql.createConnection({
      uri: process.env.DATABASE_URL
    });
    const db = drizzle(connection);
    const [result] = await db.select({ count: count() }).from(users);
    console.log(`User count: ${result.count}`);
    await connection.end();
  } catch (e) {
    console.log('Error checking DB:', e.message);
  }
}
check();
