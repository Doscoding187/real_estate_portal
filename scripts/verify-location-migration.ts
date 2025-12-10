/**
 * Script: Verify data integrity after migration
 * Task: 19. Create data migration and sync scripts
 * 
 * This script verifies that the location migration was successful
 * and checks for data integrity issues.
 */

import { drizzle } from "drizzle-orm/mysql2";
import * as mysql from "mysql2/promise";
import { provinces, cities, suburbs, locations, properties, developments } from "../drizzle/schema";
import { eq, isNull, isNotNull, sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

interface VerificationResult {
  passed: boolean;
  message: string;
  details?: any;
}

async function verifyLocationMigration() {
  const isProduction = process.env.NODE_ENV === 'production';
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: isProduction,
    },
  });
  const db = drizzle(connection);

  console.log("🔍 Starting location migration verification...\n");

  const results: VerificationResult[] = [];

  try {
    // 1. Check that all provinces have slugs
    console.log("✓ Checking provinces have slugs...");
    const provincesWithoutSlugs = await db
      .select()
      .from(provinces)
      .where(isNull(provinces.slug));

    results.push({
      passed: provincesWithoutSlugs.length === 0,
      message: `All provinces have slugs`,
      details: {
        total: (await db.select().from(provinces)).length,
        withoutSlugs: provincesWithoutSlugs.length,
      },
    });

    // 2. Check that all cities have slugs
    console.log("✓ Checking cities have slugs...");
    const citiesWithoutSlugs = await db
      .select()
      .from(cities)
      .where(isNull(cities.slug));

    results.push({
      passed: citiesWithoutSlugs.length === 0,
      message: `All cities have slugs`,
      details: {
        total: (await db.select().from(cities)).length,
        withoutSlugs: citiesWithoutSlugs.length,
      },
    });

    // 3. Check that all suburbs have slugs
    console.log("✓ Checking suburbs have slugs...");
    const suburbsWithoutSlugs = await db
      .select()
      .from(suburbs)
      .where(isNull(suburbs.slug));

    results.push({
      passed: suburbsWithoutSlugs.length === 0,
      message: `All suburbs have slugs`,
      details: {
        total: (await db.select().from(suburbs)).length,
        withoutSlugs: suburbsWithoutSlugs.length,
      },
    });

    // 4. Check slug uniqueness within parent for cities
    console.log("✓ Checking city slug uniqueness within provinces...");
    const duplicateCitySlugs = await db.execute(sql`
      SELECT slug, provinceId, COUNT(*) as count
      FROM cities
      WHERE slug IS NOT NULL
      GROUP BY slug, provinceId
      HAVING count > 1
    `);

    results.push({
      passed: duplicateCitySlugs.rows.length === 0,
      message: `City slugs are unique within provinces`,
      details: {
        duplicates: duplicateCitySlugs.rows.length,
      },
    });

    // 5. Check slug uniqueness within parent for suburbs
    console.log("✓ Checking suburb slug uniqueness within cities...");
    const duplicateSuburbSlugs = await db.execute(sql`
      SELECT slug, cityId, COUNT(*) as count
      FROM suburbs
      WHERE slug IS NOT NULL
      GROUP BY slug, cityId
      HAVING count > 1
    `);

    results.push({
      passed: duplicateSuburbSlugs.rows.length === 0,
      message: `Suburb slugs are unique within cities`,
      details: {
        duplicates: duplicateSuburbSlugs.rows.length,
      },
    });

    // 6. Check that locations table has records
    console.log("✓ Checking locations table population...");
    const locationCount = (await db.select().from(locations)).length;
    const provinceCount = (await db.select().from(provinces)).length;
    const cityCount = (await db.select().from(cities)).length;
    const suburbCount = (await db.select().from(suburbs)).length;
    const expectedTotal = provinceCount + cityCount + suburbCount;

    results.push({
      passed: locationCount >= expectedTotal * 0.9, // Allow 10% tolerance
      message: `Locations table is populated`,
      details: {
        locationCount,
        expectedMinimum: expectedTotal,
        provinces: provinceCount,
        cities: cityCount,
        suburbs: suburbCount,
      },
    });

    // 7. Check hierarchical integrity (all locations with parentId have valid parents)
    console.log("✓ Checking hierarchical integrity...");
    const orphanedLocations = await db.execute(sql`
      SELECT l1.id, l1.name, l1.type, l1.parentId
      FROM locations l1
      LEFT JOIN locations l2 ON l1.parentId = l2.id
      WHERE l1.parentId IS NOT NULL AND l2.id IS NULL
    `);

    results.push({
      passed: orphanedLocations.rows.length === 0,
      message: `All locations have valid parent references`,
      details: {
        orphaned: orphanedLocations.rows.length,
      },
    });

    // 8. Check that province locations have no parent
    console.log("✓ Checking province locations have no parent...");
    const provincesWithParent = await db
      .select()
      .from(locations)
      .where(
        sql`${locations.type} = 'province' AND ${locations.parentId} IS NOT NULL`
      );

    results.push({
      passed: provincesWithParent.length === 0,
      message: `Province locations have no parent`,
      details: {
        provincesWithParent: provincesWithParent.length,
      },
    });

    // 9. Check that city locations have province parents
    console.log("✓ Checking city locations have province parents...");
    const citiesWithoutProvinceParent = await db.execute(sql`
      SELECT l1.id, l1.name
      FROM locations l1
      LEFT JOIN locations l2 ON l1.parentId = l2.id
      WHERE l1.type = 'city' 
        AND (l1.parentId IS NULL OR l2.type != 'province')
    `);

    results.push({
      passed: citiesWithoutProvinceParent.rows.length === 0,
      message: `City locations have province parents`,
      details: {
        citiesWithoutProvinceParent: citiesWithoutProvinceParent.rows.length,
      },
    });

    // 10. Check that suburb locations have city parents
    console.log("✓ Checking suburb locations have city parents...");
    const suburbsWithoutCityParent = await db.execute(sql`
      SELECT l1.id, l1.name
      FROM locations l1
      LEFT JOIN locations l2 ON l1.parentId = l2.id
      WHERE l1.type = 'suburb' 
        AND (l1.parentId IS NULL OR l2.type != 'city')
    `);

    results.push({
      passed: suburbsWithoutCityParent.rows.length === 0,
      message: `Suburb locations have city parents`,
      details: {
        suburbsWithoutCityParent: suburbsWithoutCityParent.rows.length,
      },
    });

    // 11. Check SEO fields are populated
    console.log("✓ Checking SEO fields are populated...");
    const locationsWithoutSEO = await db
      .select()
      .from(locations)
      .where(
        sql`${locations.seoTitle} IS NULL OR ${locations.seoDescription} IS NULL`
      );

    results.push({
      passed: locationsWithoutSEO.length < locationCount * 0.1, // Allow 10% missing
      message: `Most locations have SEO fields`,
      details: {
        total: locationCount,
        withoutSEO: locationsWithoutSEO.length,
        percentage: Math.round((locationsWithoutSEO.length / locationCount) * 100),
      },
    });

    // 12. Check properties with location_id (optional check)
    console.log("✓ Checking properties with location_id...");
    const totalProperties = (await db.select().from(properties)).length;
    const propertiesWithLocationId = await db
      .select()
      .from(properties)
      .where(isNotNull(properties.locationId));

    results.push({
      passed: true, // This is optional, so always pass
      message: `Properties linked to locations (optional)`,
      details: {
        total: totalProperties,
        withLocationId: propertiesWithLocationId.length,
        percentage: totalProperties > 0 
          ? Math.round((propertiesWithLocationId.length / totalProperties) * 100)
          : 0,
      },
    });

    // 13. Check developments with location_id (optional check)
    console.log("✓ Checking developments with location_id...");
    const totalDevelopments = (await db.select().from(developments)).length;
    const developmentsWithLocationId = await db
      .select()
      .from(developments)
      .where(isNotNull(developments.locationId));

    results.push({
      passed: true, // This is optional, so always pass
      message: `Developments linked to locations (optional)`,
      details: {
        total: totalDevelopments,
        withLocationId: developmentsWithLocationId.length,
        percentage: totalDevelopments > 0
          ? Math.round((developmentsWithLocationId.length / totalDevelopments) * 100)
          : 0,
      },
    });

    // Print results
    console.log("\n");
    console.log("═".repeat(60));
    console.log("  VERIFICATION RESULTS");
    console.log("═".repeat(60));
    console.log("");

    let passedCount = 0;
    let failedCount = 0;

    results.forEach((result, index) => {
      const icon = result.passed ? "✅" : "❌";
      console.log(`${icon} ${index + 1}. ${result.message}`);
      
      if (result.details) {
        Object.entries(result.details).forEach(([key, value]) => {
          console.log(`     ${key}: ${value}`);
        });
      }
      console.log("");

      if (result.passed) passedCount++;
      else failedCount++;
    });

    console.log("═".repeat(60));
    console.log(`  SUMMARY: ${passedCount} passed, ${failedCount} failed`);
    console.log("═".repeat(60));
    console.log("");

    if (failedCount > 0) {
      console.log("⚠️  Some verification checks failed. Please review the issues above.");
      console.log("   You may need to re-run the migration scripts.\n");
    } else {
      console.log("🎉 All verification checks passed! Migration successful.\n");
    }

  } catch (error) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Run the script
verifyLocationMigration();
