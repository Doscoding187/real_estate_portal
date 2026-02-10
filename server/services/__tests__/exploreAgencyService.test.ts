import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../../db';
import { exploreShorts, agents, agencies } from '../../../drizzle/schema';
import { sql } from 'drizzle-orm';
import { exploreAgencyService } from '../exploreAgencyService';

/**
 * Explore Agency Service Tests
 *
 * Tests agency-level analytics and metrics aggregation
 * Requirements: 3.1, 3.2, 3.3, 3.4
 *
 * TODO: Migrate to exploreContent table after unification complete
 */

describe.skip('Explore Agency Service [LEGACY - uses exploreShorts]', () => {
  let testAgencyId: number;
  let testAgentIds: number[] = [];
  let testShortIds: number[] = [];

  beforeAll(async () => {
    // Ensure tables exist
    try {
      await db.execute(sql`SELECT 1 FROM explore_shorts LIMIT 1`);
      await db.execute(sql`SELECT 1 FROM agencies LIMIT 1`);
      await db.execute(sql`SELECT 1 FROM agents LIMIT 1`);
    } catch (error) {
      console.error('Tables not found. Run migration first:', error);
      throw error;
    }
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await db.execute(sql`DELETE FROM explore_shorts WHERE title LIKE 'TEST:AGENCY:%'`);
    await db.execute(
      sql`DELETE FROM agents WHERE first_name = 'TEST' AND last_name LIKE 'AGENCY%'`,
    );
    await db.execute(sql`DELETE FROM agencies WHERE name LIKE 'TEST:AGENCY:%'`);

    testAgentIds = [];
    testShortIds = [];
  });

  afterAll(async () => {
    // Final cleanup
    await db.execute(sql`DELETE FROM explore_shorts WHERE title LIKE 'TEST:AGENCY:%'`);
    await db.execute(
      sql`DELETE FROM agents WHERE first_name = 'TEST' AND last_name LIKE 'AGENCY%'`,
    );
    await db.execute(sql`DELETE FROM agencies WHERE name LIKE 'TEST:AGENCY:%'`);
  });

  /**
   * Test: Get agency metrics with no content
   * Should return zero metrics for agency with no content
   */
  it('should return zero metrics for agency with no content', async () => {
    // Create test agency
    const agency = await db.insert(agencies).values({
      name: 'TEST:AGENCY:Empty',
      slug: 'test-agency-empty',
      isVerified: 0,
    });

    testAgencyId = Number(agency.insertId);

    // Get metrics
    const metrics = await exploreAgencyService.getAgencyMetrics(testAgencyId);

    // Verify zero metrics
    expect(metrics.totalContent).toBe(0);
    expect(metrics.totalViews).toBe(0);
    expect(metrics.totalEngagements).toBe(0);
    expect(metrics.averageEngagementRate).toBe(0);
    expect(metrics.agentBreakdown).toEqual([]);
    expect(metrics.topPerformingContent).toEqual([]);

    // Clean up
    await db.execute(sql`DELETE FROM agencies WHERE id = ${testAgencyId}`);
  });

  /**
   * Test: Get agency metrics with content
   * Should aggregate metrics across all agency content
   */
  it('should aggregate metrics across agency content', async () => {
    // Create test agency
    const agency = await db.insert(agencies).values({
      name: 'TEST:AGENCY:WithContent',
      slug: 'test-agency-with-content',
      isVerified: 1,
    });

    testAgencyId = Number(agency.insertId);

    // Create test shorts directly attributed to agency
    const short1 = await db.insert(exploreShorts).values({
      title: 'TEST:AGENCY:Short 1',
      agencyId: testAgencyId,
      primaryMediaId: 1,
      mediaIds: JSON.stringify([1]),
      performanceScore: '75.50',
      boostPriority: 10,
      viewCount: 100,
      saveCount: 10,
      shareCount: 5,
      isPublished: 1,
      isFeatured: 0,
    });

    const short2 = await db.insert(exploreShorts).values({
      title: 'TEST:AGENCY:Short 2',
      agencyId: testAgencyId,
      primaryMediaId: 1,
      mediaIds: JSON.stringify([1]),
      performanceScore: '60.00',
      boostPriority: 5,
      viewCount: 50,
      saveCount: 5,
      shareCount: 2,
      isPublished: 1,
      isFeatured: 0,
    });

    testShortIds.push(Number(short1.insertId), Number(short2.insertId));

    // Get metrics
    const metrics = await exploreAgencyService.getAgencyMetrics(testAgencyId);

    // Verify aggregated metrics
    expect(metrics.totalContent).toBe(2);
    expect(metrics.totalViews).toBe(150);
    expect(metrics.totalEngagements).toBe(22); // 10+5+5+2
    expect(metrics.averageEngagementRate).toBeGreaterThan(0);

    // Clean up
    for (const id of testShortIds) {
      await db.execute(sql`DELETE FROM explore_shorts WHERE id = ${id}`);
    }
    await db.execute(sql`DELETE FROM agencies WHERE id = ${testAgencyId}`);
  });

  /**
   * Test: Get agent breakdown
   * Should return per-agent metrics within agency
   */
  it('should return agent breakdown within agency', async () => {
    // Create test agency
    const agency = await db.insert(agencies).values({
      name: 'TEST:AGENCY:AgentBreakdown',
      slug: 'test-agency-agent-breakdown',
      isVerified: 1,
    });

    testAgencyId = Number(agency.insertId);

    // Create test agents
    const agent1 = await db.insert(agents).values({
      firstName: 'TEST',
      lastName: 'AGENCY_AGENT_1',
      agencyId: testAgencyId,
      email: 'test.agent1@test.com',
      isVerified: 1,
      status: 'approved',
    });

    const agent2 = await db.insert(agents).values({
      firstName: 'TEST',
      lastName: 'AGENCY_AGENT_2',
      agencyId: testAgencyId,
      email: 'test.agent2@test.com',
      isVerified: 1,
      status: 'approved',
    });

    testAgentIds.push(Number(agent1.insertId), Number(agent2.insertId));

    // Create shorts for each agent
    const short1 = await db.insert(exploreShorts).values({
      title: 'TEST:AGENCY:Agent1 Short',
      agentId: testAgentIds[0],
      primaryMediaId: 1,
      mediaIds: JSON.stringify([1]),
      performanceScore: '80.00',
      viewCount: 200,
      isPublished: 1,
      isFeatured: 0,
    });

    const short2 = await db.insert(exploreShorts).values({
      title: 'TEST:AGENCY:Agent2 Short',
      agentId: testAgentIds[1],
      primaryMediaId: 1,
      mediaIds: JSON.stringify([1]),
      performanceScore: '70.00',
      viewCount: 100,
      isPublished: 1,
      isFeatured: 0,
    });

    testShortIds.push(Number(short1.insertId), Number(short2.insertId));

    // Get agent breakdown
    const breakdown = await exploreAgencyService.getAgentBreakdown(testAgencyId);

    // Verify breakdown
    expect(breakdown.length).toBe(2);
    expect(breakdown[0].contentCount).toBeGreaterThan(0);
    expect(breakdown[0].totalViews).toBeGreaterThan(0);

    // Should be sorted by views (descending)
    expect(breakdown[0].totalViews).toBeGreaterThanOrEqual(breakdown[1].totalViews);

    // Clean up
    for (const id of testShortIds) {
      await db.execute(sql`DELETE FROM explore_shorts WHERE id = ${id}`);
    }
    for (const id of testAgentIds) {
      await db.execute(sql`DELETE FROM agents WHERE id = ${id}`);
    }
    await db.execute(sql`DELETE FROM agencies WHERE id = ${testAgencyId}`);
  });

  /**
   * Test: Get top performing content
   * Should return top 10 content items ordered by performance
   */
  it('should return top performing content', async () => {
    // Create test agency
    const agency = await db.insert(agencies).values({
      name: 'TEST:AGENCY:TopContent',
      slug: 'test-agency-top-content',
      isVerified: 1,
    });

    testAgencyId = Number(agency.insertId);

    // Create multiple shorts with different performance scores
    for (let i = 0; i < 15; i++) {
      const short = await db.insert(exploreShorts).values({
        title: `TEST:AGENCY:Top Content ${i}`,
        agencyId: testAgencyId,
        primaryMediaId: 1,
        mediaIds: JSON.stringify([1]),
        performanceScore: `${50 + i * 2}.00`,
        viewCount: 50 + i * 10,
        saveCount: i,
        shareCount: i,
        isPublished: 1,
        isFeatured: 0,
      });

      testShortIds.push(Number(short.insertId));
    }

    // Get top content
    const topContent = await exploreAgencyService.getTopPerformingContent(testAgencyId);

    // Verify top content
    expect(topContent.length).toBeLessThanOrEqual(10);

    // Should be sorted by performance score (descending)
    for (let i = 0; i < topContent.length - 1; i++) {
      expect(topContent[i].performanceScore).toBeGreaterThanOrEqual(
        topContent[i + 1].performanceScore,
      );
    }

    // Clean up
    for (const id of testShortIds) {
      await db.execute(sql`DELETE FROM explore_shorts WHERE id = ${id}`);
    }
    await db.execute(sql`DELETE FROM agencies WHERE id = ${testAgencyId}`);
  });

  /**
   * Test: Cache invalidation
   * Should clear cache when invalidateAgencyCache is called
   */
  it('should invalidate agency cache', async () => {
    // Create test agency
    const agency = await db.insert(agencies).values({
      name: 'TEST:AGENCY:Cache',
      slug: 'test-agency-cache',
      isVerified: 1,
    });

    testAgencyId = Number(agency.insertId);

    // Get metrics (will cache)
    await exploreAgencyService.getAgencyMetrics(testAgencyId);

    // Invalidate cache
    await exploreAgencyService.invalidateAgencyCache(testAgencyId);

    // This should succeed without errors
    expect(true).toBe(true);

    // Clean up
    await db.execute(sql`DELETE FROM agencies WHERE id = ${testAgencyId}`);
  });
});
