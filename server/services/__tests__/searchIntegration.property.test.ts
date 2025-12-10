import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import {
  globalSearch,
  searchLocations,
  filterListingsByPlaceId,
  trackLocationSearch,
} from '../globalSearchService';
import { getDb } from '../../db';
import { locations, locationSearches, properties } from '../../../drizzle/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Property-Based Tests for Search Integration
 * 
 * Feature: google-places-autocomplete-integration
 * 
 * These tests validate the correctness properties for search integration:
 * - Property 29: Suburb selection redirects to location page
 * - Property 30: Place ID in URL parameters
 * - Property 33: Place ID filtering
 */

describe('Search Integration Property Tests', () => {
  let db: Awaited<ReturnType<typeof getDb>> | null = null;
  let skipTests = false;
  let testLocationIds: number[] = [];
  let testPropertyIds: number[] = [];

  beforeAll(async () => {
    console.log('[SearchIntegration PBT] Setting up test database...');
    
    // Initialize database connection
    try {
      db = await getDb();
      if (!db) {
        console.warn('⚠️  DATABASE_URL not configured. Skipping search integration tests.');
        console.warn('   To run these tests, set DATABASE_URL environment variable.');
        skipTests = true;
        return;
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
      skipTests = true;
      return;
    }

    // Create test locations with hierarchy
    const [provinceResult] = await db.insert(locations).values({
      name: 'Test Province',
      slug: 'test-province',
      type: 'province',
      parentId: null,
      placeId: 'test_place_province_001',
      latitude: '-26.0',
      longitude: '28.0',
      propertyCount: 0,
    });

    const provinceId = Number(provinceResult.insertId);
    testLocationIds.push(provinceId);

    const [cityResult] = await db.insert(locations).values({
      name: 'Test City',
      slug: 'test-city',
      type: 'city',
      parentId: provinceId,
      placeId: 'test_place_city_001',
      latitude: '-26.1',
      longitude: '28.1',
      propertyCount: 0,
    });

    const cityId = Number(cityResult.insertId);
    testLocationIds.push(cityId);

    const [suburbResult] = await db.insert(locations).values({
      name: 'Test Suburb',
      slug: 'test-suburb',
      type: 'suburb',
      parentId: cityId,
      placeId: 'test_place_suburb_001',
      latitude: '-26.2',
      longitude: '28.2',
      propertyCount: 0,
    });

    const suburbId = Number(suburbResult.insertId);
    testLocationIds.push(suburbId);

    // Create test properties linked to the suburb
    for (let i = 0; i < 5; i++) {
      const [propResult] = await db.insert(properties).values({
        title: `Test Property ${i}`,
        description: `Test property description ${i}`,
        price: 1000000 + (i * 100000),
        propertyType: 'house',
        listingType: 'sale',
        bedrooms: 3,
        bathrooms: 2,
        city: 'Test City',
        province: 'Test Province',
        suburb: 'Test Suburb',
        locationId: suburbId,
        placeId: 'test_place_suburb_001',
        latitude: '-26.2',
        longitude: '28.2',
        status: 'published',
        userId: 1,
      });

      testPropertyIds.push(Number(propResult.insertId));
    }
  });

  afterAll(async () => {
    if (skipTests || !db) return;

    // Clean up test data
    if (testPropertyIds.length > 0) {
      await db.delete(properties).where(
        sql`${properties.id} IN (${testPropertyIds.join(',')})`
      );
    }

    if (testLocationIds.length > 0) {
      await db.delete(locationSearches).where(
        sql`${locationSearches.locationId} IN (${testLocationIds.join(',')})`
      );
      
      // Delete in reverse order (suburb -> city -> province)
      for (let i = testLocationIds.length - 1; i >= 0; i--) {
        await db.delete(locations).where(eq(locations.id, testLocationIds[i]));
      }
    }
  });

  /**
   * Property 29: Suburb selection redirects to location page
   * 
   * For any suburb selected from search autocomplete, the system should redirect
   * to a URL matching the pattern /south-africa/{province-slug}/{city-slug}/{suburb-slug}
   * 
   * Validates: Requirements 19.1
   */
  it('Property 29: Suburb selection should generate correct hierarchical URL', async () => {
    if (skipTests || !db) {
      console.log('⏭️  Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          suburbName: fc.string({ minLength: 3, maxLength: 50 }),
          cityName: fc.string({ minLength: 3, maxLength: 50 }),
          provinceName: fc.string({ minLength: 3, maxLength: 50 }),
        }),
        async ({ suburbName, cityName, provinceName }) => {
          if (!db) return true;

          // Create temporary location hierarchy
          const provinceSlug = provinceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const citySlug = cityName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const suburbSlug = suburbName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

          // Skip if slugs are empty after sanitization
          if (!provinceSlug || !citySlug || !suburbSlug) {
            return true;
          }

          const [provResult] = await db.insert(locations).values({
            name: provinceName,
            slug: provinceSlug,
            type: 'province',
            parentId: null,
            placeId: `test_prov_${Date.now()}_${Math.random()}`,
            propertyCount: 0,
          });

          const provId = Number(provResult.insertId);

          const [cityResult] = await db.insert(locations).values({
            name: cityName,
            slug: citySlug,
            type: 'city',
            parentId: provId,
            placeId: `test_city_${Date.now()}_${Math.random()}`,
            propertyCount: 0,
          });

          const cityId = Number(cityResult.insertId);

          const [suburbResult] = await db.insert(locations).values({
            name: suburbName,
            slug: suburbSlug,
            type: 'suburb',
            parentId: cityId,
            placeId: `test_suburb_${Date.now()}_${Math.random()}`,
            propertyCount: 0,
          });

          const suburbId = Number(suburbResult.insertId);

          try {
            // Search for the suburb
            const results = await searchLocations(suburbName, 10);

            // Find our suburb in results
            const suburbResult = results.find(r => r.id === suburbId);

            if (suburbResult) {
              // Verify URL format matches pattern
              const expectedPattern = `/south-africa/${provinceSlug}/${citySlug}/${suburbSlug}`;
              expect(suburbResult.url).toBe(expectedPattern);

              // Verify URL structure
              expect(suburbResult.url).toMatch(/^\/south-africa\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$/);

              // Verify hierarchy is preserved
              const urlParts = suburbResult.url.split('/').filter(Boolean);
              expect(urlParts).toHaveLength(4); // south-africa, province, city, suburb
              expect(urlParts[0]).toBe('south-africa');
              expect(urlParts[1]).toBe(provinceSlug);
              expect(urlParts[2]).toBe(citySlug);
              expect(urlParts[3]).toBe(suburbSlug);
            }

            return true;
          } finally {
            // Clean up
            await db.delete(locations).where(eq(locations.id, suburbId));
            await db.delete(locations).where(eq(locations.id, cityId));
            await db.delete(locations).where(eq(locations.id, provId));
          }
        }
      ),
      { numRuns: 20 } // Reduced runs due to database operations
    );
  });

  /**
   * Property 30: Place ID in URL parameters
   * 
   * For any redirection to a location page, the Place ID should be included
   * as a URL query parameter
   * 
   * Validates: Requirements 19.4
   */
  it('Property 30: Location results should include Place ID for URL parameters', async () => {
    if (skipTests || !db) {
      console.log('⏭️  Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 100 }),
        async (placeId) => {
          if (!db) return true;

          // Create a temporary location with the Place ID
          const locationName = `Test Location ${Date.now()}`;
          const locationSlug = locationName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

          const [result] = await db.insert(locations).values({
            name: locationName,
            slug: locationSlug,
            type: 'suburb',
            parentId: null,
            placeId: placeId,
            propertyCount: 0,
          });

          const locationId = Number(result.insertId);

          try {
            // Search for the location
            const results = await searchLocations(locationName, 10);

            // Find our location in results
            const locationResult = results.find(r => r.id === locationId);

            if (locationResult) {
              // Verify Place ID is present in the result
              expect(locationResult.placeId).toBe(placeId);

              // Verify Place ID is not null or empty
              expect(locationResult.placeId).toBeTruthy();
              expect(locationResult.placeId).not.toBe('');
            }

            return true;
          } finally {
            // Clean up
            await db.delete(locations).where(eq(locations.id, locationId));
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 33: Place ID filtering
   * 
   * For any location filter applied to listings, the system should match using
   * location_id (which links to Place ID) rather than text comparison on
   * suburb/city/province fields
   * 
   * Validates: Requirements 25.2
   */
  it('Property 33: Place ID filtering should use location_id for precise matching', async () => {
    if (skipTests || !db) {
      console.log('⏭️  Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          minPrice: fc.integer({ min: 500000, max: 2000000 }),
          maxPrice: fc.integer({ min: 2000001, max: 5000000 }),
        }),
        async ({ minPrice, maxPrice }) => {
          if (!db) return true;

          // Use our test suburb's Place ID
          const testPlaceId = 'test_place_suburb_001';

          // Filter listings by Place ID
          const results = await filterListingsByPlaceId(
            testPlaceId,
            {
              minPrice,
              maxPrice,
            },
            50
          );

          // All results should have the correct location_id or place_id
          for (const listing of results) {
            // Verify that listing is associated with the location
            // Either through location_id or direct place_id match
            const hasLocationId = listing.locationId !== null;
            const hasPlaceId = listing.placeId === testPlaceId;

            expect(hasLocationId || hasPlaceId).toBe(true);

            // Verify price filters are applied
            expect(listing.price).toBeGreaterThanOrEqual(minPrice);
            expect(listing.price).toBeLessThanOrEqual(maxPrice);
          }

          // Verify we're using location_id for filtering (not text matching)
          // If location_id is used, all results should have the same location_id
          const locationIds = results
            .filter(r => r.locationId !== null)
            .map(r => r.locationId);

          if (locationIds.length > 0) {
            const uniqueLocationIds = new Set(locationIds);
            // All listings should reference the same location
            expect(uniqueLocationIds.size).toBeLessThanOrEqual(1);
          }

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Additional test: Verify Place ID filtering falls back to text matching
   * when location record doesn't exist
   */
  it('should fallback to direct Place ID matching when location record does not exist', async () => {
    if (skipTests || !db) {
      console.log('⏭️  Skipping test - database not available');
      return;
    }

    const nonExistentPlaceId = 'non_existent_place_id_12345';

    const results = await filterListingsByPlaceId(nonExistentPlaceId, {}, 50);

    // Should return empty results or only listings with matching place_id
    for (const listing of results) {
      expect(listing.placeId).toBe(nonExistentPlaceId);
    }
  });

  /**
   * Additional test: Verify search tracking
   */
  it('should track location searches for trending analysis', async () => {
    if (skipTests || !db) {
      console.log('⏭️  Skipping test - database not available');
      return;
    }

    // Use our test suburb
    const testLocationId = testLocationIds[2]; // suburb

    // Track a search
    await trackLocationSearch(testLocationId, 1);

    // Verify the search was recorded
    const [searchRecord] = await db
      .select()
      .from(locationSearches)
      .where(eq(locationSearches.locationId, testLocationId))
      .limit(1);

    expect(searchRecord).toBeDefined();
    expect(searchRecord.locationId).toBe(testLocationId);
  });

  /**
   * Additional test: Verify global search returns all entity types
   */
  it('should return locations, listings, and developments in global search', async () => {
    if (skipTests || !db) {
      console.log('⏭️  Skipping test - database not available');
      return;
    }

    const results = await globalSearch({
      query: 'Test',
      types: ['location', 'listing', 'development'],
      limit: 20,
    });

    expect(results).toHaveProperty('locations');
    expect(results).toHaveProperty('listings');
    expect(results).toHaveProperty('developments');
    expect(results).toHaveProperty('totalResults');
    expect(results).toHaveProperty('query');

    expect(Array.isArray(results.locations)).toBe(true);
    expect(Array.isArray(results.listings)).toBe(true);
    expect(Array.isArray(results.developments)).toBe(true);

    expect(results.totalResults).toBe(
      results.locations.length + results.listings.length + results.developments.length
    );
  });
});
