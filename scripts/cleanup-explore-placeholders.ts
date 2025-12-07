/**
 * Script to clean up placeholder Explore content
 * Keeps only the video posted by the agent account
 */

import { getDb } from '../server/db';
import { exploreShorts, exploreHighlightTags, exploreInteractions } from '../drizzle/schema';
import { eq, ne, and, inArray } from 'drizzle-orm';

async function cleanupPlaceholders() {
  console.log('🧹 Starting cleanup of placeholder Explore content...\n');

  try {
    // Initialize database connection
    const db = await getDb();
    
    // Step 1: Find the agent account user ID
    console.log('📍 Step 1: Finding agent account...');
    const agentUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, 'agent@propertylistify.com'),
    });

    if (!agentUser) {
      console.log('❌ Agent account not found. Please ensure agent@propertylistify.com exists.');
      return;
    }

    console.log(`✅ Found agent account: ${agentUser.email} (ID: ${agentUser.id})\n`);

    // Step 2: Find all explore shorts NOT created by the agent
    console.log('📍 Step 2: Finding placeholder content...');
    const placeholderShorts = await db.query.exploreShorts.findMany({
      where: (shorts, { ne }) => ne(shorts.userId, agentUser.id),
    });

    console.log(`Found ${placeholderShorts.length} placeholder videos to delete\n`);

    if (placeholderShorts.length === 0) {
      console.log('✅ No placeholder content found. Database is clean!');
      return;
    }

    const placeholderIds = placeholderShorts.map(s => s.id);

    // Step 3: Delete related interactions
    console.log('📍 Step 3: Deleting related interactions...');
    const deletedInteractions = await db
      .delete(exploreInteractions)
      .where(inArray(exploreInteractions.shortId, placeholderIds))
      .returning();

    console.log(`✅ Deleted ${deletedInteractions.length} interactions\n`);

    // Step 4: Delete related highlight tags
    console.log('📍 Step 4: Deleting related highlight tags...');
    const deletedTags = await db
      .delete(exploreHighlightTags)
      .where(inArray(exploreHighlightTags.shortId, placeholderIds))
      .returning();

    console.log(`✅ Deleted ${deletedTags.length} highlight tags\n`);

    // Step 5: Delete the placeholder shorts
    console.log('📍 Step 5: Deleting placeholder videos...');
    const deletedShorts = await db
      .delete(exploreShorts)
      .where(inArray(exploreShorts.id, placeholderIds))
      .returning();

    console.log(`✅ Deleted ${deletedShorts.length} placeholder videos\n`);

    // Step 6: Verify remaining content
    console.log('📍 Step 6: Verifying remaining content...');
    const remainingShorts = await db.query.exploreShorts.findMany({
      with: {
        user: {
          columns: {
            email: true,
            fullName: true,
          },
        },
      },
    });

    console.log(`\n✅ Cleanup complete!`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Deleted ${deletedShorts.length} placeholder videos`);
    console.log(`   - Deleted ${deletedInteractions.length} interactions`);
    console.log(`   - Deleted ${deletedTags.length} highlight tags`);
    console.log(`   - Remaining videos: ${remainingShorts.length}`);
    
    if (remainingShorts.length > 0) {
      console.log(`\n📹 Remaining videos:`);
      remainingShorts.forEach(short => {
        console.log(`   - "${short.title}" by ${short.user?.fullName || 'Unknown'} (${short.user?.email || 'N/A'})`);
      });
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Run the cleanup
cleanupPlaceholders()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Cleanup failed:', error);
    process.exit(1);
  });
