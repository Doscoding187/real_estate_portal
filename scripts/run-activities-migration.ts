/**
 * Script to create activities table
 * Run with: pnpm exec tsx scripts/run-activities-migration.ts
 */

import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function runActivitiesMigration() {
  console.log('🚀 Creating activities table...\n');

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

    console.log('✅ Connected to database\n');

    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'drizzle/migrations/create-activities-table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        await connection.execute(statement);
        console.log('✅ Success\n');
      }
    }

    // Verify table was created
    const [tables]: any = await connection.execute(
      "SHOW TABLES LIKE 'activities'"
    );

    if (tables.length > 0) {
      console.log('✅ Activities table created successfully!\n');
      
      // Show table structure
      const [columns]: any = await connection.execute('DESCRIBE activities');
      console.log('📋 Table structure:');
      columns.forEach((col: any) => {
        console.log(`   ${col.Field} (${col.Type})`);
      });
    } else {
      console.error('❌ Table creation failed');
      process.exit(1);
    }

  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('⚠️  Activities table already exists');
    } else {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    }
  } finally {
    if (connection) await connection.end();
  }
}

runActivitiesMigration();
