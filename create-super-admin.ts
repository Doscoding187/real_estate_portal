/**
 * Create Super Admin User
 * Run with: pnpm tsx create-super-admin.ts
 */

import { getDb } from './server/db';
import { users } from './drizzle/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function createSuperAdmin() {
  console.log('🔍 Creating super admin user...\n');
  
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
    
    // Check if user already exists
    let existingUsers = [];
    try {
      existingUsers = await db.select().from(users).where(eq(users.email, email));
    } catch (selectError) {
      console.log('ℹ️ Table may not exist yet, creating user...');
    }
    
    if (existingUsers.length > 0) {
      console.log('ℹ️ User already exists, updating role to super_admin...');
      await db.update(users)
        .set({ 
          role: 'super_admin',
          emailVerified: 1 // Mark as verified
        })
        .where(eq(users.email, email));
      console.log('✅ User updated to super_admin role');
    } else {
      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      try {
        // Create user
        const result = await db.insert(users).values({
          email,
          passwordHash,
          name,
          role: 'super_admin',
          emailVerified: 1, // Mark as verified
          loginMethod: 'email',
          isSubaccount: 0, // Not a subaccount
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        });
        
        console.log('✅ Super admin user created successfully');
        console.log('User ID:', result[0].insertId);
      } catch (insertError) {
        console.error('❌ Failed to insert user:', insertError);
        return;
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to create super admin:', error);
  }
}

createSuperAdmin().catch(console.error);