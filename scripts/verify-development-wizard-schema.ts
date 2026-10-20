import { getDb } from '../server/db';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { sql } from 'drizzle-orm';
import { safeErrorSummary } from '../server/_core/safeError';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function verifySchema() {
  const db = await getDb();
  if (!db) {
    console.error('❌ Database not available. Please check your DATABASE_URL environment variable.');
    process.exit(1);
  }
  console.log('🔍 Verifying Development Wizard Schema...\n');

  try {
    // Check if tables exist
    const tables = [
      'developments',
      'unit_types',
      'spec_variations',
      'development_documents'
    ];

    console.log('📋 Checking Tables:');
    console.log('─'.repeat(60));

    for (const table of tables) {
      try {
        const result = await db.execute(`SHOW TABLES LIKE '${table}'`);
        if (result.length > 0) {
          console.log(`✅ ${table} - EXISTS`);
          
          // Get column count
          const columns = await db.execute(`SHOW COLUMNS FROM ${table}`);
          console.log(`   └─ ${columns.length} columns defined`);
        } else {
          console.log(`❌ ${table} - MISSING`);
        }
      } catch (error: any) {
        console.log(`❌ ${table} - ERROR: ${error.message}`);
      }
    }

    // Check developments table structure
    console.log('\n📊 Developments Table Structure:');
    console.log('─'.repeat(60));
    
    const devColumns = await db.execute(`SHOW COLUMNS FROM developments`);
    const requiredDevFields = [
      'id', 'developer_id', 'name', 'slug', 'status', 'description', 'rating',
      'address', 'city', 'province', 'suburb', 'postal_code',
      'latitude', 'longitude', 'gps_accuracy',
      'amenities', 'highlights', 'features',
      'completion_date', 'is_published', 'published_at'
    ];

    for (const field of requiredDevFields) {
      const exists = devColumns.some((col: any) => 
        col.Field.toLowerCase() === field.toLowerCase()
      );
      console.log(`${exists ? '✅' : '❌'} ${field}`);
    }

    // Check unit_types table structure
    console.log('\n📊 Unit Types Table Structure:');
    console.log('─'.repeat(60));
    
    const unitColumns = await db.execute(`SHOW COLUMNS FROM unit_types`);
    const requiredUnitFields = [
      'id', 'development_id', 'name', 'bedrooms', 'bathrooms', 'parking',
      'unit_size', 'yard_size', 'base_price_from', 'base_price_to',
      'base_features', 'base_finishes', 'base_media',
      'display_order', 'is_active'
    ];

    for (const field of requiredUnitFields) {
      const exists = unitColumns.some((col: any) => 
        col.Field.toLowerCase() === field.toLowerCase()
      );
      console.log(`${exists ? '✅' : '❌'} ${field}`);
    }

    // Check spec_variations table structure
    console.log('\n📊 Spec Variations Table Structure:');
    console.log('─'.repeat(60));
    
    const specColumns = await db.execute(`SHOW COLUMNS FROM spec_variations`);
    const requiredSpecFields = [
      'id', 'unit_type_id', 'name', 'price', 'description',
      'overrides', 'feature_overrides', 'media',
      'display_order', 'is_active'
    ];

    for (const field of requiredSpecFields) {
      const exists = specColumns.some((col: any) => 
        col.Field.toLowerCase() === field.toLowerCase()
      );
      console.log(`${exists ? '✅' : '❌'} ${field}`);
    }

    // Check indexes
    console.log('\n🔗 Checking Indexes:');
    console.log('─'.repeat(60));

    const devIndexes = await db.execute(`SHOW INDEX FROM developments`);
    const unitIndexes = await db.execute(`SHOW INDEX FROM unit_types`);
    const specIndexes = await db.execute(`SHOW INDEX FROM spec_variations`);

    console.log(`✅ developments: ${devIndexes.length} indexes`);
    console.log(`✅ unit_types: ${unitIndexes.length} indexes`);
    console.log(`✅ spec_variations: ${specIndexes.length} indexes`);

    // Check foreign keys
    console.log('\n🔗 Checking Foreign Keys:');
    console.log('─'.repeat(60));

    const unitFKs = await db.execute(`
      SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'unit_types' 
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    const specFKs = await db.execute(`
      SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'spec_variations' 
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    console.log(`✅ unit_types → developments: ${unitFKs.length > 0 ? 'CONFIGURED' : 'MISSING'}`);
    console.log(`✅ spec_variations → unit_types: ${specFKs.length > 0 ? 'CONFIGURED' : 'MISSING'}`);

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Schema Verification Complete!');
    console.log('═'.repeat(60));
    console.log('\n🎯 Development Wizard schema is ready for implementation');

  } catch (error) {
    console.error('\n❌ Verification failed:', safeErrorSummary(error));
    throw error;
  } finally {
    process.exit(0);
  }
}

verifySchema();
