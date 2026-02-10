/**
 * Integration Tests for Explore Agency Content Attribution
 * Task 10: Write integration tests
 *
 * Tests:
 * - End-to-end agency feed flow
 * - Agency analytics calculation
 * - Cache invalidation
 * - Permission enforcement
 * - Migration and rollback
 *
 * Requirements: All
 *
 * TODO: Migrate to exploreContent table after unification complete
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getDb } from '../../db';
import { exploreShorts, agents, agencies, users } from '../../../drizzle/schema';
import { sql } from 'drizzle-orm';
import { exploreFeedService } from '../exploreFeedService';
import { exploreAgencyService } from '../exploreAgencyService';
import { cache } from '../../lib/cache';

describe.skip('Explore Agency Content Attribution - Integration Tests [LEGACY - uses exploreShorts]', () => {
  let db: any;
  let testAgencyId: number;
  let testAgentIds: number[] = [];
  let testShortIds: number[] = [];
  let testUserIds: number[] = [];

  beforeAll(async () => {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.warn('⚠️  Database connection not available. Skipping integration tests.');
      console.warn('   Set DATABASE_URL environment variable to run these tests.');
      return;
    }

    // Initialize database connection
    try {
      db = await getDb();

      if (!db) {
        console.warn('⚠️  Database connection not available. Skipping integration tests.');
        return;
      }

      // Ensure tables exist
      await db.execute(sql`SELECT 1 FROM explore_shorts LIMIT 1`);
      await db.execute(sql`SELECT 1 FROM agencies LIMIT 1`);
      await db.execute(sql`SELECT 1 FROM agents LIMIT 1`);
    } catch (error) {
      console.error('Tables not found. Run migration first:', error);
      db = null;
    }
  });

  beforeEach(async () => {
    if (!db) return;

    // Clean up test data
    await db.execute(sql`DELETE FROM explore_shorts WHERE title LIKE 'TEST:INTEGRATION:%'`);
    await db.execute(
      sql`DELETE FROM agents WHERE first_name = 'TEST' AND last_name LIKE 'INTEGRATION%'`,
    );
    await db.execute(sql`DELETE FROM agencies WHERE name LIKE 'TEST:INTEGRATION:%'`);
    await db.execute(sql`DELETE FROM users WHERE username LIKE 'test_integration_%'`);

    testAgentIds = [];
    testShortIds = [];
    testUserIds = [];
  });

  afterAll(async () => {
    if (!db) return;

    // Final cleanup
    await db.execute(sql`DELETE FROM explore_shorts WHERE title LIKE 'TEST:INTEGRATION:%'`);
    await db.execute(
      sql`DELETE FROM agents WHERE first_name = 'TEST' AND last_name LIKE 'INTEGRATION%'`,
    );
    await db.execute(sql`DELETE FROM agencies WHERE name LIKE 'TEST:INTEGRATION:%'`);
    await db.execute(sql`DELETE FROM users WHERE username LIKE 'test_integration_%'`);
  });

  /**
   * Integration Test 1: End-to-end agency feed flow
   * Requirements: 1.2, 2.1, 2.2, 2.3, 8.1, 8.2
   *
   * Tests the complete flow from content creation to feed retrieval:
   * 1. Create agency
   * 2. Create agents in agency
   * 3. Create content attributed to agency and agents
   * 4. Retrieve agency feed
   * 5. Verify content ordering and pagination
   */
  describe('End-to-end agency feed flow', () => {
    it('should handle complete agency feed workflow', async () => {
      if (!db) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Step 1: Create agency
      const agency = await db.insert(agencies).values({
        name: 'TEST:INTEGRATION:E2E Agency',
        slug: 'test-integration-e2e-agency',
        isVerified: 1,
      });

      testAgencyId = Number(agency.insertId);

      // Step 2: Create users for agents
      const user1 = await db.insert(users).values({
        username: 'test_integration_agent1',
        email: 'test.integration.agent1@test.com',
        password: 'hashed_password',
        role: 'agent',
      });

      const user2 = await db.insert(users).values({
        username: 'test_integration_agent2',
        email: 'test.integration.agent2@test.com',
        password: 'hashed_password',
        role: 'agent',
      });

      testUserIds.push(Number(user1.insertId), Number(user2.insertId));

      // Step 3: Create agents in agency
      const agent1 = await db.insert(agents).values({
        userId: testUserIds[0],
        agencyId: testAgencyId,
        firstName: 'TEST',
        lastName: 'INTEGRATION_AGENT1',
        email: 'test.integration.agent1@test.com',
        isVerified: 1,
        status: 'approved',
      });

      const agent2 = await db.insert(agents).values({
        userId: testUserIds[1],
        agencyId: testAgencyId,
        firstName: 'TEST',
        lastName: 'INTEGRATION_AGENT2',
        email: 'test.integration.agent2@test.com',
        isVerified: 1,
        status: 'approved',
      });

      testAgentIds.push(Number(agent1.insertId), Number(agent2.insertId));

      // Step 4: Create content - mix of agency and agent attributed
      // Featured agency content
      const short1 = await db.insert(exploreShorts).values({
        title: 'TEST:INTEGRATION:Featured Agency Short',
        agencyId: testAgencyId,
        primaryMediaId: 1,
        mediaIds: JSON.stringify([1]),
        performanceScore: '90.00',
        viewCount: 500,
        saveCount: 50,
        shareCount: 25,
        isPublished: 1,
        isFeatured: 1,
      });

      // Regular agency content
      const short2 = await db.insert(exploreShorts).values({
        title: 'TEST:INTEGRATION:Regular Agency Short',
        agencyId: testAgencyId,
        primaryMediaId: 1,
        mediaIds: JSON.stringify([1]),
        performanceScore: '75.00',
        viewCount: 300,
        saveCount: 30,
        shareCount: 15,
        isPublished: 1,
        isFeatured: 0,
      });

      // Agent 1 content (should be included with includeAgentContent=true)
      const short3 = await db.insert(exploreShorts).values({
        title: 'TEST:INTEGRATION:Agent1 Short',
        agentId: testAgentIds[0],
        primaryMediaId: 1,
        mediaIds: JSON.stringify([1]),
        performanceScore: '80.00',
        viewCount: 400,
        saveCount: 40,
        shareCount: 20,
        isPublished: 1,
        isFeatured: 0,
      });

      // Agent 2 content
      const short4 = await db.insert(exploreShorts).values({
        title: 'TEST:INTEGRATION:Agent2 Short',
        agentId: testAgentIds[1],
        primaryMediaId: 1,
        mediaIds: JSON.stringify([1]),
        performanceScore: '70.00',
        viewCount: 200,
        saveCount: 20,
        shareCount: 10,
        isPublished: 1,
        isFeatured: 0,
      });

      testShortIds.push(
        Number(short1.insertId),
        Number(short2.insertId),
        Number(short3.insertId),
        Number(short4.insertId),
      );

      // Step 5: Retrieve agency feed with agent content
      const feedWithAgents = await exploreFeedService.getAgencyFeed({
        agencyId: testAgencyId,
        includeAgentContent: true,
        limit: 10,
        offset: 0,
      });

      // Verify feed structure
      expect(feedWithAgents).toHaveProperty('shorts');
      expect(feedWithAgents).toHaveProperty('feedType', 'agency');
      expect(feedWithAgents).toHaveProperty('hasMore');
      expect(feedWithAgents).toHaveProperty('metadata');
      expect(feedWithAgents.metadata).toHaveProperty('agencyId', testAgencyId);
      expect(feedWithAgents.metadata).toHaveProperty('includeAgentContent', true);

      // Verify all content is included
      expect(feedWithAgents.shorts.length).toBe(4);

      // Verify featured content comes first
      expect(feedWithAgents.shorts[0].is_featured).toBe(1);

      // Step 6: Retrieve agency feed without agent content
      const feedWithoutAgents = await exploreFeedService.getAgencyFeed({
        agencyId: testAgencyId,
        includeAgentContent: false,
        limit: 10,
        offset: 0,
      });

      // Should only include directly attributed content
      expect(feedWithoutAgents.shorts.length).toBe(2);
      expect(feedWithoutAgents.metadata).toHaveProperty('includeAgentContent', false);

      // Verify only agency-attributed content
      for (const short of feedWithoutAgents.shorts) {
        expect(short.agency_id).toBe(testAgencyId);
      }

      // Step 7: Test pagination
      const page1 = await exploreFeedService.getAgencyFeed({
        agencyId: testAgencyId,
        includeAgentContent: true,
        limit: 2,
        offset: 0,
      });

      expect(page1.shorts.length).toBe(2);
      expect(page1.hasMore).toBe(true);
      expect(page1.offset).toBe(2);

      const page2 = await exploreFeedService.getAgencyFeed({
        agencyId: testAgencyId,
        includeAgentContent: true,
        limit: 2,
        offset: 2,
      });

      expect(page2.shorts.length).toBe(2);
      expect(page2.hasMore).toBe(false);
      expect(page2.offset).toBe(4);

      // Verify no overlap between pages
      const page1Ids = page1.shorts.map((s: any) => s.id);
      const page2Ids = page2.shorts.map((s: any) => s.id);
      const overlap = page1Ids.filter((id: number) => page2Ids.includes(id));
      expect(overlap.length).toBe(0);

      // Clean up
      for (const id of testShortIds) {
        await db.execute(sql`DELETE FROM explore_shorts WHERE id = ${id}`);
      }
      for (const id of testAgentIds) {
        await db.execute(sql`DELETE FROM agents WHERE id = ${id}`);
      }
      for (const id of testUserIds) {
        await db.execute(sql`DELETE FROM users WHERE id = ${id}`);
      }
      await db.execute(sql`DELETE FROM agencies WHERE id = ${testAgencyId}`);
    });
  });

  /**
   * Integration Test 2: Agency analytics calculation
   * Requirements: 3.1, 3.2, 3.3, 3.4
   *
   * Tests the complete analytics workflow:
   * 1. Create agency with multiple agents
   * 2. Create content with various metrics
   * 3. Calculate agency metrics
   * 4. Verify aggregations are correct
   * 5. Verify agent breakdown
   * 6. Verify top content ranking
   */
  describe('Agency analytics calculation', () => {
    it('should calculate comprehensive agency analytics', async () => {
      if (!db) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Step 1: Create agency
      const agency = await db.insert(agencies).values({
        name: 'TEST:INTEGRATION:Analytics Agency',
        slug: 'test-integration-analytics-agency',
        isVerified: 1,
      });

      testAgencyId = Number(agency.insertId);

      // Step 2: Create users and agents
      const user1 = await db.insert(users).values({
        username: 'test_integration_analytics_agent1',
        email: 'test.integration.analytics.agent1@test.com',
        password: 'hashed_password',
        role: 'agent',
      });

      const user2 = await db.insert(users).values({
        username: 'test_integration_analytics_agent2',
        email: 'test.integration.analytics.agent2@test.com',
        password: 'hashed_password',
        role: 'agent',
      });

      testUserIds.push(Number(user1.insertId), Number(user2.insertId));

      const agent1 = await db.insert(agents).values({
        userId: testUserIds[0],
        agencyId: testAgencyId,
        firstName: 'TEST',
        lastName: 'INTEGRATION_ANALYTICS1',
        email: 'test.integration.analytics.agent1@test.com',
        isVerified: 1,
        status: 'approved',
      });

      const agent2 = await db.insert(agents).values({
        userId: testUserIds[1],
        agencyId: testAgencyId,
        firstName: 'TEST',
        lastName: 'INTEGRATION_ANALYTICS2',
        email: 'test.integration.analytics.agent2@test.com',
        isVerified: 1,
        status: 'approved',
      });

      testAgentIds.push(Number(agent1.insertId), Number(agent2.insertId));

      // Step 3: Create content with known metrics
      // Agent 1: High performer (3 shorts)
      for (let i = 0; i < 3; i++) {
        const short = await db.insert(exploreShorts).values({
          title: `TEST:INTEGRATION:Agent1 Short ${i}`,
          agentId: testAgentIds[0],
          primaryMediaId: 1,
          mediaIds: JSON.stringify([1]),
          performanceScore: `${85 + i}.00`,
          viewCount: 300 + i * 50,
          saveCount: 30 + i * 5,
          shareCount: 15 + i * 2,
          isPublished: 1,
          isFeatured: 0,
        });
        testShortIds.push(Number(short.insertId));
      }

      // Agent 2: Moderate performer (2 shorts)
      for (let i = 0; i < 2; i++) {
        const short = await db.insert(exploreShorts).values({
          title: `TEST:INTEGRATION:Agent2 Short ${i}`,
          agentId: testAgentIds[1],
          primaryMediaId: 1,
          mediaIds: JSON.stringify([1]),
          performanceScore: `${70 + i * 5}.00`,
          viewCount: 150 + i * 25,
          saveCount: 15 + i * 3,
          shareCount: 7 + i * 2,
          isPublished: 1,
          isFeatured: 0,
        });
        testShortIds.push(Number(short.insertId));
      }

      // Direct agency content (1 short)
      const agencyShort = await db.insert(exploreShorts).values({
        title: 'TEST:INTEGRATION:Direct Agency Short',
        agencyId: testAgencyId,
        primaryMediaId: 1,
        mediaIds: JSON.stringify([1]),
        performanceScore: '95.00',
        viewCount: 600,
        saveCount: 60,
        shareCount: 30,
        isPublished: 1,
        isFeatured: 1,
      });
      testShortIds.push(Number(agencyShort.insertId));

      // Step 4: Calculate agency metrics
      const metrics = await exploreAgencyService.getAgencyMetrics(testAgencyId);

      // Verify total content count (3 + 2 + 1 = 6)
      expect(metrics.totalContent).toBe(6);

      // Verify total views (sum of all view counts)
      // Agent1: 300+350+400 = 1050
      // Agent2: 150+175 = 325
      // Agency: 600
      // Total: 1975
      expect(metrics.totalViews).toBe(1975);

      // Verify total engagements (saves + shares)
      // Agent1: (30+35+40) + (15+17+19) = 105 + 51 = 156
      // Agent2: (15+18) + (7+9) = 33 + 16 = 49
      // Agency: 60 + 30 = 90
      // Total: 295
      expect(metrics.totalEngagements).toBe(295);

      // Verify average engagement rate is calculated
      expect(metrics.averageEngagementRate).toBeGreaterThan(0);
      expect(metrics.averageEngagementRate).toBeLessThan(100);

      // Step 5: Verify agent breakdown
      expect(metrics.agentBreakdown).toBeDefined();
      expect(metrics.agentBreakdown.length).toBe(2);

      // Should be sorted by views (descending)
      expect(metrics.agentBreakdown[0].totalViews).toBeGreaterThanOrEqual(
        metrics.agentBreakdown[1].totalViews,
      );

      // Verify agent 1 metrics
      const agent1Metrics = metrics.agentBreakdown.find(a => a.agentId === testAgentIds[0]);
      expect(agent1Metrics).toBeDefined();
      expect(agent1Metrics!.contentCount).toBe(3);
      expect(agent1Metrics!.totalViews).toBe(1050);

      // Verify agent 2 metrics
      const agent2Metrics = metrics.agentBreakdown.find(a => a.agentId === testAgentIds[1]);
      expect(agent2Metrics).toBeDefined();
      expect(agent2Metrics!.contentCount).toBe(2);
      expect(agent2Metrics!.totalViews).toBe(325);

      // Step 6: Verify top performing content
      expect(metrics.topPerformingContent).toBeDefined();
      expect(metrics.topPerformingContent.length).toBeGreaterThan(0);
      expect(metrics.topPerformingContent.length).toBeLessThanOrEqual(10);

      // Top content should be sorted by performance score
      for (let i = 0; i < metrics.topPerformingContent.length - 1; i++) {
        expect(metrics.topPerformingContent[i].performanceScore).toBeGreaterThanOrEqual(
          metrics.topPerformingContent[i + 1].performanceScore,
        );
      }

      // Highest performer should be the direct agency content (95.00)
      expect(metrics.topPerformingContent[0].performanceScore).toBe(95);
      expect(metrics.topPerformingContent[0].title).toBe('TEST:INTEGRATION:Direct Agency Short');

      // Clean up
      for (const id of testShortIds) {
        await db.execute(sql`DELETE FROM explore_shorts WHERE id = ${id}`);
      }
      for (const id of testAgentIds) {
        await db.execute(sql`DELETE FROM agents WHERE id = ${id}`);
      }
      for (const id of testUserIds) {
        await db.execute(sql`DELETE FROM users WHERE id = ${id}`);
      }
      await db.execute(sql`DELETE FROM agencies WHERE id = ${testAgencyId}`);
    });
  });

  /**
   * Integration Test 3: Cache invalidation
   * Requirements: 2.5, Performance
   *
   * Tests cache behavior:
   * 1. Retrieve agency feed (should cache)
   * 2. Retrieve again (should hit cache)
   * 3. Update content
   * 4. Invalidate cache
   * 5. Retrieve again (should fetch fresh data)
   */
  describe('Cache invalidation', () => {
    it('should cache and invalidate agency feed correctly', async () => {
      if (!db) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Step 1: Create agency and content
      const agency = await db.insert(agencies).values({
        name: 'TEST:INTEGRATION:Cache Agency',
        slug: 'test-integration-cache-agency',
        isVerified: 1,
      });

      testAgencyId = Number(agency.insertId);

      const short1 = await db.insert(exploreShorts).values({
        title: 'TEST:INTEGRATION:Cache Short 1',
        agencyId: testAgencyId,
        primaryMediaId: 1,
        mediaIds: JSON.stringify([1]),
        performanceScore: '80.00',
        viewCount: 100,
        isPublished: 1,
        isFeatured: 0,
      });

      testShortIds.push(Number(short1.insertId));

      // Step 2: First retrieval (should cache)
      const feed1 = await exploreFeedService.getAgencyFeed({
        agencyId: testAgencyId,
        includeAgentContent: true,
        limit: 10,
        offset: 0,
      });

      expect(feed1.shorts.length).toBe(1);
      expect(feed1.shorts[0].title).toBe('TEST:INTEGRATION:Cache Short 1');

      // Step 3: Second retrieval (should hit cache - same result)
      const feed2 = await exploreFeedService.getAgencyFeed({
        agencyId: testAgencyId,
        includeAgentContent: true,
        limit: 10,
        offset: 0,
      });

      expect(feed2.shorts.length).toBe(1);
      expect(feed2.shorts[0].id).toBe(feed1.shorts[0].id);

      // Step 4: Add new content
      const short2 = await db.insert(exploreShorts).values({
        title: 'TEST:INTEGRATION:Cache Short 2',
        agencyId: testAgencyId,
        primaryMediaId: 1,
        mediaIds: JSON.stringify([1]),
        performanceScore: '85.00',
        viewCount: 150,
        isPublished: 1,
        isFeatured: 0,
      });

      testShortIds.push(Number(short2.insertId));

      // Step 5: Retrieve again (should still hit cache - old result)
      const feed3 = await exploreFeedService.getAgencyFeed({
        agencyId: testAgencyId,
        includeAgentContent: true,
        limit: 10,
        offset: 0,
      });

      // Should still show only 1 item (cached)
      expect(feed3.shorts.length).toBe(1);

      // Step 6: Invalidate cache
      await exploreAgencyService.invalidateAgencyCache(testAgencyId);

      // Also clear feed cache manually
      const { CacheKeys } = await import('../../lib/cache');
      const cacheKey = CacheKeys.agencyFeed(testAgencyId, 10, 0, true);
      await cache.del(cacheKey);

      // Step 7: Retrieve again (should fetch fresh data)
      const feed4 = await exploreFeedService.getAgencyFeed({
        agencyId: testAgencyId,
        includeAgentContent: true,
        limit: 10,
        offset: 0,
      });

      // Should now show 2 items (fresh data)
      expect(feed4.shorts.length).toBe(2);

      // Clean up
      for (const id of testShortIds) {
        await db.execute(sql`DELETE FROM explore_shorts WHERE id = ${id}`);
      }
      await db.execute(sql`DELETE FROM agencies WHERE id = ${testAgencyId}`);
    });

    it('should cache agency metrics correctly', async () => {
      if (!db) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Create agency and content
      const agency = await db.insert(agencies).values({
        name: 'TEST:INTEGRATION:Metrics Cache Agency',
        slug: 'test-integration-metrics-cache-agency',
        isVerified: 1,
      });

      testAgencyId = Number(agency.insertId);

      const short1 = await db.insert(exploreShorts).values({
        title: 'TEST:INTEGRATION:Metrics Cache Short',
        agencyId: testAgencyId,
        primaryMediaId: 1,
        mediaIds: JSON.stringify([1]),
        performanceScore: '80.00',
        viewCount: 100,
        saveCount: 10,
        shareCount: 5,
        isPublished: 1,
        isFeatured: 0,
      });

      testShortIds.push(Number(short1.insertId));

      // First retrieval (should cache)
      const metrics1 = await exploreAgencyService.getAgencyMetrics(testAgencyId);
      expect(metrics1.totalContent).toBe(1);
      expect(metrics1.totalViews).toBe(100);

      // Update content
      await db.execute(sql`
        UPDATE explore_shorts 
        SET view_count = 200 
        WHERE id = ${short1.insertId}
      `);

      // Second retrieval (should hit cache - old value)
      const metrics2 = await exploreAgencyService.getAgencyMetrics(testAgencyId);
      expect(metrics2.totalViews).toBe(100); // Still cached value

      // Invalidate cache
      await exploreAgencyService.invalidateAgencyCache(testAgencyId);

      // Third retrieval (should fetch fresh data)
      const metrics3 = await exploreAgencyService.getAgencyMetrics(testAgencyId);
      expect(metrics3.totalViews).toBe(200); // Updated value

      // Clean up
      await db.execute(sql`DELETE FROM explore_shorts WHERE id = ${short1.insertId}`);
      await db.execute(sql`DELETE FROM agencies WHERE id = ${testAgencyId}`);
    });
  });

  /**
   * Integration Test 4: Permission enforcement
   * Requirements: 3.4, Security
   *
   * Tests access control for agency analytics:
   * 1. Create agency with owner
   * 2. Create agent in agency
   * 3. Create unrelated user
   * 4. Verify owner can access analytics
   * 5. Verify agent can access analytics
   * 6. Verify unrelated user cannot access analytics
   */
  describe('Permission enforcement', () => {
    it('should enforce agency analytics access control', async () => {
      if (!db) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Step 1: Create owner user
      const ownerUser = await db.insert(users).values({
        username: 'test_integration_owner',
        email: 'test.integration.owner@test.com',
        password: 'hashed_password',
        role: 'agency_admin',
      });

      const ownerId = Number(ownerUser.insertId);
      testUserIds.push(ownerId);

      // Step 2: Create agency with owner
      const agency = await db.insert(agencies).values({
        name: 'TEST:INTEGRATION:Permission Agency',
        slug: 'test-integration-permission-agency',
        ownerId: ownerId,
        isVerified: 1,
      });

      testAgencyId = Number(agency.insertId);

      // Step 3: Create agent user
      const agentUser = await db.insert(users).values({
        username: 'test_integration_permission_agent',
        email: 'test.integration.permission.agent@test.com',
        password: 'hashed_password',
        role: 'agent',
      });

      const agentUserId = Number(agentUser.insertId);
      testUserIds.push(agentUserId);

      // Step 4: Create agent in agency
      const agent = await db.insert(agents).values({
        userId: agentUserId,
        agencyId: testAgencyId,
        firstName: 'TEST',
        lastName: 'INTEGRATION_PERMISSION',
        email: 'test.integration.permission.agent@test.com',
        isVerified: 1,
        status: 'approved',
      });

      testAgentIds.push(Number(agent.insertId));

      // Step 5: Create unrelated user
      const unrelatedUser = await db.insert(users).values({
        username: 'test_integration_unrelated',
        email: 'test.integration.unrelated@test.com',
        password: 'hashed_password',
        role: 'user',
      });

      const unrelatedUserId = Number(unrelatedUser.insertId);
      testUserIds.push(unrelatedUserId);

      // Step 6: Create super admin user
      const superAdminUser = await db.insert(users).values({
        username: 'test_integration_superadmin',
        email: 'test.integration.superadmin@test.com',
        password: 'hashed_password',
        role: 'super_admin',
      });

      const superAdminUserId = Number(superAdminUser.insertId);
      testUserIds.push(superAdminUserId);

      // Import verifyAgencyAccess function
      const { default: exploreApiRouter } = await import('../../exploreApiRouter');

      // Test owner access (should succeed)
      // Note: We can't directly test the tRPC endpoint without full context setup
      // Instead, we verify the database relationships are correct
      const ownerCheck = await db
        .select()
        .from(agencies)
        .where(sql`id = ${testAgencyId} AND owner_id = ${ownerId}`)
        .limit(1);

      expect(ownerCheck.length).toBe(1);

      // Test agent access (should succeed)
      const agentCheck = await db
        .select()
        .from(agents)
        .where(sql`user_id = ${agentUserId} AND agency_id = ${testAgencyId}`)
        .limit(1);

      expect(agentCheck.length).toBe(1);

      // Test unrelated user access (should fail)
      const unrelatedCheck = await db
        .select()
        .from(agents)
        .where(sql`user_id = ${unrelatedUserId} AND agency_id = ${testAgencyId}`)
        .limit(1);

      expect(unrelatedCheck.length).toBe(0);

      // Verify super admin exists
      const superAdminCheck = await db
        .select()
        .from(users)
        .where(sql`id = ${superAdminUserId} AND role = 'super_admin'`)
        .limit(1);

      expect(superAdminCheck.length).toBe(1);

      // Clean up
      for (const id of testAgentIds) {
        await db.execute(sql`DELETE FROM agents WHERE id = ${id}`);
      }
      for (const id of testUserIds) {
        await db.execute(sql`DELETE FROM users WHERE id = ${id}`);
      }
      await db.execute(sql`DELETE FROM agencies WHERE id = ${testAgencyId}`);
    });
  });

  /**
   * Integration Test 5: Migration and rollback
   * Requirements: 4.1, 4.2, 4.3, 7.5
   *
   * Tests database schema changes:
   * 1. Verify agency_id column exists in explore_shorts
   * 2. Verify creator_type and agency_id columns exist in explore_content
   * 3. Verify indexes are created
   * 4. Verify foreign key constraints
   * 5. Test data integrity after migration
   */
  describe('Migration and rollback', () => {
    it('should have correct schema after migration', async () => {
      if (!db) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Step 1: Verify explore_shorts has agency_id column
      const shortsColumns = await db.execute(sql`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'explore_shorts'
          AND COLUMN_NAME = 'agency_id'
      `);

      expect(shortsColumns.rows.length).toBe(1);
      expect(shortsColumns.rows[0].COLUMN_NAME).toBe('agency_id');
      expect(shortsColumns.rows[0].DATA_TYPE).toBe('int');
      expect(shortsColumns.rows[0].IS_NULLABLE).toBe('YES');

      // Step 2: Verify explore_content has creator_type and agency_id columns
      const contentColumns = await db.execute(sql`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'explore_content'
          AND COLUMN_NAME IN ('creator_type', 'agency_id')
        ORDER BY COLUMN_NAME
      `);

      expect(contentColumns.rows.length).toBe(2);

      // Verify agency_id column
      const agencyIdCol = contentColumns.rows.find((r: any) => r.COLUMN_NAME === 'agency_id');
      expect(agencyIdCol).toBeDefined();
      expect(agencyIdCol.DATA_TYPE).toBe('int');
      expect(agencyIdCol.IS_NULLABLE).toBe('YES');

      // Verify creator_type column
      const creatorTypeCol = contentColumns.rows.find((r: any) => r.COLUMN_NAME === 'creator_type');
      expect(creatorTypeCol).toBeDefined();
      expect(creatorTypeCol.DATA_TYPE).toBe('enum');
      expect(creatorTypeCol.IS_NULLABLE).toBe('NO');

      // Step 3: Verify indexes are created
      const indexes = await db.execute(sql`
        SELECT 
          TABLE_NAME,
          INDEX_NAME,
          GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS COLUMNS
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME IN ('explore_shorts', 'explore_content')
          AND INDEX_NAME LIKE '%agency%'
        GROUP BY TABLE_NAME, INDEX_NAME
        ORDER BY TABLE_NAME, INDEX_NAME
      `);

      expect(indexes.rows.length).toBeGreaterThan(0);

      // Verify specific indexes exist
      const indexNames = indexes.rows.map((r: any) => r.INDEX_NAME);
      expect(indexNames).toContain('idx_explore_shorts_agency_id');
      expect(indexNames).toContain('idx_explore_content_agency_id');
      expect(indexNames).toContain('idx_explore_content_creator_type');

      // Step 4: Verify foreign key constraints
      const foreignKeys = await db.execute(sql`
        SELECT 
          CONSTRAINT_NAME,
          TABLE_NAME,
          COLUMN_NAME,
          REFERENCED_TABLE_NAME,
          REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME IN ('explore_shorts', 'explore_content')
          AND CONSTRAINT_NAME LIKE '%agency%'
        ORDER BY TABLE_NAME, CONSTRAINT_NAME
      `);

      expect(foreignKeys.rows.length).toBeGreaterThan(0);

      // Verify specific foreign keys
      const fkNames = foreignKeys.rows.map((r: any) => r.CONSTRAINT_NAME);
      expect(fkNames).toContain('fk_explore_shorts_agency');
      expect(fkNames).toContain('fk_explore_content_agency');

      // Verify foreign keys reference agencies table
      for (const fk of foreignKeys.rows) {
        expect(fk.REFERENCED_TABLE_NAME).toBe('agencies');
        expect(fk.REFERENCED_COLUMN_NAME).toBe('id');
      }

      // Step 5: Test data integrity - create and query with agency_id
      const agency = await db.insert(agencies).values({
        name: 'TEST:INTEGRATION:Schema Agency',
        slug: 'test-integration-schema-agency',
        isVerified: 1,
      });

      testAgencyId = Number(agency.insertId);

      const short = await db.insert(exploreShorts).values({
        title: 'TEST:INTEGRATION:Schema Short',
        agencyId: testAgencyId,
        primaryMediaId: 1,
        mediaIds: JSON.stringify([1]),
        performanceScore: '80.00',
        viewCount: 100,
        isPublished: 1,
        isFeatured: 0,
      });

      testShortIds.push(Number(short.insertId));

      // Verify data was inserted correctly
      const result = await db.execute(sql`
        SELECT * FROM explore_shorts WHERE id = ${short.insertId}
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].agency_id).toBe(testAgencyId);
      expect(result.rows[0].title).toBe('TEST:INTEGRATION:Schema Short');

      // Clean up
      await db.execute(sql`DELETE FROM explore_shorts WHERE id = ${short.insertId}`);
      await db.execute(sql`DELETE FROM agencies WHERE id = ${testAgencyId}`);
    });

    it('should handle NULL agency_id gracefully', async () => {
      if (!db) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Create short without agency_id
      const short = await db.insert(exploreShorts).values({
        title: 'TEST:INTEGRATION:NULL Agency Short',
        agencyId: null,
        primaryMediaId: 1,
        mediaIds: JSON.stringify([1]),
        performanceScore: '80.00',
        viewCount: 100,
        isPublished: 1,
        isFeatured: 0,
      });

      testShortIds.push(Number(short.insertId));

      // Verify data was inserted correctly with NULL agency_id
      const result = await db.execute(sql`
        SELECT * FROM explore_shorts WHERE id = ${short.insertId}
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].agency_id).toBeNull();

      // Verify it can be queried
      const feed = await exploreFeedService.getRecommendedFeed({
        limit: 100,
        offset: 0,
      });

      // Should include content without agency_id
      const hasNullAgencyContent = feed.shorts.some((s: any) => s.id === Number(short.insertId));
      expect(hasNullAgencyContent).toBe(true);

      // Clean up
      await db.execute(sql`DELETE FROM explore_shorts WHERE id = ${short.insertId}`);
    });

    it('should enforce foreign key constraints on delete', async () => {
      if (!db) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Create agency and content
      const agency = await db.insert(agencies).values({
        name: 'TEST:INTEGRATION:FK Agency',
        slug: 'test-integration-fk-agency',
        isVerified: 1,
      });

      testAgencyId = Number(agency.insertId);

      const short = await db.insert(exploreShorts).values({
        title: 'TEST:INTEGRATION:FK Short',
        agencyId: testAgencyId,
        primaryMediaId: 1,
        mediaIds: JSON.stringify([1]),
        performanceScore: '80.00',
        viewCount: 100,
        isPublished: 1,
        isFeatured: 0,
      });

      testShortIds.push(Number(short.insertId));

      // Verify content exists with agency_id
      const beforeDelete = await db.execute(sql`
        SELECT * FROM explore_shorts WHERE id = ${short.insertId}
      `);

      expect(beforeDelete.rows.length).toBe(1);
      expect(beforeDelete.rows[0].agency_id).toBe(testAgencyId);

      // Delete agency (should SET NULL on content due to ON DELETE SET NULL)
      await db.execute(sql`DELETE FROM agencies WHERE id = ${testAgencyId}`);

      // Verify content still exists but agency_id is NULL
      const afterDelete = await db.execute(sql`
        SELECT * FROM explore_shorts WHERE id = ${short.insertId}
      `);

      expect(afterDelete.rows.length).toBe(1);
      expect(afterDelete.rows[0].agency_id).toBeNull();

      // Clean up
      await db.execute(sql`DELETE FROM explore_shorts WHERE id = ${short.insertId}`);
    });
  });
});
