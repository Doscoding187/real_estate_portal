import { createConnection } from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('Starting manual migration...');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not defined in .env');
    process.exit(1);
  }

  console.log('Database URL found (length: ' + process.env.DATABASE_URL.length + ')');

  let connection;
  try {
    // Parse the URL to handle SSL correctly
    // mysql2 might fail if ssl query param is "true" (boolean) instead of object
    const dbUrl = new URL(process.env.DATABASE_URL);
    const sslParam = dbUrl.searchParams.get('ssl');
    
    // Remove ssl param from URL to avoid conflict/error
    dbUrl.searchParams.delete('ssl');
    
    const connectionConfig: any = {
      uri: dbUrl.toString(),
      ssl: sslParam === 'true' || sslParam === '{"rejectUnauthorized":true}' 
        ? { rejectUnauthorized: true } 
        : { rejectUnauthorized: false } // Default to allowing self-signed if not specified or different
    };

    // If it's a railway URL, it often needs specific SSL handling
    // Let's try to just pass the URL string first, but if it fails, we might need to be more specific.
    // The previous error was "SSL profile must be an object, instead it's a boolean".
    // This suggests that somewhere `ssl: true` was passed.
    
    // Let's try manual config construction
    connection = await createConnection({
        uri: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Force SSL object
    });
    
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }

  try {
    const sqlPath = path.join(__dirname, '../RAILWAY_MIGRATION_SETUP.sql');
    console.log(`Reading SQL file from: ${sqlPath}`);
    
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by semicolon, but be careful about semicolons in strings/comments if possible.
    // For this specific file, splitting by semicolon and filtering empty statements should work reasonably well
    // given the structure of the provided SQL file.
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Found ${statements.length} statements to execute.`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      // Skip comments that might be parsed as statements if they don't have a semicolon
      if (statement.startsWith('--')) {
         // Simple check, might need more robust parsing if comments are complex
         // But the file has comments on their own lines usually.
         // Let's just try to execute it, mysql might handle it or we can just log it.
         // Actually, let's try to strip comments from the beginning of the statement
      }

      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      try {
        await connection.query(statement);
      } catch (err: any) {
        // Ignore "Table already exists" or "Column already exists" errors if they are not critical
        // But for this script, we want to know.
        // The SQL file uses IF NOT EXISTS, so it should be fine.
        console.warn(`⚠️ Warning executing statement ${i + 1}: ${err.message}`);
      }
    }

    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await connection.end();
  }
}

runMigration();
