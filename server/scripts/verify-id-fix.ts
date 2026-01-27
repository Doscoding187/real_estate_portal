import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { getDb } from '../db-connection';
import { developments, developers, users } from '../../drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import { developmentService } from '../services/developmentService';
import { getDeveloperByUserId } from '../services/developerService';

async function verifyIdFix() {
  const db = await getDb();
  if (!db) {
    console.error('❌ Database connection failed');
    process.exit(1);
  }

  console.log('🔍 Starting verification of ID Mismatch Fix...');

  // 1. Find a Developer User who has a profile
  const developer = await db.query.developers.findFirst();

  if (!developer) {
    console.warn('⚠️ No developer profiles found. Cannot verify.');
    process.exit(0);
  }

  const profileId = developer.id;
  const userId = developer.userId;

  console.log(`👤 Found Developer: Profile ID=[${profileId}], User ID=[${userId}]`);

  // 2. Ensure they have at least one development
  let devCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(developments)
    .where(eq(developments.developerId, profileId))
    .then(res => Number(res[0].count));

  if (devCount === 0) {
    console.log('📝 No developments found. Creating a test draft...');
    await developmentService.createDevelopment(userId, {
      name: 'Verify ID Fix Development',
      developmentType: 'residential',
      description: 'Auto-generated for verification',
      slug: `verify-id-fix-${Date.now()}`,
    });
    console.log('✅ Created test development.');
    devCount = 1;
  }

  console.log(`🏠 Developments count for Profile ID ${profileId}: ${devCount}`);

  // 3. Verify the FIX (New Behavior)
  // Resolving Profile first (Router logic simulation)
  const resolvedProfile = await getDeveloperByUserId(userId);
  if (!resolvedProfile) {
    console.error('❌ Failed to resolve profile from User ID');
    process.exit(1);
  }

  const fixResults = await developmentService.getDevelopmentsByDeveloperId(resolvedProfile.id);
  console.log(
    `✨ [NEW BEHAVIOR] Querying with Resolved Profile ID (${resolvedProfile.id}): Found ${fixResults.length} items.`,
  );

  if (fixResults.length === devCount) {
    console.log('   ✅ Confirmed: usage of Profile ID returns correct records.');
  } else {
    console.error(`   ❌ Mismatch: Expected ${devCount}, got ${fixResults.length}`);
    process.exit(1);
  }

  console.log('✅ Verification Successful');
  process.exit(0);
}

verifyIdFix().catch(err => {
  console.error('❌ Script validation failed:', err);
  process.exit(1);
});

