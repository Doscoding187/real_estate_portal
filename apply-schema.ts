import { createConnection } from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function applySchema() {
  // Create connection without database first
  const connection = await createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Edmaritinados187#',
    port: 3306,
  });

  console.log('Connected to MySQL server');

  // Create database
  await connection.query('CREATE DATABASE IF NOT EXISTS propertifi_sa_database');
  console.log('Database propertifi_sa_database created or already exists');

  await connection.changeUser({ database: 'propertifi_sa_database' });
  console.log('Switched to propertifi_sa_database database');

  // Read and execute SQL file
  const sqlFile = path.join(__dirname, 'drizzle', '0000_dry_jack_flag.sql');
  const sql = fs.readFileSync(sqlFile, 'utf-8');

  // Split by semicolons and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    try {
      await connection.query(statement);
      console.log('Executed:', statement.substring(0, 50) + '...');
    } catch (error: any) {
      // Ignore table already exists errors
      if (error.code !== 'ER_TABLE_EXISTS_ERROR') {
        console.error('Error executing statement:', error.message);
      }
    }
  }

  console.log('\n✅ Schema applied successfully!');
  
  await connection.end();
}

applySchema().catch(error => {
  console.error('Failed to apply schema:', error);
  process.exit(1);
});
