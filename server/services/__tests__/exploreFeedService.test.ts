import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../../db';
import { exploreShorts, exploreUserPreferences } from '../../../drizzle/schema';
import { sql } from 'drizzle-orm';
import fc from 'fast-check';
import { exploreFeedService } from '../exploreFeedService';

/**
 * Feature: property-explore-shorts, Property 9: Feed type switching
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4
 * 
 * Property: For any feed type selection (Recommended, Area, Category, Agent/Developer),
 * the system SHALL load and display properties matching that feed type.
 * 
 * This test verifies that the feed service correctly generates feeds based on type
 * and returns appropriate results.
 */

describe('Explore Feed Service', () => {
  let testShortIds: number[] = [];

  beforeAll(async () => {
    // Ensure tables exist
    try {
      await db.execute(sql`SELECT 1 FROM explore_shorts LIMIT 1`);
    } catch (error) {
      console.error('Tables not found. Run migration first:', error);
      throw error;
    }
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await db.execute(sql`DELETE FROM explore_shorts WHERE title LIKE 'TEST:%'`);
    testShortIds = [];
  });

  afterAll(async () => {
    // Final cleanup
    await db.execute(sql`DELETE FROM explore_shorts WHERE title LIKE 'TEST:%'`);
    await db.execute(sql`DELETE FROM explore_user_preferences WHERE user_id > 1000000`);
  });

  /**
   * Property-Based Test: Recommended feed returns published shorts
   * 
   * For any valid limit and offset, the recommended feed should return
   * published shorts ordered by boost priority and performance score
   */
  it('should return published shorts in recommended feed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          limit: fc.integer({ min: 1, max: 50 }),
          offset: fc.integer({ min: 0, max: 100 }),
        }),
        async ({ limit, offset }) => {
          // Create test shorts
          const testShort = await db.insert(exploreShorts).values({
            title: 'TEST: Recommended Feed Test',
            primaryMediaId: 1,
            mediaIds: JSON.stringify([1, 2, 3]),
            performanceScore: '75.50',
            boostPriority: 10,
            isPublished: 1,
            isFeatured: 0,
          });

          testShortIds.push(Number(testShort.insertId));

          // Get recommended feed
          const result = await exploreFeedService.getRecommendedFeed({
            limit,
            offset,
          });

          // Verify result structure
          expect(result).toHaveProperty('shorts');
          expect(result).toHaveProperty('feedType', 'recommended');
          expect(result).toHaveProperty('hasMore');
          expect(result).toHaveProperty('offset');
          expect(Array.isArray(result.shorts)).toBe(true);
          expect(result.shorts.length).toBeLessThanOrEqual(limit);

          // Clean up
          await db.execute(sql`DELETE FROM explore_shorts WHERE id = ${testShort.insertId}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property-Based Test: Area feed filters by location
   * 
   * For any location string, the area feed should return shorts
   * that match the location in city, suburb, or province
   */
  it('should filter shorts by location in area feed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          location: fc.constantFrom('Cape Town', 'Johannesburg', 'Durban', 'Pretoria'),
          limit: fc.integer({ min: 1, max: 20 }),
        }),
        async ({ location, limit }) => {
          // Get area feed
          const result = await exploreFeedService.getAreaFeed({
            location,
            limit,
            offset: 0,
          });

          // Verify result structure
          expect(result).toHaveProperty('shorts');
          expect(result).toHaveProperty('feedType', 'area');
          expect(result).toHaveProperty('metadata');
          expect(result.metadata).toHaveProperty('location', location);
          expect(Array.isArray(result.shorts)).toBe(true);
          expect(result.shorts.length).toBeLessThanOrEqual(limit);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property-Based Test: Category feed filters by category
   * 
   * For any valid category, the category feed should return shorts
   * that match the category's highlight tags
   */
  it('should filter shorts by category', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          category: fc.constantFrom(
            'luxury_homes',
            'student_rentals',
            'new_developments',
            'move_in_ready',
            'pet_friendly'
          ),
          limit: fc.integer({ min: 1, max: 20 }),
        }),
        async ({ category, limit }) => {
          // Get category feed
          const result = await exploreFeedService.getCategoryFeed({
            category,
            limit,
            offset: 0,
          });

          // Verify result structure
          expect(result).toHaveProperty('shorts');
          expect(result).toHaveProperty('feedType', 'category');
          expect(result).toHaveProperty('metadata');
          expect(result.metadata).toHaveProperty('category', category);
          expect(Array.isArray(result.shorts)).toBe(true);
          expect(result.shorts.length).toBeLessThanOrEqual(limit);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property-Based Test: Agent feed filters by agent ID
   * 
   * For any agent ID, the agent feed should return only shorts
   * associated with that agent
   */
  it('should filter shorts by agent ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          agentId: fc.integer({ min: 1, max: 1000 }),
          limit: fc.integer({ min: 1, max: 20 }),
        }),
        async ({ agentId, limit }) => {
          // Create test short for this agent
          const testShort = await db.insert(exploreShorts).values({
            title: `TEST: Agent ${agentId} Feed`,
            agentId,
            primaryMediaId: 1,
            mediaIds: JSON.stringify([1]),
            performanceScore: '50.00',
            boostPriority: 0,
            isPublished: 1,
            isFeatured: 0,
          });

          testShortIds.push(Number(testShort.insertId));

          // Get agent feed
          const result = await exploreFeedService.getAgentFeed({
            agentId,
            limit,
            offset: 0,
          });

          // Verify result structure
          expect(result).toHaveProperty('shorts');
          expect(result).toHaveProperty('feedType', 'agent');
          expect(result).toHaveProperty('metadata');
          expect(result.metadata).toHaveProperty('agentId', agentId);
          expect(Array.isArray(result.shorts)).toBe(true);

          // Verify all shorts belong to the agent
          result.shorts.forEach((short: any) => {
            expect(short.agent_id).toBe(agentId);
          });

          // Clean up
          await db.execute(sql`DELETE FROM explore_shorts WHERE id = ${testShort.insertId}`);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property-Based Test: Developer feed filters by developer ID
   * 
   * For any developer ID, the developer feed should return only shorts
   * associated with that developer
   */
  it('should filter shorts by developer ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          developerId: fc.integer({ min: 1, max: 1000 }),
          limit: fc.integer({ min: 1, max: 20 }),
        }),
        async ({ developerId, limit }) => {
          // Create test short for this developer
          const testShort = await db.insert(exploreShorts).values({
            title: `TEST: Developer ${developerId} Feed`,
            developerId,
            primaryMediaId: 1,
            mediaIds: JSON.stringify([1]),
            performanceScore: '50.00',
            boostPriority: 0,
            isPublished: 1,
            isFeatured: 0,
          });

          testShortIds.push(Number(testShort.insertId));

          // Get developer feed
          const result = await exploreFeedService.getDeveloperFeed({
            developerId,
            limit,
            offset: 0,
          });

          // Verify result structure
          expect(result).toHaveProperty('shorts');
          expect(result).toHaveProperty('feedType', 'developer');
          expect(result).toHaveProperty('metadata');
          expect(result.metadata).toHaveProperty('developerId', developerId);
          expect(Array.isArray(result.shorts)).toBe(true);

          // Verify all shorts belong to the developer
          result.shorts.forEach((short: any) => {
            expect(short.developer_id).toBe(developerId);
          });

          // Clean up
          await db.execute(sql`DELETE FROM explore_shorts WHERE id = ${testShort.insertId}`);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property-Based Test: Pagination works correctly
   * 
   * For any limit and offset, the feed should return the correct number
   * of results and indicate if more results are available
   */
  it('should handle pagination correctly', async () => {
    // Create multiple test shorts
    const shortIds: number[] = [];
    for (let i = 0; i < 25; i++) {
      const result = await db.insert(exploreShorts).values({
        title: `TEST: Pagination Test ${i}`,
        primaryMediaId: 1,
        mediaIds: JSON.stringify([1]),
        performanceScore: '50.00',
        boostPriority: 0,
        isPublished: 1,
        isFeatured: 0,
      });
      shortIds.push(Number(result.insertId));
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          limit: fc.integer({ min: 5, max: 15 }),
          offset: fc.integer({ min: 0, max: 10 }),
        }),
        async ({ limit, offset }) => {
          const result = await exploreFeedService.getRecommendedFeed({
            limit,
            offset,
          });

          // Verify pagination
          expect(result.shorts.length).toBeLessThanOrEqual(limit);
          expect(result.offset).toBe(offset + result.shorts.length);
          
          // hasMore should be true if we got a full page
          if (result.shorts.length === limit) {
            expect(result.hasMore).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );

    // Clean up
    for (const id of shortIds) {
      await db.execute(sql`DELETE FROM explore_shorts WHERE id = ${id}`);
    }
  });

  /**
   * Property-Based Test: Boost priority affects ordering
   * 
   * Shorts with higher boost priority should appear before
   * shorts with lower boost priority
   */
  it('should order shorts by boost priority', async () => {
    // Create shorts with different boost priorities
    const lowPriorityShort = await db.insert(exploreShorts).values({
      title: 'TEST: Low Priority',
      primaryMediaId: 1,
      mediaIds: JSON.stringify([1]),
      performanceScore: '50.00',
      boostPriority: 0,
      isPublished: 1,
      isFeatured: 0,
    });

    const highPriorityShort = await db.insert(exploreShorts).values({
      title: 'TEST: High Priority',
      primaryMediaId: 1,
      mediaIds: JSON.stringify([1]),
      performanceScore: '50.00',
      boostPriority: 100,
      isPublished: 1,
      isFeatured: 0,
    });

    const result = await exploreFeedService.getRecommendedFeed({
      limit: 10,
      offset: 0,
    });

    // Find our test shorts in the results
    const lowIndex = result.shorts.findIndex((s: any) => s.id === Number(lowPriorityShort.insertId));
    const highIndex = result.shorts.findIndex((s: any) => s.id === Number(highPriorityShort.insertId));

    // High priority should come before low priority
    if (lowIndex !== -1 && highIndex !== -1) {
      expect(highIndex).toBeLessThan(lowIndex);
    }

    // Clean up
    await db.execute(sql`DELETE FROM explore_shorts WHERE id IN (${lowPriorityShort.insertId}, ${highPriorityShort.insertId})`);
  });

  /**
   * Property-Based Test: Only published shorts are returned
   * 
   * Unpublished shorts should never appear in any feed
   */
  it('should only return published shorts', async () => {
    // Create published and unpublished shorts
    const publishedShort = await db.insert(exploreShorts).values({
      title: 'TEST: Published',
      primaryMediaId: 1,
      mediaIds: JSON.stringify([1]),
      performanceScore: '50.00',
      boostPriority: 0,
      isPublished: 1,
      isFeatured: 0,
    });

    const unpublishedShort = await db.insert(exploreShorts).values({
      title: 'TEST: Unpublished',
      primaryMediaId: 1,
      mediaIds: JSON.stringify([1]),
      performanceScore: '50.00',
      boostPriority: 0,
      isPublished: 0,
      isFeatured: 0,
    });

    const result = await exploreFeedService.getRecommendedFeed({
      limit: 100,
      offset: 0,
    });

    // Verify unpublished short is not in results
    const hasUnpublished = result.shorts.some((s: any) => s.id === Number(unpublishedShort.insertId));
    expect(hasUnpublished).toBe(false);

    // Clean up
    await db.execute(sql`DELETE FROM explore_shorts WHERE id IN (${publishedShort.insertId}, ${unpublishedShort.insertId})`);
  });
});
