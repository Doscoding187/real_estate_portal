import { createPool } from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runMigration() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not defined');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const pool = createPool({
    uri: dbUrl,
    ssl: {
      rejectUnauthorized: false // For development
    }
  });

  try {
    const migrationPath = path.resolve(process.cwd(), 'migrations/create-saved-searches-table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration...');
    await pool.query(sql);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
