/**
 * Property-Based Tests for Trending Suburbs Feature
 *
 * **Feature: google-places-autocomplete-integration, Property 31: Search event recording**
 *
 * Requirements:
 * - 21.1: Record search events with location, user, and timestamp
 *
 * Property 31: Search event recording
 * For any location search, a record should be created in location_searches table
 * with location_id, user_id (if authenticated), and timestamp
 *
 * **Validates: Requirements 21.1**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fc from 'fast-check';
import { getDb } from '../../db';
import { locationAnalyticsService } from '../locationAnalyticsService';
import { locations, locationSearches, users } from '../../../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

// ============================================================================
// Test Setup and Teardown
// ============================================================================

let db: Awaited<ReturnType<typeof getDb>> | null = null;
let skipTests = false;

describe('Property 31: Search event recording', () => {
  let testLocationId: number;
  let testUserId: number;

  beforeAll(async () => {
    console.log('[TrendingSuburbs PBT] Setting up test database...');

    // Initialize database connection
    try {
      db = await getDb();
      if (!db) {
        console.warn('⚠️  DATABASE_URL not configured. Skipping trending suburbs tests.');
        console.warn('   To run these tests, set DATABASE_URL environment variable.');
        skipTests = true;
        return;
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
      skipTests = true;
      return;
    }

    // Create a test location
    const [location] = await db
      .insert(locations)
      .values({
        name: 'Test Suburb for Trending',
        slug: 'test-suburb-trending',
        type: 'suburb',
        parentId: null,
      })
      .returning();
    testLocationId = location.id;

    // Create a test user
    const [user] = await db
      .insert(users)
      .values({
        email: `test-trending-${Date.now()}@example.com`,
        username: `test-trending-${Date.now()}`,
        role: 'user',
      })
      .returning();
    testUserId = user.id;
  });

  afterAll(async () => {
    if (skipTests || !db) return;

    // Clean up test data
    if (testLocationId) {
      await db.delete(locationSearches).where(eq(locationSearches.locationId, testLocationId));
      await db.delete(locations).where(eq(locations.id, testLocationId));
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  beforeEach(async () => {
    if (skipTests || !db) return;

    // Clean up search records before each test
    await db.delete(locationSearches).where(eq(locationSearches.locationId, testLocationId));
  });

  it('should create a search record for any location search with authenticated user', async () => {
    if (skipTests || !db) {
      console.log('⏭️  Skipping test: Database not available');
      return;
    }
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // Number of searches to perform
        async searchCount => {
          // Track multiple searches
          for (let i = 0; i < searchCount; i++) {
            await locationAnalyticsService.trackLocationSearch(testLocationId, testUserId);
          }

          // Verify all searches were recorded
          const searches = await db
            .select()
            .from(locationSearches)
            .where(
              and(
                eq(locationSearches.locationId, testLocationId),
                eq(locationSearches.userId, testUserId),
              ),
            );

          // Property: For any number of searches, that many records should exist
          expect(searches.length).toBe(searchCount);

          // Property: All records should have the correct location_id
          expect(searches.every(s => s.locationId === testLocationId)).toBe(true);

          // Property: All records should have the correct user_id
          expect(searches.every(s => s.userId === testUserId)).toBe(true);

          // Property: All records should have a timestamp
          expect(searches.every(s => s.searchedAt !== null)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should create a search record for any location search without user (anonymous)', async () => {
    if (skipTests || !db) {
      console.log('⏭️  Skipping test: Database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // Number of searches to perform
        async searchCount => {
          // Track multiple anonymous searches
          for (let i = 0; i < searchCount; i++) {
            await locationAnalyticsService.trackLocationSearch(testLocationId);
          }

          // Verify all searches were recorded
          const searches = await db
            .select()
            .from(locationSearches)
            .where(
              and(
                eq(locationSearches.locationId, testLocationId),
                sql`${locationSearches.userId} IS NULL`,
              ),
            );

          // Property: For any number of anonymous searches, that many records should exist
          expect(searches.length).toBe(searchCount);

          // Property: All records should have the correct location_id
          expect(searches.every(s => s.locationId === testLocationId)).toBe(true);

          // Property: All records should have NULL user_id
          expect(searches.every(s => s.userId === null)).toBe(true);

          // Property: All records should have a timestamp
          expect(searches.every(s => s.searchedAt !== null)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should record timestamp for any search event', async () => {
    if (skipTests || !db) {
      console.log('⏭️  Skipping test: Database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // Whether to include user ID
        async includeUser => {
          const beforeSearch = new Date();

          // Track search
          await locationAnalyticsService.trackLocationSearch(
            testLocationId,
            includeUser ? testUserId : undefined,
          );

          const afterSearch = new Date();

          // Get the recorded search
          const searches = await db
            .select()
            .from(locationSearches)
            .where(eq(locationSearches.locationId, testLocationId))
            .orderBy(sql`searched_at DESC`)
            .limit(1);

          expect(searches.length).toBe(1);
          const search = searches[0];

          // Property: Timestamp should be between before and after the search
          const searchTime = new Date(search.searchedAt);
          expect(searchTime.getTime()).toBeGreaterThanOrEqual(beforeSearch.getTime() - 1000); // 1s tolerance
          expect(searchTime.getTime()).toBeLessThanOrEqual(afterSearch.getTime() + 1000); // 1s tolerance
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should handle concurrent searches for the same location', async () => {
    if (skipTests || !db) {
      console.log('⏭️  Skipping test: Database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }), // Number of concurrent searches
        async concurrentCount => {
          // Track concurrent searches
          const promises = Array.from({ length: concurrentCount }, () =>
            locationAnalyticsService.trackLocationSearch(testLocationId, testUserId),
          );

          await Promise.all(promises);

          // Verify all searches were recorded
          const searches = await db
            .select()
            .from(locationSearches)
            .where(eq(locationSearches.locationId, testLocationId));

          // Property: All concurrent searches should be recorded
          expect(searches.length).toBe(concurrentCount);
        },
      ),
      { numRuns: 50 }, // Fewer runs for concurrent tests
    );
  });

  it('should maintain referential integrity with location_id', async () => {
    if (skipTests || !db) {
      console.log('⏭️  Skipping test: Database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // Whether to include user ID
        async includeUser => {
          // Track search
          await locationAnalyticsService.trackLocationSearch(
            testLocationId,
            includeUser ? testUserId : undefined,
          );

          // Verify the search record exists
          const searches = await db
            .select()
            .from(locationSearches)
            .where(eq(locationSearches.locationId, testLocationId));

          expect(searches.length).toBeGreaterThan(0);

          // Property: All search records should reference a valid location
          for (const search of searches) {
            const location = await db
              .select()
              .from(locations)
              .where(eq(locations.id, search.locationId))
              .limit(1);

            expect(location.length).toBe(1);
            expect(location[0].id).toBe(testLocationId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Trending Score Calculation', () => {
  let testLocationId: number;

  beforeAll(async () => {
    if (skipTests || !db) return;

    // Create a test location
    const [location] = await db
      .insert(locations)
      .values({
        name: 'Test Suburb for Score',
        slug: 'test-suburb-score',
        type: 'suburb',
        parentId: null,
      })
      .returning();
    testLocationId = location.id;
  });

  afterAll(async () => {
    if (skipTests || !db) return;

    // Clean up test data
    if (testLocationId) {
      await db.delete(locationSearches).where(eq(locationSearches.locationId, testLocationId));
      await db.delete(locations).where(eq(locations.id, testLocationId));
    }
  });

  beforeEach(async () => {
    if (skipTests || !db) return;

    // Clean up search records before each test
    await db.delete(locationSearches).where(eq(locationSearches.locationId, testLocationId));
  });

  it('should return 0 for locations with no searches', async () => {
    if (skipTests || !db) {
      console.log('⏭️  Skipping test: Database not available');
      return;
    }
    const score = await locationAnalyticsService.calculateTrendingScore(testLocationId);

    // Property: Locations with no searches should have a score of 0
    expect(score).toBe(0);
  });

  it('should return a score between 0 and 100 for any number of searches', async () => {
    if (skipTests || !db) {
      console.log('⏭️  Skipping test: Database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 200 }), // Number of searches
        async searchCount => {
          // Create search records
          for (let i = 0; i < searchCount; i++) {
            await locationAnalyticsService.trackLocationSearch(testLocationId);
          }

          const score = await locationAnalyticsService.calculateTrendingScore(testLocationId);

          // Property: Score should always be between 0 and 100
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('should increase score as search count increases', async () => {
    if (skipTests || !db) {
      console.log('⏭️  Skipping test: Database not available');
      return;
    }

    // Create a few searches
    await locationAnalyticsService.trackLocationSearch(testLocationId);
    const score1 = await locationAnalyticsService.calculateTrendingScore(testLocationId);

    // Add more searches
    for (let i = 0; i < 10; i++) {
      await locationAnalyticsService.trackLocationSearch(testLocationId);
    }
    const score2 = await locationAnalyticsService.calculateTrendingScore(testLocationId);

    // Property: More searches should result in a higher or equal score
    expect(score2).toBeGreaterThanOrEqual(score1);
  });
});
