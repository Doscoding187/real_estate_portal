/**
 * Backfill Location IDs Script
 * 
 * This script populates provinceId, cityId, and suburbId on existing properties
 * by matching the text fields (province, city) to the location master tables.
 * 
 * Run with: npx tsx scripts/backfill-location-ids.ts
 */

import { getDb } from '../server/db';
import { properties, provinces, cities, suburbs } from '../drizzle/schema';
import { eq, isNull, and, sql, isNotNull } from 'drizzle-orm';

async function backfillLocationIds() {
  console.log('🔄 Starting Location ID Backfill...\n');

  const db = await getDb();
  if (!db) {
    console.error('❌ Database not available');
    process.exit(1);
  }

  // Step 1: Count properties that need backfill
  const needsBackfillResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(properties)
    .where(
      and(
        isNull(properties.provinceId),
        isNotNull(properties.province)
      )
    );
  
  const needsBackfill = Number(needsBackfillResult[0]?.count || 0);
  console.log(`📊 Properties needing province ID backfill: ${needsBackfill}`);

  // Step 2: Backfill Province IDs
  console.log('\n📍 Step 1: Backfilling Province IDs...');
  
  const updateProvinceResult = await db.execute(sql`
    UPDATE properties p
    SET p.provinceId = (
      SELECT prov.id FROM provinces prov
      WHERE LOWER(prov.slug) = LOWER(p.province)
         OR LOWER(prov.name) = LOWER(p.province)
      LIMIT 1
    )
    WHERE p.provinceId IS NULL 
      AND p.province IS NOT NULL 
      AND p.province != ''
  `);
  
  console.log(`   ✅ Province IDs updated`);

  // Step 3: Backfill City IDs
  console.log('\n🏙️ Step 2: Backfilling City IDs...');
  
  const updateCityResult = await db.execute(sql`
    UPDATE properties p
    SET p.cityId = (
      SELECT c.id FROM cities c
      WHERE (LOWER(c.slug) = LOWER(p.city) OR LOWER(c.name) = LOWER(p.city))
        AND c.provinceId = p.provinceId
      LIMIT 1
    )
    WHERE p.cityId IS NULL 
      AND p.city IS NOT NULL 
      AND p.city != ''
      AND p.provinceId IS NOT NULL
  `);
  
  console.log(`   ✅ City IDs updated`);

  // Step 4: Verify backfill results
  console.log('\n📈 Verification...');
  
  const verifyProvinceResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(properties)
    .where(isNotNull(properties.provinceId));
  
  const verifyCityResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(properties)
    .where(isNotNull(properties.cityId));

  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(properties);

  const total = Number(totalResult[0]?.count || 0);
  const withProvince = Number(verifyProvinceResult[0]?.count || 0);
  const withCity = Number(verifyCityResult[0]?.count || 0);

  console.log(`   📊 Total properties: ${total}`);
  console.log(`   📊 With province ID: ${withProvince} (${((withProvince/total)*100).toFixed(1)}%)`);
  console.log(`   📊 With city ID: ${withCity} (${((withCity/total)*100).toFixed(1)}%)`);

  // Step 5: Check for orphaned text values
  console.log('\n⚠️ Checking for unmatched locations...');
  
  const unmatchedProvincesResult = await db.execute(sql`
    SELECT DISTINCT province, COUNT(*) as count 
    FROM properties 
    WHERE provinceId IS NULL AND province IS NOT NULL AND province != ''
    GROUP BY province
    ORDER BY count DESC
    LIMIT 10
  `);
  
  if (Array.isArray(unmatchedProvincesResult) && unmatchedProvincesResult.length > 0) {
    console.log('   Unmatched provinces (need to be added to provinces table):');
    unmatchedProvincesResult.forEach((row: any) => {
      console.log(`     - "${row.province}" (${row.count} properties)`);
    });
  } else {
    console.log('   ✅ All provinces matched!');
  }

  const unmatchedCitiesResult = await db.execute(sql`
    SELECT DISTINCT city, province, COUNT(*) as count 
    FROM properties 
    WHERE cityId IS NULL AND city IS NOT NULL AND city != '' AND provinceId IS NOT NULL
    GROUP BY city, province
    ORDER BY count DESC
    LIMIT 10
  `);
  
  if (Array.isArray(unmatchedCitiesResult) && unmatchedCitiesResult.length > 0) {
    console.log('   Unmatched cities (need to be added to cities table):');
    unmatchedCitiesResult.forEach((row: any) => {
      console.log(`     - "${row.city}" in "${row.province}" (${row.count} properties)`);
    });
  } else {
    console.log('   ✅ All cities matched!');
  }

  console.log('\n✅ Backfill complete!');
  process.exit(0);
}

// Run the backfill
backfillLocationIds().catch(error => {
  console.error('❌ Backfill failed:', error);
  process.exit(1);
});
