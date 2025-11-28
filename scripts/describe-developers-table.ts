/**
 * Script to describe the developers table structure
 * Run with: pnpm exec tsx scripts/describe-developers-table.ts
 */

import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function describeDevelopersTable() {
  console.log('🔍 Describing developers table structure...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not defined');
    process.exit(1);
  }

  let connection;
  try {
    const dbUrl = new URL(process.env.DATABASE_URL);
    const sslParam = dbUrl.searchParams.get('ssl');
    dbUrl.searchParams.delete('ssl');
    
    connection = await createConnection({
        uri: dbUrl.toString(),
        ssl: sslParam === 'true' || sslParam === '{"rejectUnauthorized":true}' 
          ? { rejectUnauthorized: true } 
          : { rejectUnauthorized: false }
    });

    const [columns]: any = await connection.execute('DESCRIBE developers');

    console.log('📋 Developers Table Columns:\n');
    columns.forEach((col: any) => {
      console.log(`   ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `[${col.Key}]` : ''}`);
    });

  } catch (error) {
    console.error('❌ Failed to describe table:', error);
  } finally {
    if (connection) await connection.end();
  }
}

describeDevelopersTable();
