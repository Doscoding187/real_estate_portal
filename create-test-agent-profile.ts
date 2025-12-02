import 'dotenv/config';
import { getDb } from './server/db';
import { users, agents } from './drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Quick script to create an agent profile for a test user
 * This will allow immediate access to the agent dashboard
 */
async function createTestAgentProfile() {
  console.log('🚀 Creating test agent profile...\n');
  
  const db = await getDb();
  if (!db) {
    console.error('❌ Failed to connect to database');
    process.exit(1);
  }

  try {
    // Find ANY user with role 'agent' who doesn't have an agent profile yet
    console.log(`🔍 Looking for agent users without profiles...`);
    
    const usersResult = await db
      .select()
      .from(users)
      .where(eq(users.role, 'agent'))
      .limit(10);

    if (!usersResult || usersResult.length === 0) {
      console.error('❌ No agent users found in database');
      console.log('\n💡 Tip: Make sure you have registered as an agent');
      process.exit(1);
    }

    console.log(`\n✅ Found ${usersResult.length} agent user(s):\n`);
    
    // Process each agent user
    for (const user of usersResult) {
      console.log(`📧 Processing: ${user.email} (${user.name})`);
      
      // Check if agent profile already exists
      const [existingAgent] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, user.id))
        .limit(1);

      if (existingAgent) {
        console.log(`   ⚠️  Agent profile already exists (ID: ${existingAgent.id}, Status: ${existingAgent.status})`);
        
        // If pending, approve it
        if (existingAgent.status === 'pending') {
          console.log('   🔄 Approving pending agent profile...');
          await db
            .update(agents)
            .set({
              status: 'approved',
              approvedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            })
            .where(eq(agents.id, existingAgent.id));
          console.log('   ✅ Agent profile approved!');
        }
      } else {
        // Create new agent profile
        console.log('   🏢 Creating agent profile...');
        
        const nameParts = user.name?.split(' ') || ['Agent'];
        const firstName = nameParts[0] || 'Agent';
        const lastName = nameParts.slice(1).join(' ') || 'User';
        
        const result = await db.insert(agents).values({
          userId: user.id,
          agencyId: user.agencyId || null,
          firstName: firstName,
          lastName: lastName,
          displayName: user.name || 'Agent User',
          bio: 'Professional real estate agent ready to help clients find their dream properties.',
          phone: user.phone || '+27 12 345 6789',
          email: user.email!,
          status: 'approved', // Auto-approve for test
          approvedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          isVerified: 1,
          isFeatured: 0,
          createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        });

        const agentId = Number(result[0].insertId);
        console.log(`   ✅ Agent profile created! (ID: ${agentId})`);
      }
      console.log('');
    }

    console.log('\n✨ Success! You can now access the agent dashboard.');
    console.log(`\n📍 Navigate to: http://localhost:5000/agent/dashboard`);
    console.log(`📍 Or go to Leads & CRM: http://localhost:5000/agent/leads\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

createTestAgentProfile();
