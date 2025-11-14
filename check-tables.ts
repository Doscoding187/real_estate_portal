/**
 * Check Database Tables
 * Run with: pnpm tsx check-tables.ts
 */

import { getDb } from './server/db';

async function checkTables() {
  console.log('🔍 Checking database tables...\n');
  
  try {
    const db = await getDb();
    
    if (!db) {
      console.error('❌ Database connection failed');
      return;
    }
    
    console.log('✅ Database connected successfully');
    
    // Check if users table exists
    try {
      const result = await db.execute("SHOW TABLES LIKE 'users'");
      console.log('Users table exists:', result.length > 0);
      
      if (result.length > 0) {
        // Show table structure
        const structure = await db.execute("DESCRIBE users");
        console.log('\nUsers table structure:');
        console.log(structure);
      }
    } catch (error) {
      console.error('Error checking users table:', error);
    }
    
  } catch (error) {
    console.error('❌ Failed to check tables:', error);
  }
}

checkTables().catch(console.error);