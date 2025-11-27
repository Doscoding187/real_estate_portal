import * as dotenv from 'dotenv';
dotenv.config();

import { getDb } from './server/db';
import { users, agents } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function fixAgentAccount() {
  const email = 'edward.ikhayaproperty@gmail.com';
  console.log(`Looking up user with email: ${email}`);

  const db = await getDb();
  if (!db) {
    console.error('Database connection failed');
    process.exit(1);
  }

  // 1. Find User
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    console.error('User not found!');
    process.exit(1);
  }

  console.log(`Found user: ID ${user.id}, Name: ${user.name}, Role: ${user.role}`);

  // 2. Update User Role if needed
  if (user.role !== 'agent') {
    console.log('Updating user role to "agent"...');
    await db.update(users).set({ role: 'agent' }).where(eq(users.id, user.id));
  }

  // 3. Check Agent Profile
  const [agent] = await db.select().from(agents).where(eq(agents.userId, user.id)).limit(1);

  if (agent) {
    console.log(`Found existing agent profile: ID ${agent.id}, Status: ${agent.status}`);
    
    if (agent.status !== 'approved') {
      console.log('Approving agent profile...');
      await db.update(agents).set({ 
        status: 'approved',
        approvedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        // Ensure required fields are present if they were missing
        displayName: agent.displayName || user.name,
        phone: agent.phone || '0000000000',
        firstName: agent.firstName || user.name.split(' ')[0],
        lastName: agent.lastName || (user.name.split(' ').slice(1).join(' ') || 'Agent'),
      }).where(eq(agents.id, agent.id));
      console.log('Agent approved successfully.');
    } else {
      console.log('Agent is already approved.');
    }
  } else {
    console.log('No agent profile found. Creating one...');
    await db.insert(agents).values({
      userId: user.id,
      displayName: user.name,
      firstName: user.name.split(' ')[0],
      lastName: user.name.split(' ').slice(1).join(' ') || 'Agent',
      email: user.email,
      phone: '0000000000', // Placeholder
      status: 'approved',
      approvedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      isVerified: 1,
      isFeatured: 0,
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });
    console.log('Agent profile created and approved.');
  }

  process.exit(0);
}

fixAgentAccount().catch(console.error);
