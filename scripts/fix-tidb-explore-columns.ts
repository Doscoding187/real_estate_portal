/**
 * Fix TiDB Explore Shorts Missing Columns
 * 
 * This script safely adds missing columns to the existing explore_shorts table
 */

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function fixExploreColumns() {
  console.log('🚀 Fixing TiDB Explore Shorts Columns...\n');
  
  let connection;
  
  try {
    // Connect to TiDB
    console.log('📡 Connecting to TiDB...');
    connection = await mysql.createConnection({
      uri: DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    });
    
    console.log('✅ Connected successfully\n');
    
    // Check if table exists
    console.log('🔍 Checking if explore_shorts table exists...');
    const [tables]: any = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'explore_shorts'
    `);
    
    if (tables.length === 0) {
      console.log('❌ explore_shorts table does not exist');
      console.log('   Run the full migration first: npx tsx scripts/run-explore-shorts-migration.ts');
      process.exit(1);
    }
    
    console.log('✅ Table exists\n');
    
    // Get existing columns
    console.log('🔍 Checking existing columns...');
    const [columns]: any = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'explore_shorts'
    `);
    
    const existingColumns = columns.map((col: any) => col.COLUMN_NAME);
    console.log(`   Found ${existingColumns.length} columns\n`);
    
    // Define columns to add
    const columnsToAdd = [
      {
        name: 'content_type',
        definition: "VARCHAR(50) DEFAULT 'property' AFTER developer_id",
      },
      {
        name: 'topic_id',
        definition: 'INT NULL AFTER content_type',
      },
      {
        name: 'category_id',
        definition: 'INT NULL AFTER topic_id',
      },
    ];
    
    // Add missing columns
    console.log('⚙️  Adding missing columns...\n');
    let addedCount = 0;
    
    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name)) {
        try {
          console.log(`   Adding column: ${col.name}`);
          await connection.query(`
            ALTER TABLE explore_shorts 
            ADD COLUMN ${col.name} ${col.definition}
          `);
          console.log(`   ✅ Added ${col.name}`);
          addedCount++;
        } catch (error: any) {
          console.log(`   ⚠️  ${col.name}: ${error.message}`);
        }
      } else {
        console.log(`   ⏭️  ${col.name} already exists`);
      }
    }
    
    console.log(`\n✅ Added ${addedCount} new column(s)\n`);
    
    // Add indexes
    console.log('⚙️  Adding indexes...\n');
    const indexes = [
      {
        name: 'idx_explore_shorts_content_type',
        definition: 'content_type',
      },
      {
        name: 'idx_explore_shorts_topic_id',
        definition: 'topic_id',
      },
      {
        name: 'idx_explore_shorts_category_id',
        definition: 'category_id',
      },
    ];
    
    for (const idx of indexes) {
      try {
        await connection.query(`
          CREATE INDEX ${idx.name} ON explore_shorts(${idx.definition})
        `);
        console.log(`   ✅ Created index: ${idx.name}`);
      } catch (error: any) {
        if (error.code === 'ER_DUP_KEYNAME') {
          console.log(`   ⏭️  Index ${idx.name} already exists`);
        } else {
          console.log(`   ⚠️  ${idx.name}: ${error.message}`);
        }
      }
    }
    
    // Verify final state
    console.log('\n🔍 Verifying final state...\n');
    const [finalColumns]: any = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'explore_shorts'
      ORDER BY ORDINAL_POSITION
    `);
    
    const finalColumnNames = finalColumns.map((col: any) => col.COLUMN_NAME);
    const requiredColumns = ['content_type', 'topic_id', 'category_id'];
    
    console.log('   Required columns:');
    let allPresent = true;
    for (const col of requiredColumns) {
      if (finalColumnNames.includes(col)) {
        console.log(`   ✅ ${col}`);
      } else {
        console.log(`   ❌ ${col} - MISSING`);
        allPresent = false;
      }
    }
    
    if (allPresent) {
      console.log('\n✨ SUCCESS! All required columns are present\n');
      console.log('🎯 Next steps:');
      console.log('   1. Restart your application server');
      console.log('   2. Test: curl http://localhost:8081/api/explore/feed');
      console.log('   3. Visit the Explore page in your browser\n');
    } else {
      console.log('\n⚠️  Some columns are still missing. Please check the errors above.\n');
    }
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('📡 Connection closed');
    }
  }
}

// Run the fix
fixExploreColumns().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
