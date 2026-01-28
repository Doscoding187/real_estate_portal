/**
 * Explore Agency Service
 *
 * Handles agency-level analytics and metrics for the Explore feed.
 * Provides aggregated performance data for agencies and their agents.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import { db } from '../db';
import { exploreShorts, agents } from '../../drizzle/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { cache, CacheKeys, CacheTTL } from '../lib/cache';

/**
 * Agency metrics interface
 * Requirement 3.1, 3.2: Aggregate metrics across all agency content
 */
export interface AgencyMetrics {
  totalContent: number;
  totalViews: number;
  totalEngagements: number;
  averageEngagementRate: number;
  topPerformingContent: any[];
  agentBreakdown: AgentPerformance[];
}

/**
 * Agent performance breakdown interface
 * Requirement 3.4: Enable filtering by agent within agency
 */
export interface AgentPerformance {
  agentId: number;
  agentName: string;
  contentCount: number;
  totalViews: number;
  averagePerformanceScore: number;
}

/**
 * Top performing content interface
 * Requirement 3.3: Show top content by performance
 */
export interface TopContent {
  id: number;
  title: string;
  contentType: string;
  viewCount: number;
  performanceScore: number;
  saveCount: number;
  shareCount: number;
}

export class ExploreAgencyService {
  /**
   * Get comprehensive agency metrics
   * Requirements: 3.1, 3.2, 3.3, 3.4
   *
   * Aggregates all metrics across agency-attributed content including:
   * - Total content count
   * - View counts and engagement metrics
   * - Agent breakdown
   * - Top performing content
   */
  async getAgencyMetrics(agencyId: number): Promise<AgencyMetrics> {
    try {
      // Check cache first
      const cacheKey = `agency:metrics:${agencyId}`;
      const cached = await cache.get<AgencyMetrics>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get all metrics in parallel for performance
      const [metrics, agentBreakdown, topContent] = await Promise.all([
        this.aggregateAgencyMetrics(agencyId),
        this.getAgentBreakdown(agencyId),
        this.getTopPerformingContent(agencyId),
      ]);

      const result: AgencyMetrics = {
        ...metrics,
        agentBreakdown,
        topPerformingContent: topContent,
      };

      // Cache result for 15 minutes
      await cache.set(cacheKey, result, 900);

      return result;
    } catch (error) {
      console.error('Error getting agency metrics:', error);
      throw error;
    }
  }

  /**
   * Aggregate core metrics for an agency
   * Requirements: 3.1, 3.2
   *
   * Queries and aggregates:
   * - Total content count
   * - Total views across all content
   * - Total engagements (saves + shares)
   * - Average engagement rate
   */
  private async aggregateAgencyMetrics(agencyId: number): Promise<{
    totalContent: number;
    totalViews: number;
    totalEngagements: number;
    averageEngagementRate: number;
  }> {
    // Query all agency content with aggregations
    // Includes both directly attributed content and content from agency agents
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as totalContent,
        SUM(es.view_count) as totalViews,
        SUM(es.save_count + es.share_count) as totalEngagements,
        AVG(
          CASE 
            WHEN es.view_count > 0 
            THEN ((es.save_count + es.share_count) / es.view_count) * 100
            ELSE 0
          END
        ) as averageEngagementRate
      FROM explore_shorts es
      LEFT JOIN agents a ON es.agent_id = a.id
      WHERE es.is_published = 1
      AND (
        es.agency_id = ${agencyId}
        OR a.agency_id = ${agencyId}
      )
    `);

    const row = result.rows[0] as any;

    return {
      totalContent: Number(row.totalContent) || 0,
      totalViews: Number(row.totalViews) || 0,
      totalEngagements: Number(row.totalEngagements) || 0,
      averageEngagementRate: Number(row.averageEngagementRate) || 0,
    };
  }

  /**
   * Get agent breakdown analytics
   * Requirement 3.4: Compare performance by agent within agency
   *
   * Returns per-agent metrics including:
   * - Content count
   * - Total views
   * - Average performance score
   * Sorted by performance (views descending)
   */
  async getAgentBreakdown(agencyId: number): Promise<AgentPerformance[]> {
    try {
      // Query content grouped by agent within the agency
      const result = await db.execute(sql`
        SELECT 
          a.id as agentId,
          CONCAT(a.first_name, ' ', a.last_name) as agentName,
          COUNT(es.id) as contentCount,
          SUM(es.view_count) as totalViews,
          AVG(es.performance_score) as averagePerformanceScore
        FROM agents a
        LEFT JOIN explore_shorts es ON es.agent_id = a.id AND es.is_published = 1
        WHERE a.agency_id = ${agencyId}
        GROUP BY a.id, a.first_name, a.last_name
        HAVING contentCount > 0
        ORDER BY totalViews DESC
      `);

      return result.rows.map((row: any) => ({
        agentId: Number(row.agentId),
        agentName: String(row.agentName),
        contentCount: Number(row.contentCount) || 0,
        totalViews: Number(row.totalViews) || 0,
        averagePerformanceScore: Number(row.averagePerformanceScore) || 0,
      }));
    } catch (error) {
      console.error('Error getting agent breakdown:', error);
      throw error;
    }
  }

  /**
   * Get top performing content for an agency
   * Requirement 3.3: Display top content ordered by performance
   *
   * Returns top 10 content items ordered by performance score
   * Includes full content details for display
   */
  async getTopPerformingContent(agencyId: number): Promise<TopContent[]> {
    try {
      // Query agency content ordered by performance score
      // Limit to top 10 items
      const result = await db.execute(sql`
        SELECT 
          es.id,
          es.title,
          es.content_type as contentType,
          es.view_count as viewCount,
          es.performance_score as performanceScore,
          es.save_count as saveCount,
          es.share_count as shareCount
        FROM explore_shorts es
        LEFT JOIN agents a ON es.agent_id = a.id
        WHERE es.is_published = 1
        AND (
          es.agency_id = ${agencyId}
          OR a.agency_id = ${agencyId}
        )
        ORDER BY es.performance_score DESC, es.view_count DESC
        LIMIT 10
      `);

      return result.rows.map((row: any) => ({
        id: Number(row.id),
        title: String(row.title),
        contentType: String(row.contentType),
        viewCount: Number(row.viewCount) || 0,
        performanceScore: Number(row.performanceScore) || 0,
        saveCount: Number(row.saveCount) || 0,
        shareCount: Number(row.shareCount) || 0,
      }));
    } catch (error) {
      console.error('Error getting top performing content:', error);
      throw error;
    }
  }

  /**
   * Invalidate agency metrics cache
   * Should be called when agency content is updated
   */
  async invalidateAgencyCache(agencyId: number): Promise<void> {
    const cacheKey = `agency:metrics:${agencyId}`;
    await cache.del(cacheKey);
  }
}

// Export singleton instance
export const exploreAgencyService = new ExploreAgencyService();
