/**
 * Test Explore Feature
 * Quick script to verify the Explore feature is working correctly
 */

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

async function testExploreFeature() {
  console.log('🧪 Testing Explore Feature...\n');
  
  let connection;
  
  try {
    // Connect to database
    console.log('📡 Connecting to TiDB...');
    connection = await mysql.createConnection({
      uri: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    console.log('✅ Connected\n');
    
    // Test 1: Check explore_shorts table exists
    console.log('📋 Test 1: Check explore_shorts table...');
    const [tables]: any = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'explore_shorts'
    `);
    
    if (tables.length > 0) {
      console.log('✅ explore_shorts table exists\n');
    } else {
      console.log('❌ explore_shorts table NOT found\n');
      return;
    }
    
    // Test 2: Check required columns
    console.log('📋 Test 2: Check required columns...');
    const [columns]: any = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'explore_shorts'
    `);
    
    const columnNames = columns.map((col: any) => col.COLUMN_NAME);
    const requiredColumns = ['content_type', 'topic_id', 'category_id'];
    
    let allColumnsPresent = true;
    for (const col of requiredColumns) {
      if (columnNames.includes(col)) {
        console.log(`   ✅ ${col}`);
      } else {
        console.log(`   ❌ ${col} - MISSING`);
        allColumnsPresent = false;
      }
    }
    
    if (!allColumnsPresent) {
      console.log('\n⚠️  Some columns are missing. Run migration first:');
      console.log('   npx tsx scripts/fix-tidb-explore-columns.ts\n');
      return;
    }
    console.log();
    
    // Test 3: Check for properties
    console.log('📋 Test 3: Check for properties...');
    const [properties]: any = await connection.query(`
      SELECT COUNT(*) as count FROM properties
    `);
    
    const propertyCount = properties[0].count;
    console.log(`   Found ${propertyCount} properties`);
    
    if (propertyCount === 0) {
      console.log('   ⚠️  No properties found. Explore will be empty.\n');
    } else {
      console.log('   ✅ Properties available for Explore\n');
    }
    
    // Test 4: Check for explore content
    console.log('📋 Test 4: Check for explore content...');
    const [exploreContent]: any = await connection.query(`
      SELECT COUNT(*) as count FROM explore_shorts
    `);
    
    const contentCount = exploreContent[0].count;
    console.log(`   Found ${contentCount} explore items`);
    
    if (contentCount === 0) {
      console.log('   ℹ️  No explore content yet. Upload via /explore/upload\n');
    } else {
      console.log('   ✅ Explore content available\n');
    }
    
    // Test 5: Check indexes
    console.log('📋 Test 5: Check indexes...');
    const [indexes]: any = await connection.query(`
      SELECT INDEX_NAME 
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'explore_shorts'
      AND INDEX_NAME LIKE 'idx_explore_shorts_%'
    `);
    
    const indexNames = indexes.map((idx: any) => idx.INDEX_NAME);
    const requiredIndexes = [
      'idx_explore_shorts_content_type',
      'idx_explore_shorts_topic_id',
      'idx_explore_shorts_category_id',
    ];
    
    for (const idx of requiredIndexes) {
      if (indexNames.includes(idx)) {
        console.log(`   ✅ ${idx}`);
      } else {
        console.log(`   ⚠️  ${idx} - missing (performance may be affected)`);
      }
    }
    console.log();
    
    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SUMMARY\n');
    
    if (allColumnsPresent) {
      console.log('✅ Database schema: READY');
      console.log('✅ Required columns: PRESENT');
      console.log(`✅ Properties: ${propertyCount} available`);
      console.log(`ℹ️  Explore content: ${contentCount} items`);
      console.log();
      console.log('🎉 Explore feature is READY TO USE!\n');
      console.log('🚀 Next steps:');
      console.log('   1. Start server: npm run dev');
      console.log('   2. Visit: http://localhost:8081/explore');
      console.log('   3. Upload content: http://localhost:8081/explore/upload\n');
    } else {
      console.log('❌ Database schema: INCOMPLETE');
      console.log('⚠️  Run migration first:');
      console.log('   npx tsx scripts/fix-tidb-explore-columns.ts\n');
    }
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('📡 Connection closed');
    }
  }
}

testExploreFeature().catch(console.error);
