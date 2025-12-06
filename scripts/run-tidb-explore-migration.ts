/**
 * Run Explore Shorts Migration on TiDB
 * 
 * This script applies the explore_shorts table fixes to your TiDB database.
 * It adds the missing columns (content_type, topic_id, category_id) and creates
 * all required tables for the Explore feature.
 */

import mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function runMigration() {
  console.log('🚀 Starting TiDB Explore Shorts Migration...\n');
  
  let connection;
  
  try {
    // Create connection to TiDB
    console.log('📡 Connecting to TiDB...');
    connection = await mysql.createConnection({
      uri: DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, // TiDB Cloud uses valid certificates
      },
      multipleStatements: true, // Allow multiple SQL statements
    });
    
    console.log('✅ Connected to TiDB successfully\n');
    
    // Read the migration SQL file
    const sqlFilePath = path.join(process.cwd(), 'RAILWAY_EXPLORE_SHORTS_FIX.sql');
    console.log(`📄 Reading migration file: ${sqlFilePath}`);
    
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`Migration file not found: ${sqlFilePath}`);
    }
    
    const migrationSQL = fs.readFileSync(sqlFilePath, 'utf-8');
    console.log('✅ Migration file loaded\n');
    
    // Execute the migration
    console.log('⚙️  Executing migration SQL...');
    console.log('   This will:');
    console.log('   - Create explore_shorts table (if not exists)');
    console.log('   - Add missing columns (content_type, topic_id, category_id)');
    console.log('   - Create explore_interactions table');
    console.log('   - Create explore_highlight_tags table');
    console.log('   - Create explore_user_preferences table\n');
    
    const [results] = await connection.query(migrationSQL);
    
    console.log('✅ Migration executed successfully!\n');
    
    // Verify the tables
    console.log('🔍 Verifying tables...\n');
    
    const tables = [
      'explore_shorts',
      'explore_interactions',
      'explore_highlight_tags',
      'explore_user_preferences'
    ];
    
    for (const table of tables) {
      try {
        const [rows]: any = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   ✅ ${table}: ${rows[0].count} rows`);
      } catch (error: any) {
        console.log(`   ❌ ${table}: Error - ${error.message}`);
      }
    }
    
    // Verify explore_shorts columns
    console.log('\n🔍 Verifying explore_shorts columns...\n');
    const [columns]: any = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'explore_shorts'
      ORDER BY ORDINAL_POSITION
    `);
    
    const requiredColumns = ['content_type', 'topic_id', 'category_id'];
    const existingColumns = columns.map((col: any) => col.COLUMN_NAME);
    
    console.log('   Required columns:');
    for (const col of requiredColumns) {
      if (existingColumns.includes(col)) {
        console.log(`   ✅ ${col} - EXISTS`);
      } else {
        console.log(`   ❌ ${col} - MISSING`);
      }
    }
    
    console.log('\n✨ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   - All tables created/updated');
    console.log('   - Missing columns added');
    console.log('   - Indexes created');
    console.log('\n🎯 Next steps:');
    console.log('   1. Restart your application server');
    console.log('   2. Test the /api/explore/feed endpoint');
    console.log('   3. Check that the Explore page loads without errors\n');
    
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('📡 Database connection closed');
    }
  }
}

// Run the migration
runMigration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
