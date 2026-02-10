import { db } from '../src/db';
import { developments, developerBrandProfiles, developers } from '../src/drizzle/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { getPublicDevelopmentBySlug } from '../src/services/developmentService';

async function run() {
  console.log('--- Debugging Development Fetch Logic (Batch) ---');

  // 1. Find recent platform-owned developments
  const targetDevs = await db.query.developments.findMany({
    where: eq(developments.devOwnerType, 'platform'),
    orderBy: [desc(developments.createdAt)],
    limit: 5,
    with: {
      developerBrandProfile: true,
      developer: true,
    },
  });

  if (targetDevs.length === 0) {
    console.log('No platform-owned developments found.');
    process.exit(0);
  }

  console.log(`Found ${targetDevs.length} recent platform developments.`);

  for (const dev of targetDevs) {
    console.log(`\n---------------------------------------------------`);
    console.log(`Checking Development: "${dev.name}" (ID: ${dev.id})`);

    // Check integrity
    const brandId = dev.developerBrandProfileId;
    const brandProfile = dev.developerBrandProfile;

    console.log('Raw Data:', {
      slug: dev.slug,
      devOwnerType: dev.devOwnerType,
      developerId: dev.developerId,
      developerBrandProfileId: brandId,
    });

    if (!brandId) {
      console.log('❌ ERROR: devOwnerType is platform but developerBrandProfileId is NULL');
      continue;
    }

    if (!brandProfile) {
      console.log(
        `❌ ERROR: developerBrandProfileId is ${brandId} but no record found in DB join.`,
      );
      continue;
    }

    console.log(`Brand Profile Found: "${brandProfile.brandName}" (ID: ${brandProfile.id})`);

    // Simulate Service Call
    try {
      const result = await getPublicDevelopmentBySlug(dev.slug);

      const resolvedName = result?.developer?.name;
      const resolvedIsBrand = result?.developer?.isBrand;

      console.log('Service Result:', {
        developerName: resolvedName,
        isBrand: resolvedIsBrand,
      });

      if (resolvedName === brandProfile.brandName) {
        console.log('✅ SUCCESS: Service returned correct brand name.');
      } else if (!resolvedName) {
        console.log('❌ FAILURE: Service returned NULL for developer name.');
        console.log('   Debug Info:', JSON.stringify(result?.developer, null, 2));
      } else {
        console.log(
          `⚠️ MISMATCH: Service returned "${resolvedName}" vs DB "${brandProfile.brandName}"`,
        );
      }
    } catch (err) {
      console.error('❌ EXCEPTION calling service:', err);
    }
  }

  process.exit(0);
}

run().catch(console.error);
