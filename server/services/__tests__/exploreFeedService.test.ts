import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../../db';
import { exploreContent } from '../../../drizzle/schema';
import { sql } from 'drizzle-orm';
import fc from 'fast-check';
import { exploreFeedService } from '../exploreFeedService';

describe('Explore Feed Service', () => {
  beforeAll(async () => {
    try {
      await db.execute(sql`SELECT 1 FROM explore_content LIMIT 1`);
    } catch (error) {
      console.error('Tables not found. Run migration first:', error);
      throw error;
    }
  });

  beforeEach(async () => {
    await db.execute(sql`DELETE FROM explore_content WHERE title LIKE 'TEST:%'`);
  });

  afterAll(async () => {
    await db.execute(sql`DELETE FROM explore_content WHERE title LIKE 'TEST:%'`);
  });

  it('should return active content in recommended feed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          limit: fc.integer({ min: 1, max: 50 }),
          offset: fc.constant(0),
        }),
        async ({ limit, offset }) => {
          await db.insert(exploreContent).values({
            contentType: 'video',
            referenceId: 1,
            title: 'TEST: Recommended Feed Test',
            creatorType: 'user',
            viewCount: 100,
            engagementScore: '75.50',
            isActive: 1,
            isFeatured: 0,
            thumbnailUrl: 'https://example.com/thumb.jpg',
          });

          const result = await exploreFeedService.getRecommendedFeed({ limit, offset });

          expect(result).toHaveProperty('shorts');
          expect(result).toHaveProperty('feedType', 'recommended');
          expect(result).toHaveProperty('hasMore');
          expect(result).toHaveProperty('offset');
          expect(Array.isArray(result.shorts)).toBe(true);
          expect(result.shorts.length).toBeLessThanOrEqual(limit);
        },
      ),
      { numRuns: 25 },
    );
  });

  it('should filter content by location in area feed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          location: fc.constantFrom('Cape Town', 'Johannesburg', 'Durban', 'Pretoria'),
          limit: fc.integer({ min: 1, max: 20 }),
        }),
        async ({ location, limit }) => {
          const result = await exploreFeedService.getAreaFeed({
            location,
            limit,
            offset: 0,
          });

          expect(result).toHaveProperty('shorts');
          expect(result).toHaveProperty('feedType', 'area');
          expect(result).toHaveProperty('metadata');
          expect(result.metadata).toHaveProperty('location', location);
          expect(Array.isArray(result.shorts)).toBe(true);
          expect(result.shorts.length).toBeLessThanOrEqual(limit);
        },
      ),
      { numRuns: 25 },
    );
  });

  it('should filter shorts by category', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          category: fc.constantFrom(
            'luxury_homes',
            'student_rentals',
            'new_developments',
            'move_in_ready',
            'pet_friendly',
          ),
          limit: fc.integer({ min: 1, max: 20 }),
        }),
        async ({ category, limit }) => {
          const result = await exploreFeedService.getCategoryFeed({
            category,
            limit,
            offset: 0,
          });

          expect(result).toHaveProperty('shorts');
          expect(result).toHaveProperty('feedType', 'category');
          expect(result).toHaveProperty('metadata');
          expect(result.metadata).toHaveProperty('category', category);
          expect(Array.isArray(result.shorts)).toBe(true);
          expect(result.shorts.length).toBeLessThanOrEqual(limit);
        },
      ),
      { numRuns: 25 },
    );
  });

  it('should filter shorts by agent ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          agentId: fc.integer({ min: 1, max: 1000 }),
          limit: fc.integer({ min: 1, max: 20 }),
        }),
        async ({ agentId, limit }) => {
          await db.insert(exploreContent).values({
            contentType: 'video',
            referenceId: 1,
            title: `TEST: Agent ${agentId} Feed`,
            creatorType: 'agent',
            creatorId: agentId,
            isActive: 1,
            isFeatured: 0,
            thumbnailUrl: 'https://example.com/thumb-agent.jpg',
          });

          const result = await exploreFeedService.getAgentFeed({
            agentId,
            limit,
            offset: 0,
          });

          expect(result).toHaveProperty('shorts');
          expect(result).toHaveProperty('feedType', 'agent');
          expect(result).toHaveProperty('metadata');
          expect(result.metadata).toHaveProperty('agentId', agentId);
          expect(Array.isArray(result.shorts)).toBe(true);

          result.shorts.forEach((item: any) => {
            expect(item.creatorId).toBe(agentId);
            expect(item.creatorType).toBe('agent');
          });
        },
      ),
      { numRuns: 25 },
    );
  });

  it('should filter shorts by developer ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          developerId: fc.integer({ min: 1, max: 1000 }),
          limit: fc.integer({ min: 1, max: 20 }),
        }),
        async ({ developerId, limit }) => {
          await db.insert(exploreContent).values({
            contentType: 'video',
            referenceId: 1,
            title: `TEST: Developer ${developerId} Feed`,
            creatorType: 'developer',
            creatorId: developerId,
            isActive: 1,
            isFeatured: 0,
            thumbnailUrl: 'https://example.com/thumb-dev.jpg',
          });

          const result = await exploreFeedService.getDeveloperFeed({
            developerId,
            limit,
            offset: 0,
          });

          expect(result).toHaveProperty('shorts');
          expect(result).toHaveProperty('feedType', 'developer');
          expect(result).toHaveProperty('metadata');
          expect(result.metadata).toHaveProperty('developerId', developerId);
          expect(Array.isArray(result.shorts)).toBe(true);

          result.shorts.forEach((item: any) => {
            expect(item.creatorId).toBe(developerId);
            expect(item.creatorType).toBe('developer');
          });
        },
      ),
      { numRuns: 25 },
    );
  });

  it('should handle pagination correctly', async () => {
    for (let i = 0; i < 25; i++) {
      await db.insert(exploreContent).values({
        contentType: 'video',
        referenceId: i + 1,
        title: `TEST: Pagination Test ${i}`,
        creatorType: 'user',
        isActive: 1,
        isFeatured: 0,
        thumbnailUrl: 'https://example.com/thumb-pagination.jpg',
      });
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          limit: fc.integer({ min: 5, max: 15 }),
          offset: fc.integer({ min: 0, max: 10 }),
        }),
        async ({ limit, offset }) => {
          const result = await exploreFeedService.getRecommendedFeed({ limit, offset });

          expect(result.shorts.length).toBeLessThanOrEqual(limit);
          expect(result.offset).toBeGreaterThanOrEqual(offset);
          expect(result.offset).toBeLessThanOrEqual(offset + limit);
        },
      ),
      { numRuns: 25 },
    );
  });

  it('should prioritize featured content over non-featured content', async () => {
    await db.insert(exploreContent).values({
      contentType: 'video',
      referenceId: 1,
      title: 'TEST: Non Featured',
      creatorType: 'user',
      isActive: 1,
      isFeatured: 0,
      thumbnailUrl: 'https://example.com/thumb-normal.jpg',
    });

    await db.insert(exploreContent).values({
      contentType: 'video',
      referenceId: 2,
      title: 'TEST: Featured',
      creatorType: 'user',
      isActive: 1,
      isFeatured: 1,
      thumbnailUrl: 'https://example.com/thumb-featured.jpg',
    });

    const result = await exploreFeedService.getRecommendedFeed({
      limit: 10,
      offset: 0,
    });

    const normalIndex = result.shorts.findIndex((s: any) => s.title === 'TEST: Non Featured');
    const featuredIndex = result.shorts.findIndex((s: any) => s.title === 'TEST: Featured');

    if (normalIndex !== -1 && featuredIndex !== -1) {
      expect(featuredIndex).toBeLessThan(normalIndex);
    }
  });

  it('should only return active content', async () => {
    await db.insert(exploreContent).values({
      contentType: 'video',
      referenceId: 1,
      title: 'TEST: Active',
      creatorType: 'user',
      isActive: 1,
      isFeatured: 0,
      thumbnailUrl: 'https://example.com/thumb-active.jpg',
    });

    await db.insert(exploreContent).values({
      contentType: 'video',
      referenceId: 2,
      title: 'TEST: Inactive',
      creatorType: 'user',
      isActive: 0,
      isFeatured: 0,
      thumbnailUrl: 'https://example.com/thumb-inactive.jpg',
    });

    const result = await exploreFeedService.getRecommendedFeed({
      limit: 100,
      offset: 0,
    });

    const hasInactive = result.shorts.some((s: any) => s.title === 'TEST: Inactive');

    expect(hasInactive).toBe(false);
  });
});
