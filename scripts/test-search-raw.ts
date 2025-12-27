import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq, like, desc, and, sql } from 'drizzle-orm';
import * as schema from '../drizzle/schema.js';

async function testSearchRaw() {
  console.log('Connecting to database...');
  
  const dbUrl = process.env.DATABASE_URL || '';
  const connection = await mysql.createConnection({
    uri: dbUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  // Raw SQL query to bypass Drizzle
  console.log('\n=== Raw SQL: Published listings ===');
  const [publishedRows] = await connection.query(
    `SELECT id, title, city, status FROM listings WHERE status = 'published'`
  ) as any;
  console.log(`Found ${publishedRows.length} published listings`);
  console.table(publishedRows);
  
  console.log('\n=== Raw SQL: Published + Alberton ===');
  const [albertonRows] = await connection.query(
    `SELECT id, title, city, status FROM listings WHERE status = 'published' AND city LIKE '%Alberton%'`
  ) as any;
  console.log(`Found ${albertonRows.length} matching`);
  console.table(albertonRows);
  
  console.log('\n=== Check status column values ===');
  const [statusValues] = await connection.query(
    `SELECT DISTINCT status FROM listings`
  ) as any;
  console.table(statusValues);
  
  await connection.end();
  console.log('\nDone!');
}

testSearchRaw().catch(console.error);
