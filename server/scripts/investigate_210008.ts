/**
 * INCIDENT INVESTIGATION SCRIPT
 * Evidence Collection for Developer ID 210008 Issue
 */

import * as dotenv from 'dotenv';
import path from 'path';

// Force load .env.local first, then fall back to .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { getDb } from '../db-connection';
import { users, developers } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

async function investigateUserDeveloperMapping() {
  console.log('=== INCIDENT INVESTIGATION: Developer ID 210008 ===\n');

  const db = await getDb();
  if (!db) {
    console.error('❌ Database connection failed');
    process.exit(1);
  }

  try {
    // 1. Verify user exists
    console.log('📋 STEP 1: USER VERIFICATION');
    console.log('Query: SELECT id, email, role FROM users WHERE id = 210008');
    const userResults = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, 210008))
      .limit(1);

    if (userResults.length === 0) {
      console.log('❌ User with id=210008 NOT FOUND\n');
    } else {
      console.log('✅ User found:');
      console.log(JSON.stringify(userResults[0], null, 2));
      console.log('');
    }

    // 2. Verify developer profile exists for this user
    console.log('📋 STEP 2: DEVELOPER PROFILE VERIFICATION');
    console.log('Query: SELECT id, userId, name, status FROM developers WHERE userId = 210008');
    const devResults = await db
      .select({
        id: developers.id,
        userId: developers.userId,
        name: developers.name,
        status: developers.status,
      })
      .from(developers)
      .where(eq(developers.userId, 210008))
      .limit(10);

    if (devResults.length === 0) {
      console.log('❌ Developer profile with userId=210008 NOT FOUND');
      console.log('   This indicates SCENARIO B: Missing developer profile\n');
    } else {
      console.log(`✅ Found ${devResults.length} developer profile(s):`);
      devResults.forEach((dev, idx) => {
        console.log(`\n   Profile ${idx + 1}:`);
        console.log(JSON.stringify(dev, null, 2));
      });
      console.log('\n   This indicates SCENARIO A: Profile exists, wrong lookup\n');
    }

    // 3. Count verification
    console.log('📋 STEP 3: PROFILE COUNT');
    console.log('Query: SELECT COUNT(*) FROM developers WHERE userId = 210008');
    const countResult = await db
      .select({
        count: developers.id, // Using id field for count
      })
      .from(developers)
      .where(eq(developers.userId, 210008));

    console.log(`Profile count: ${countResult.length}`);
    console.log('');

    // 4. Alternative check: Search developers.id = 210008 (what the code is currently doing WRONG)
    console.log('📋 STEP 4: WRONG LOOKUP VERIFICATION (Current Code Behavior)');
    console.log('Query: SELECT id, userId, name, status FROM developers WHERE id = 210008');
    const wrongLookup = await db
      .select({
        id: developers.id,
        userId: developers.userId,
        name: developers.name,
        status: developers.status,
      })
      .from(developers)
      .where(eq(developers.id, 210008))
      .limit(1);

    if (wrongLookup.length === 0) {
      console.log('❌ Developer with id=210008 NOT FOUND (as expected - this is the bug!)');
      console.log('   The code searches developers.id but should search developers.userId\n');
    } else {
      console.log('⚠️  Unexpected: Developer with id=210008 exists:');
      console.log(JSON.stringify(wrongLookup[0], null, 2));
      console.log('');
    }

    console.log('=== EVIDENCE COLLECTION COMPLETE ===');
  } catch (error: any) {
    console.error('❌ Investigation failed:', error.message);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

investigateUserDeveloperMapping();
