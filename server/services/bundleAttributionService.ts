/**
 * Bundle Attribution Service
 * 
 * Tracks user engagements with bundle partners to measure bundle effectiveness
 * and attribute conversions back to the bundle that introduced the partner.
 * 
 * Key Features:
 * - Track bundle views and partner clicks
 * - Track partner profile views from bundles
 * - Track lead generation from bundle partners
 * - Calculate bundle conversion metrics
 * - Generate attribution reports
 * 
 * Requirements: 12.3
 */

import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface BundleAttribution {
  id: string;
  bundleId: string;
  partnerId: string;
  userId: string;
  eventType: 'bundle_view' | 'partner_click' | 'profile_view' | 'lead_generated' | 'lead_converted';
  contentId?: string;
  leadId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface BundleAttributionMetrics {
  bundleId: string;
  bundleName: string;
  totalViews: number;
  uniqueUsers: number;
  partnerClicks: number;
  profileViews: number;
  leadsGenerated: number;
  leadsConverted: number;
  conversionRate: number;
  partnerBreakdown: PartnerAttributionMetrics[];
}

export interface PartnerAttributionMetrics {
  partnerId: string;
  companyName: string;
  category: string;
  clicks: number;
  profileViews: number;
  leadsGenerated: number;
  leadsConverted: number;
  conversionRate: number;
}

export interface TrackBundleViewInput {
  bundleId: string;
  userId: string;
  metadata?: Record<string, any>;
}

export interface TrackPartnerEngagementInput {
  bundleId: string;
  partnerId: string;
  userId: string;
  eventType: 'partner_click' | 'profile_view';
  contentId?: string;
  metadata?: Record<string, any>;
}

export interface TrackLeadAttributionInput {
  bundleId: string;
  partnerId: string;
  userId: string;
  leadId: string;
  eventType: 'lead_generated' | 'lead_converted';
  metadata?: Record<string, any>;
}

// ============================================================================
// Bundle Attribution Service
// ============================================================================

export class BundleAttributionService {
  /**
   * Track bundle view
   * Records when a user views a bundle page
   */
  async trackBundleView(input: TrackBundleViewInput): Promise<void> {
    const id = uuidv4();
    
    await db.execute(
      `INSERT INTO bundle_attributions 
       (id, bundle_id, user_id, event_type, metadata, created_at)
       VALUES (?, ?, ?, 'bundle_view', ?, NOW())`,
      [
        id,
        input.bundleId,
        input.userId,
        input.metadata ? JSON.stringify(input.metadata) : null
      ]
    );
  }

  /**
   * Track partner engagement from bundle
   * Records when a user clicks on a partner or views their profile from a bundle
   * 
   * Validates: Requirements 12.3
   */
  async trackPartnerEngagement(input: TrackPartnerEngagementInput): Promise<void> {
    const id = uuidv4();
    
    await db.execute(
      `INSERT INTO bundle_attributions 
       (id, bundle_id, partner_id, user_id, event_type, content_id, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        input.bundleId,
        input.partnerId,
        input.userId,
        input.eventType,
        input.contentId || null,
        input.metadata ? JSON.stringify(input.metadata) : null
      ]
    );
  }

  /**
   * Track lead attribution to bundle
   * Records when a lead is generated or converted from a bundle partner
   */
  async trackLeadAttribution(input: TrackLeadAttributionInput): Promise<void> {
    const id = uuidv4();
    
    await db.execute(
      `INSERT INTO bundle_attributions 
       (id, bundle_id, partner_id, user_id, event_type, lead_id, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        input.bundleId,
        input.partnerId,
        input.userId,
        input.eventType,
        input.leadId,
        input.metadata ? JSON.stringify(input.metadata) : null
      ]
    );
  }

  /**
   * Get bundle attribution metrics
   * Calculates comprehensive metrics for a bundle
   */
  async getBundleMetrics(bundleId: string): Promise<BundleAttributionMetrics | null> {
    // Get bundle info
    const bundleResult = await db.execute(
      `SELECT id, name FROM marketplace_bundles WHERE id = ?`,
      [bundleId]
    );

    if ((bundleResult.rows as any[]).length === 0) {
      return null;
    }

    const bundle = (bundleResult.rows as any[])[0];

    // Get overall metrics
    const metricsResult = await db.execute(
      `SELECT 
         COUNT(CASE WHEN event_type = 'bundle_view' THEN 1 END) as totalViews,
         COUNT(DISTINCT CASE WHEN event_type = 'bundle_view' THEN user_id END) as uniqueUsers,
         COUNT(CASE WHEN event_type = 'partner_click' THEN 1 END) as partnerClicks,
         COUNT(CASE WHEN event_type = 'profile_view' THEN 1 END) as profileViews,
         COUNT(CASE WHEN event_type = 'lead_generated' THEN 1 END) as leadsGenerated,
         COUNT(CASE WHEN event_type = 'lead_converted' THEN 1 END) as leadsConverted
       FROM bundle_attributions
       WHERE bundle_id = ?`,
      [bundleId]
    );

    const metrics = (metricsResult.rows as any[])[0];

    // Calculate conversion rate
    const conversionRate = metrics.leadsGenerated > 0
      ? (metrics.leadsConverted / metrics.leadsGenerated) * 100
      : 0;

    // Get partner breakdown
    const partnerBreakdown = await this.getPartnerBreakdown(bundleId);

    return {
      bundleId,
      bundleName: bundle.name,
      totalViews: parseInt(metrics.totalViews) || 0,
      uniqueUsers: parseInt(metrics.uniqueUsers) || 0,
      partnerClicks: parseInt(metrics.partnerClicks) || 0,
      profileViews: parseInt(metrics.profileViews) || 0,
      leadsGenerated: parseInt(metrics.leadsGenerated) || 0,
      leadsConverted: parseInt(metrics.leadsConverted) || 0,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      partnerBreakdown
    };
  }

  /**
   * Get partner attribution breakdown for a bundle
   */
  private async getPartnerBreakdown(bundleId: string): Promise<PartnerAttributionMetrics[]> {
    const result = await db.execute(
      `SELECT 
         ba.partner_id as partnerId,
         p.company_name as companyName,
         bp.category,
         COUNT(CASE WHEN ba.event_type = 'partner_click' THEN 1 END) as clicks,
         COUNT(CASE WHEN ba.event_type = 'profile_view' THEN 1 END) as profileViews,
         COUNT(CASE WHEN ba.event_type = 'lead_generated' THEN 1 END) as leadsGenerated,
         COUNT(CASE WHEN ba.event_type = 'lead_converted' THEN 1 END) as leadsConverted
       FROM bundle_attributions ba
       INNER JOIN explore_partners p ON ba.partner_id = p.id
       INNER JOIN bundle_partners bp ON ba.bundle_id = bp.bundle_id AND ba.partner_id = bp.partner_id
       WHERE ba.bundle_id = ? AND ba.partner_id IS NOT NULL
       GROUP BY ba.partner_id, p.company_name, bp.category
       ORDER BY clicks DESC`,
      [bundleId]
    );

    return (result.rows as any[]).map(row => {
      const leadsGenerated = parseInt(row.leadsGenerated) || 0;
      const leadsConverted = parseInt(row.leadsConverted) || 0;
      const conversionRate = leadsGenerated > 0
        ? (leadsConverted / leadsGenerated) * 100
        : 0;

      return {
        partnerId: row.partnerId,
        companyName: row.companyName,
        category: row.category,
        clicks: parseInt(row.clicks) || 0,
        profileViews: parseInt(row.profileViews) || 0,
        leadsGenerated,
        leadsConverted,
        conversionRate: parseFloat(conversionRate.toFixed(2))
      };
    });
  }

  /**
   * Get partner metrics across all bundles
   */
  async getPartnerMetricsAcrossBundles(partnerId: string): Promise<{
    totalBundles: number;
    totalClicks: number;
    totalProfileViews: number;
    totalLeadsGenerated: number;
    totalLeadsConverted: number;
    conversionRate: number;
    bundleBreakdown: Array<{
      bundleId: string;
      bundleName: string;
      clicks: number;
      leadsGenerated: number;
    }>;
  }> {
    // Get overall metrics
    const metricsResult = await db.execute(
      `SELECT 
         COUNT(DISTINCT bundle_id) as totalBundles,
         COUNT(CASE WHEN event_type = 'partner_click' THEN 1 END) as totalClicks,
         COUNT(CASE WHEN event_type = 'profile_view' THEN 1 END) as totalProfileViews,
         COUNT(CASE WHEN event_type = 'lead_generated' THEN 1 END) as totalLeadsGenerated,
         COUNT(CASE WHEN event_type = 'lead_converted' THEN 1 END) as totalLeadsConverted
       FROM bundle_attributions
       WHERE partner_id = ?`,
      [partnerId]
    );

    const metrics = (metricsResult.rows as any[])[0];
    const leadsGenerated = parseInt(metrics.totalLeadsGenerated) || 0;
    const leadsConverted = parseInt(metrics.totalLeadsConverted) || 0;
    const conversionRate = leadsGenerated > 0
      ? (leadsConverted / leadsGenerated) * 100
      : 0;

    // Get bundle breakdown
    const bundleResult = await db.execute(
      `SELECT 
         ba.bundle_id as bundleId,
         mb.name as bundleName,
         COUNT(CASE WHEN ba.event_type = 'partner_click' THEN 1 END) as clicks,
         COUNT(CASE WHEN ba.event_type = 'lead_generated' THEN 1 END) as leadsGenerated
       FROM bundle_attributions ba
       INNER JOIN marketplace_bundles mb ON ba.bundle_id = mb.id
       WHERE ba.partner_id = ?
       GROUP BY ba.bundle_id, mb.name
       ORDER BY clicks DESC`,
      [partnerId]
    );

    const bundleBreakdown = (bundleResult.rows as any[]).map(row => ({
      bundleId: row.bundleId,
      bundleName: row.bundleName,
      clicks: parseInt(row.clicks) || 0,
      leadsGenerated: parseInt(row.leadsGenerated) || 0
    }));

    return {
      totalBundles: parseInt(metrics.totalBundles) || 0,
      totalClicks: parseInt(metrics.totalClicks) || 0,
      totalProfileViews: parseInt(metrics.totalProfileViews) || 0,
      totalLeadsGenerated: leadsGenerated,
      totalLeadsConverted: leadsConverted,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      bundleBreakdown
    };
  }

  /**
   * Get user's bundle engagement history
   */
  async getUserBundleHistory(userId: string): Promise<Array<{
    bundleId: string;
    bundleName: string;
    viewedAt: Date;
    partnersEngaged: number;
    leadsGenerated: number;
  }>> {
    const result = await db.execute(
      `SELECT 
         ba.bundle_id as bundleId,
         mb.name as bundleName,
         MIN(ba.created_at) as viewedAt,
         COUNT(DISTINCT CASE WHEN ba.event_type IN ('partner_click', 'profile_view') THEN ba.partner_id END) as partnersEngaged,
         COUNT(CASE WHEN ba.event_type = 'lead_generated' THEN 1 END) as leadsGenerated
       FROM bundle_attributions ba
       INNER JOIN marketplace_bundles mb ON ba.bundle_id = mb.id
       WHERE ba.user_id = ?
       GROUP BY ba.bundle_id, mb.name
       ORDER BY viewedAt DESC`,
      [userId]
    );

    return (result.rows as any[]).map(row => ({
      bundleId: row.bundleId,
      bundleName: row.bundleName,
      viewedAt: new Date(row.viewedAt),
      partnersEngaged: parseInt(row.partnersEngaged) || 0,
      leadsGenerated: parseInt(row.leadsGenerated) || 0
    }));
  }

  /**
   * Get top performing bundles by conversion rate
   */
  async getTopPerformingBundles(limit: number = 10): Promise<Array<{
    bundleId: string;
    bundleName: string;
    views: number;
    leadsGenerated: number;
    leadsConverted: number;
    conversionRate: number;
  }>> {
    const result = await db.execute(
      `SELECT 
         ba.bundle_id as bundleId,
         mb.name as bundleName,
         COUNT(CASE WHEN ba.event_type = 'bundle_view' THEN 1 END) as views,
         COUNT(CASE WHEN ba.event_type = 'lead_generated' THEN 1 END) as leadsGenerated,
         COUNT(CASE WHEN ba.event_type = 'lead_converted' THEN 1 END) as leadsConverted
       FROM bundle_attributions ba
       INNER JOIN marketplace_bundles mb ON ba.bundle_id = mb.id
       GROUP BY ba.bundle_id, mb.name
       HAVING leadsGenerated > 0
       ORDER BY (leadsConverted / leadsGenerated) DESC
       LIMIT ?`,
      [limit]
    );

    return (result.rows as any[]).map(row => {
      const leadsGenerated = parseInt(row.leadsGenerated) || 0;
      const leadsConverted = parseInt(row.leadsConverted) || 0;
      const conversionRate = leadsGenerated > 0
        ? (leadsConverted / leadsGenerated) * 100
        : 0;

      return {
        bundleId: row.bundleId,
        bundleName: row.bundleName,
        views: parseInt(row.views) || 0,
        leadsGenerated,
        leadsConverted,
        conversionRate: parseFloat(conversionRate.toFixed(2))
      };
    });
  }

  /**
   * Delete attribution data for a bundle
   * Used when a bundle is deleted
   */
  async deleteBundleAttributions(bundleId: string): Promise<void> {
    await db.execute(
      `DELETE FROM bundle_attributions WHERE bundle_id = ?`,
      [bundleId]
    );
  }

  /**
   * Delete attribution data for a partner
   * Used when a partner is removed from the system
   */
  async deletePartnerAttributions(partnerId: string): Promise<void> {
    await db.execute(
      `DELETE FROM bundle_attributions WHERE partner_id = ?`,
      [partnerId]
    );
  }
}

// Export singleton instance
export const bundleAttributionService = new BundleAttributionService();
