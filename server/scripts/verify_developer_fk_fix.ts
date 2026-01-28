/**
 * VERIFICATION SCRIPT - Developer FK Fix
 * Tests that createDevelopment now correctly uses developer profile ID
 */

import * as dotenv from 'dotenv';
import path from 'path';

// Load environment
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { getDb } from '../db-connection';
import { developments, developers } from '../../drizzle/schema';
import { desc, eq } from 'drizzle-orm';

async function verifyFix() {
  console.log('=== VERIFICATION: Developer FK Fix ===\n');

  const db = await getDb();
  if (!db) {
    console.error('❌ Database connection failed');
    process.exit(1);
  }

  try {
    console.log('📋 STEP 1: Verify Recent Developments');
    console.log('Query: SELECT id, developerId, name FROM developments ORDER BY id DESC LIMIT 5\n');

    const recentDevelopments = await db
      .select({
        id: developments.id,
        developerId: developments.developerId,
        name: developments.name,
      })
      .from(developments)
      .orderBy(desc(developments.id))
      .limit(5);

    if (recentDevelopments.length === 0) {
      console.log('⚠️  No developments found in database\n');
    } else {
      console.log('Recent developments:');
      recentDevelopments.forEach((dev, idx) => {
        console.log(
          `${idx + 1}. ID: ${dev.id}, DeveloperID: ${dev.developerId}, Name: ${dev.name}`,
        );
      });
      console.log('');

      // Get the most recent development
      const mostRecent = recentDevelopments[0];

      console.log('📋 STEP 2: Verify Developer Profile Exists for Most Recent');
      console.log(
        `Query: SELECT id, userId, name FROM developers WHERE id = ${mostRecent.developerId}\n`,
      );

      const devProfile = await db
        .select({
          id: developers.id,
          userId: developers.userId,
          name: developers.name,
        })
        .from(developers)
        .where(eq(developers.id, mostRecent.developerId))
        .limit(1);

      if (devProfile.length === 0) {
        console.log(`❌ CRITICAL: Developer profile ${mostRecent.developerId} NOT FOUND!`);
        console.log('   This indicates the fix did NOT work correctly.\n');
      } else {
        console.log(`✅ Developer profile found:`);
        console.log(`   ID: ${devProfile[0].id}`);
        console.log(`   UserID: ${devProfile[0].userId}`);
        console.log(`   Name: ${devProfile[0].name}`);
        console.log('');

        // Verify it's the correct mapping
        if (devProfile[0].id === mostRecent.developerId) {
          console.log(
            '✅ FK VALIDATION PASSED: developments.developerId correctly references developers.id',
          );
          console.log(
            `   Development "${mostRecent.name}" → Developer Profile "${devProfile[0].name}" (ID: ${devProfile[0].id})`,
          );
          console.log('');
        }
      }
    }

    console.log('📋 STEP 3: Specific Check for User 210008');
    console.log(
      'Query: Check if any developments reference userId 210008 (WRONG) instead of profileId 90003 (CORRECT)\n',
    );

    const wrongFKDevelopments = await db
      .select({
        id: developments.id,
        developerId: developments.developerId,
        name: developments.name,
      })
      .from(developments)
      .where(eq(developments.developerId, 210008))
      .limit(5);

    if (wrongFKDevelopments.length > 0) {
      console.log(
        `❌ CRITICAL: Found ${wrongFKDevelopments.length} development(s) with WRONG FK (userId instead of profileId):`,
      );
      wrongFKDevelopments.forEach((dev, idx) => {
        console.log(
          `   ${idx + 1}. ID: ${dev.id}, Name: ${dev.name}, DeveloperID: ${dev.developerId} (SHOULD BE 90003)`,
        );
      });
      console.log('');
    } else {
      console.log('✅ No developments found with developerId=210008 (userId - this is correct!)');
      console.log('');
    }

    const correctFKDevelopments = await db
      .select({
        id: developments.id,
        developerId: developments.developerId,
        name: developments.name,
      })
      .from(developments)
      .where(eq(developments.developerId, 90003))
      .limit(5);

    if (correctFKDevelopments.length > 0) {
      console.log(
        `✅ Found ${correctFKDevelopments.length} development(s) with CORRECT FK (profileId 90003):`,
      );
      correctFKDevelopments.forEach((dev, idx) => {
        console.log(
          `   ${idx + 1}. ID: ${dev.id}, Name: ${dev.name}, DeveloperID: ${dev.developerId}`,
        );
      });
      console.log('');
    }

    console.log('=== VERIFICATION COMPLETE ===');
  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

verifyFix();
