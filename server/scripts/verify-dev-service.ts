/**
 * Verify saveDraft, publishDevelopmentStrict, deleteDevelopment
 * Run: npx tsx server/scripts/verify-dev-service.ts
 */
import { config } from 'dotenv';
import path from 'path';

// Load .env.local first
config({ path: path.resolve(process.cwd(), '.env.local') });
import { eq } from 'drizzle-orm';
import { getDb } from '../db-connection';
import {
  developers,
  developments,
  unitTypes,
  developmentDrafts,
  developmentPhases,
} from '../../drizzle/schema';
import {
  saveDraft,
  publishDevelopmentStrict,
  developmentService,
} from '../services/developmentService';

async function main() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Find a developer profile to test with
  const [devProfile] = await db
    .select({ id: developers.id, userId: developers.userId, name: developers.name })
    .from(developers)
    .limit(1);

  if (!devProfile) {
    console.error('❌ No developer profile found in DB. Create one first.');
    process.exit(1);
  }

  console.log(
    `\n✅ Using developer: ${devProfile.name} (profile ID: ${devProfile.id}, user ID: ${devProfile.userId})\n`,
  );

  const testWizardData = {
    name: `Test Dev ${Date.now()}`,
    developmentType: 'residential' as const,
    city: 'Johannesburg',
    province: 'Gauteng',
    unitTypes: [
      {
        name: 'Test Unit Type',
        bedrooms: 2,
        bathrooms: 1,
        basePriceFrom: 1500000,
        totalUnits: 10,
        availableUnits: 10,
      },
    ],
    images: ['https://example.com/hero.jpg'],
  };

  // ============ 1. TEST saveDraft ============
  console.log('--- 1. Testing saveDraft ---');
  try {
    const draftResult = await saveDraft(devProfile.userId, testWizardData as any);
    console.log(`✅ [saveDraft] Draft created with ID: ${draftResult.draftId}`);

    // Verify FK is correct
    const [draft] = await db
      .select({ developerId: developmentDrafts.developerId })
      .from(developmentDrafts)
      .where(eq(developmentDrafts.id, draftResult.draftId))
      .limit(1);

    if (draft?.developerId === devProfile.id) {
      console.log(
        `✅ [saveDraft] FK verified: developerId = ${draft.developerId} (matches profile ID)`,
      );
    } else {
      console.error(
        `❌ [saveDraft] FK mismatch! Stored: ${draft?.developerId}, Expected: ${devProfile.id}`,
      );
    }

    // Cleanup draft
    await db.delete(developmentDrafts).where(eq(developmentDrafts.id, draftResult.draftId));
    console.log(`🧹 [saveDraft] Cleaned up test draft`);
  } catch (error: any) {
    console.error(`❌ [saveDraft] Failed:`, error.message);
  }

  // ============ 2. TEST publishDevelopmentStrict ============
  console.log('\n--- 2. Testing publishDevelopmentStrict ---');
  let publishedDevId: number | null = null;
  try {
    const publishResult = await publishDevelopmentStrict(devProfile.userId, testWizardData as any);
    publishedDevId = publishResult.developmentId;
    console.log(`✅ [publishDevelopmentStrict] Development created with ID: ${publishedDevId}`);
    console.log(`✅ [publishDevelopmentStrict] Unit types count: ${publishResult.unitTypesCount}`);

    if (publishResult.unitTypesCount > 0) {
      console.log(`✅ [publishDevelopmentStrict] Unit types persisted correctly`);
    } else {
      console.error(`❌ [publishDevelopmentStrict] No unit types persisted!`);
    }
  } catch (error: any) {
    console.error(`❌ [publishDevelopmentStrict] Failed:`, error.message);
  }

  // ============ 3. TEST deleteDevelopment ============
  if (publishedDevId) {
    console.log('\n--- 3. Testing deleteDevelopment ---');
    try {
      // Verify counts before delete
      const [unitCountBefore] = await db
        .select({ count: unitTypes.id })
        .from(unitTypes)
        .where(eq(unitTypes.developmentId, publishedDevId));
      console.log(`📊 [deleteDevelopment] Unit types before delete: ${unitCountBefore ? 1 : 0}+`);

      await developmentService.deleteDevelopment(publishedDevId, devProfile.userId);
      console.log(`✅ [deleteDevelopment] Development ${publishedDevId} deleted`);

      // Verify it's gone
      const [devAfter] = await db
        .select({ id: developments.id })
        .from(developments)
        .where(eq(developments.id, publishedDevId))
        .limit(1);

      const [unitAfter] = await db
        .select({ id: unitTypes.id })
        .from(unitTypes)
        .where(eq(unitTypes.developmentId, publishedDevId))
        .limit(1);

      if (!devAfter && !unitAfter) {
        console.log(`✅ [deleteDevelopment] Verified: development + unit types removed`);
      } else {
        console.error(`❌ [deleteDevelopment] Orphaned data remains!`);
      }
    } catch (error: any) {
      console.error(`❌ [deleteDevelopment] Failed:`, error.message);
    }
  }

  console.log('\n✅ All tests completed.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
