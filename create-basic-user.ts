/**
 * Create Basic User
 * Run with: pnpm tsx create-basic-user.ts
 */

import { getDb } from './server/db';
import bcrypt from 'bcryptjs';

async function createBasicUser() {
  console.log('🔍 Creating basic user...\n');
  
  try {
    const db = await getDb();
    
    if (!db) {
      console.error('❌ Database connection failed');
      return;
    }
    
    console.log('✅ Database connected successfully');
    
    const email = 'enetechsa@gmail.com';
    const password = 'Edmaritinados187#';
    const name = 'Super Admin';
    
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Simple insert with only essential columns
    const query = `
      INSERT INTO users (email, passwordHash, name, role, emailVerified, loginMethod, createdAt, updatedAt, lastSignedIn)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
    `;
    
    const result = await db.execute(query, [
      email,
      passwordHash,
      name,
      'super_admin',
      1, // emailVerified
      'email'
    ]);
    
    console.log('✅ User created successfully');
    console.log('Result:', result);
    
  } catch (error) {
    console.error('❌ Failed to create user:', error);
  }
}

createBasicUser().catch(console.error);