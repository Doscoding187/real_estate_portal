/**
 * Property-Based Tests for Location Hierarchy
 * Feature: google-places-autocomplete-integration
 * 
 * These tests verify universal properties that should hold across all location data
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fc from "fast-check";
import { getDb } from "../../db";
import { locations } from "../../../drizzle/schema";
import { eq, and, isNotNull } from "drizzle-orm";

describe("Location Hierarchy Property Tests", () => {
  let db: Awaited<ReturnType<typeof getDb>> | null = null;
  let skipTests = false;

  beforeAll(async () => {
    // Initialize database connection
    try {
      db = await getDb();
      if (!db) {
        console.warn('⚠️  DATABASE_URL not configured. Skipping location hierarchy tests.');
        console.warn('   To run these tests, set DATABASE_URL environment variable.');
        skipTests = true;
        return;
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
      skipTests = true;
    }
  });
  /**
   * Property 20: Hierarchical integrity
   * Validates: Requirements 16.5
   * 
   * For any location record with a parent_id, the parent location should exist in the locations table
   */
  it("should maintain hierarchical integrity - all parent_ids reference existing locations", async () => {
    if (skipTests || !db) {
      console.log('⏭️  Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Generate random location data
          name: fc.string({ minLength: 1, maxLength: 100 }),
          slug: fc.string({ minLength: 1, maxLength: 100 }).map(s => 
            s.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
          ),
          type: fc.constantFrom('province', 'city', 'suburb', 'neighborhood'),
          description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
          latitude: fc.option(
            fc.double({ min: -35, max: -22 }).map(n => n.toFixed(6)),
            { nil: null }
          ),
          longitude: fc.option(
            fc.double({ min: 16, max: 33 }).map(n => n.toFixed(6)),
            { nil: null }
          ),
        }),
        async (locationData) => {
          // Create a parent location first
          const parentResult = await db.insert(locations).values({
            name: `Parent-${locationData.name}`,
            slug: `parent-${locationData.slug}`,
            type: 'province',
            parentId: null,
            description: 'Test parent location',
            latitude: locationData.latitude,
            longitude: locationData.longitude,
          });

          const parentId = Number(parentResult.insertId);

          // Create a child location with the parent_id
          const childResult = await db.insert(locations).values({
            name: locationData.name,
            slug: locationData.slug,
            type: locationData.type,
            parentId: parentId,
            description: locationData.description,
            latitude: locationData.latitude,
            longitude: locationData.longitude,
          });

          const childId = Number(childResult.insertId);

          try {
            // Verify the child location was created
            const childLocation = await db
              .select()
              .from(locations)
              .where(eq(locations.id, childId))
              .limit(1);

            expect(childLocation).toHaveLength(1);
            expect(childLocation[0].parentId).toBe(parentId);

            // Property: The parent location must exist
            const parentLocation = await db
              .select()
              .from(locations)
              .where(eq(locations.id, parentId))
              .limit(1);

            expect(parentLocation).toHaveLength(1);
            expect(parentLocation[0].id).toBe(parentId);

            // Property: For any location with parent_id, querying the parent should succeed
            if (childLocation[0].parentId !== null) {
              const parentExists = await db
                .select()
                .from(locations)
                .where(eq(locations.id, childLocation[0].parentId))
                .limit(1);

              expect(parentExists).toHaveLength(1);
            }
          } finally {
            // Cleanup: Delete test data
            await db.delete(locations).where(eq(locations.id, childId));
            await db.delete(locations).where(eq(locations.id, parentId));
          }
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * Additional property test: Verify no orphaned locations exist in the database
   * This tests the current state of the database rather than generating new data
   */
  it("should have no orphaned locations - all existing parent_ids reference valid locations", async () => {
    if (skipTests || !db) {
      console.log('⏭️  Skipping test - database not available');
      return;
    }

    // Get all locations with a parent_id
    const locationsWithParents = await db
      .select()
      .from(locations)
      .where(isNotNull(locations.parentId));

    console.log(`Checking ${locationsWithParents.length} locations with parent_ids...`);

    // For each location with a parent_id, verify the parent exists
    for (const location of locationsWithParents) {
      if (location.parentId !== null) {
        const parent = await db
          .select()
          .from(locations)
          .where(eq(locations.id, location.parentId))
          .limit(1);

        expect(parent).toHaveLength(1);
        expect(parent[0].id).toBe(location.parentId);
      }
    }
  });

  /**
   * Property test: Verify hierarchical type ordering
   * Province -> City -> Suburb -> Neighborhood
   */
  it("should maintain proper hierarchical type ordering", async () => {
    if (skipTests || !db) {
      console.log('⏭️  Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          provinceName: fc.string({ minLength: 1, maxLength: 50 }),
          cityName: fc.string({ minLength: 1, maxLength: 50 }),
          suburbName: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        async (data) => {
          // Create province (no parent)
          const provinceResult = await db.insert(locations).values({
            name: data.provinceName,
            slug: data.provinceName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            type: 'province',
            parentId: null,
          });
          const provinceId = Number(provinceResult.insertId);

          // Create city (parent = province)
          const cityResult = await db.insert(locations).values({
            name: data.cityName,
            slug: data.cityName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            type: 'city',
            parentId: provinceId,
          });
          const cityId = Number(cityResult.insertId);

          // Create suburb (parent = city)
          const suburbResult = await db.insert(locations).values({
            name: data.suburbName,
            slug: data.suburbName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            type: 'suburb',
            parentId: cityId,
          });
          const suburbId = Number(suburbResult.insertId);

          try {
            // Verify hierarchy
            const suburb = await db
              .select()
              .from(locations)
              .where(eq(locations.id, suburbId))
              .limit(1);

            const city = await db
              .select()
              .from(locations)
              .where(eq(locations.id, cityId))
              .limit(1);

            const province = await db
              .select()
              .from(locations)
              .where(eq(locations.id, provinceId))
              .limit(1);

            // Property: Suburb's parent should be a city
            expect(suburb[0].parentId).toBe(cityId);
            expect(city[0].type).toBe('city');

            // Property: City's parent should be a province
            expect(city[0].parentId).toBe(provinceId);
            expect(province[0].type).toBe('province');

            // Property: Province should have no parent
            expect(province[0].parentId).toBeNull();
          } finally {
            // Cleanup in reverse order (child to parent)
            await db.delete(locations).where(eq(locations.id, suburbId));
            await db.delete(locations).where(eq(locations.id, cityId));
            await db.delete(locations).where(eq(locations.id, provinceId));
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
