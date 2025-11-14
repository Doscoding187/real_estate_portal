/**
 * Add Missing Columns to Users Table
 * Run with: pnpm tsx add-missing-columns.ts
 */

import { getDb } from './server/db';

async function addMissingColumns() {
  console.log('🔍 Adding missing columns to users table...\n');
  
  try {
    const db = await getDb();
    if (!db) {
      console.error('❌ Database connection failed');
      return;
    }
    
    console.log('✅ Database connected successfully');
    
    // Add passwordResetToken column
    try {
      await db.execute(`
        ALTER TABLE users 
        ADD COLUMN passwordResetToken VARCHAR(255) NULL
      `);
      console.log('✅ Added passwordResetToken column');
    } catch (error: any) {
      if (error.message.includes('Duplicate column name')) {
        console.log('ℹ️  passwordResetToken column already exists');
      } else {
        console.error('❌ Failed to add passwordResetToken column:', error.message);
      }
    }
    
    // Add passwordResetTokenExpiresAt column
    try {
      await db.execute(`
        ALTER TABLE users 
        ADD COLUMN passwordResetTokenExpiresAt TIMESTAMP NULL
      `);
      console.log('✅ Added passwordResetTokenExpiresAt column');
    } catch (error: any) {
      if (error.message.includes('Duplicate column name')) {
        console.log('ℹ️  passwordResetTokenExpiresAt column already exists');
      } else {
        console.error('❌ Failed to add passwordResetTokenExpiresAt column:', error.message);
      }
    }
    
    // Add emailVerificationToken column
    try {
      await db.execute(`
        ALTER TABLE users 
        ADD COLUMN emailVerificationToken VARCHAR(255) NULL
      `);
      console.log('✅ Added emailVerificationToken column');
    } catch (error: any) {
      if (error.message.includes('Duplicate column name')) {
        console.log('ℹ️  emailVerificationToken column already exists');
      } else {
        console.error('❌ Failed to add emailVerificationToken column:', error.message);
      }
    }
    
    console.log('\n✅ All missing columns processed');
    
  } catch (error: any) {
    console.error('❌ Failed to add missing columns:', error.message);
  }
}

addMissingColumns().catch(console.error);