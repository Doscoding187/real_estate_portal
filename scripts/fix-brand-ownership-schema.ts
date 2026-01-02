/**
 * Fix Developer ID Nullable & Marketing Role Enum
 * 
 * This migration fixes two critical issues preventing brand-owned developments:
 * 1. developer_id must be nullable for platform/brand ownership
 * 2. marketing_role enum must match actual values used ('exclusive', 'joint', 'open')
 * 
 * Run: npx tsx scripts/fix-brand-ownership-schema.ts
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';

async function fixBrandOwnershipSchema() {
  console.log('🔧 Starting brand ownership schema fix...');

  // Parse DATABASE_URL and create proper config
  const dbUrl = process.env.DATABASE_URL!;
  const url = new URL(dbUrl);
  
  const config = {
    host: url.hostname,
    port: parseInt(url.port || '3306'),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: url.searchParams.get('ssl') === 'true' ? { rejectUnauthorized: true } : undefined,
  };

  const connection = await mysql.createConnection(config);

  try {
    // ===== FIX 1: Make developer_id NULLABLE =====
    console.log('\n📌 FIX 1: Making developer_id nullable...');
    
    // Check current column definition
    const [columns] = await connection.query<any[]>(`
      SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'developments' 
        AND COLUMN_NAME = 'developer_id'
    `);

    if (columns.length > 0) {
      const col = columns[0];
      console.log(`   Current: developer_id ${col.COLUMN_TYPE} (nullable: ${col.IS_NULLABLE})`);
      
      if (col.IS_NULLABLE === 'NO') {
        console.log('   ➕ Altering to allow NULL...');
        await connection.query(`
          ALTER TABLE developments 
          MODIFY developer_id INT NULL
        `);
        console.log('   ✅ developer_id is now nullable');
      } else {
        console.log('   ⏭️  Already nullable, skipping');
      }
    } else {
      console.log('   ⚠️  developer_id column not found (this is unexpected)');
    }

    // ===== FIX 2: Fix marketing_role ENUM =====
    console.log('\n📌 FIX 2: Fixing marketing_role enum...');
    
    // Check current enum values
    const [roleColumns] = await connection.query<any[]>(`
      SELECT COLUMN_NAME, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'developments' 
        AND COLUMN_NAME = 'marketing_role'
    `);

    if (roleColumns.length > 0) {
      const col = roleColumns[0];
      console.log(`   Current: ${col.COLUMN_TYPE}`);
      
      // Check if it needs updating
      const needsUpdate = !col.COLUMN_TYPE.includes('exclusive');
      
      if (needsUpdate) {
        console.log("   ➕ Updating enum to 'exclusive','joint','open'...");
        await connection.query(`
          ALTER TABLE developments 
          MODIFY marketing_role ENUM('exclusive','joint','open') NULL
        `);
        console.log('   ✅ marketing_role enum updated');
      } else {
        console.log('   ⏭️  Enum already correct, skipping');
      }
    } else {
      console.log('   ⚠️  marketing_role column not found');
    }

    // ===== VERIFICATION =====
    console.log('\n📌 VERIFICATION: Checking final schema...');
    
    const [finalCheck] = await connection.query<any[]>(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'developments' 
        AND COLUMN_NAME IN ('developer_id', 'marketing_role', 'dev_owner_type')
      ORDER BY COLUMN_NAME
    `);

    console.log('\n   Final Schema:');
    finalCheck.forEach((col: any) => {
      console.log(`   - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (nullable: ${col.IS_NULLABLE})`);
    });

    console.log('\n✅ Brand ownership schema fix completed successfully!');
    console.log('\n🎯 Brand-owned developments (developer_id = NULL) are now supported.');

  } catch (error) {
    console.error('\n❌ Error fixing schema:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

fixBrandOwnershipSchema()
  .then(() => {
    console.log('\n🎉 Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
