/**
 * Partner Analytics Service
 * Provides comprehensive analytics for partner content performance
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6
 */

import { db } from '../db';
import {
  explorePartners,
  exploreContent,
  exploreShorts,
  exploreEngagements,
  partnerLeads,
  boostCampaigns,
  partnerTiers,
  contentQualityScores,
} from '../../drizzle/schema';
import { eq, and, gte, lte, sql, desc, count, sum, avg } from 'drizzle-orm';

export interface PartnerAnalyticsSummary {
  totalViews: number;
  engagementRate: number;
  leadConversions: number;
  totalLeads: number;
  totalContent: number;
  averageQualityScore: number;
}

export interface TrendData {
  date: string;
  views: number;
  engagements: number;
  leads: number;
}

export interface ContentPerformance {
  contentId: string;
  title: string;
  type: 'video' | 'card' | 'short';
  views: number;
  engagements: number;
  engagementRate: number;
  qualityScore: number;
  createdAt: Date;
}

export interface ConversionFunnel {
  totalViews: number;
  totalEngagements: number;
  totalLeads: number;
  viewToEngagementRate: number;
  engagementToLeadRate: number;
  overallConversionRate: number;
}

export interface TierBenchmark {
  tierId: number;
  tierName: string;
  averageViews: number;
  averageEngagementRate: number;
  averageLeadConversion: number;
}

export interface BoostROI {
  campaignId: string;
  campaignName: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  leads: number;
  costPerImpression: number;
  costPerClick: number;
  costPerLead: number;
  roi: number;
}

/**
 * Get partner analytics summary
 * Requirement 13.1: Calculate total views, engagement rate, lead conversions
 */
export async function getPartnerAnalyticsSummary(
  partnerId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<PartnerAnalyticsSummary> {
  // Build date filter - convert dates to ISO strings for MySQL timestamp comparison
  const dateFilter =
    startDate && endDate
      ? and(
          gte(exploreEngagements.createdAt, startDate.toISOString()),
          lte(exploreEngagements.createdAt, endDate.toISOString()),
        )
      : undefined;

  // Get all content IDs for this partner
  const partnerContent = await db
    .select({ id: exploreContent.id })
    .from(exploreContent)
    .where(eq(exploreContent.partnerId, partnerId));

  const partnerShorts = await db
    .select({ id: exploreShorts.id })
    .from(exploreShorts)
    .where(eq(exploreShorts.partnerId, partnerId));

  const contentIds = [
    ...partnerContent.map((c: { id: string }) => c.id),
    ...partnerShorts.map((s: { id: number }) => s.id.toString()),
  ];

  if (contentIds.length === 0) {
    return {
      totalViews: 0,
      engagementRate: 0,
      leadConversions: 0,
      totalLeads: 0,
      totalContent: 0,
      averageQualityScore: 0,
    };
  }

  // Get engagement metrics
  const engagementQuery = db
    .select({
      totalViews: count(exploreEngagements.id),
      totalEngagements: sum(
        sql<number>`CASE WHEN ${exploreEngagements.engagementType} IN ('save', 'share', 'click') THEN 1 ELSE 0 END`,
      ),
    })
    .from(exploreEngagements)
    .where(
      and(
        sql`${exploreEngagements.contentId} IN (${sql.join(
          contentIds.map(id => sql`${id}`),
          sql`, `,
        )})`,
        dateFilter,
      ),
    );

  const [engagementData] = await engagementQuery;

  // Get lead metrics
  const leadQuery = db
    .select({
      totalLeads: count(partnerLeads.id),
      convertedLeads: sum(
        sql<number>`CASE WHEN ${partnerLeads.status} = 'converted' THEN 1 ELSE 0 END`,
      ),
    })
    .from(partnerLeads)
    .where(
      and(
        eq(partnerLeads.partnerId, partnerId),
        dateFilter
          ? and(
              gte(partnerLeads.createdAt, startDate!.toISOString()),
              lte(partnerLeads.createdAt, endDate!.toISOString()),
            )
          : undefined,
      ),
    );

  const [leadData] = await leadQuery;

  // Get quality scores
  const qualityQuery = db
    .select({
      avgScore: avg(contentQualityScores.overallScore),
    })
    .from(contentQualityScores)
    .where(
      sql`${contentQualityScores.contentId} IN (${sql.join(
        contentIds.map(id => sql`${id}`),
        sql`, `,
      )})`,
    );

  const [qualityData] = await qualityQuery;

  const totalViews = Number(engagementData?.totalViews || 0);
  const totalEngagements = Number(engagementData?.totalEngagements || 0);
  const engagementRate = totalViews > 0 ? (totalEngagements / totalViews) * 100 : 0;

  return {
    totalViews,
    engagementRate: Math.round(engagementRate * 100) / 100,
    leadConversions: Number(leadData?.convertedLeads || 0),
    totalLeads: Number(leadData?.totalLeads || 0),
    totalContent: contentIds.length,
    averageQualityScore: Number(qualityData?.avgScore || 0),
  };
}

/**
 * Get performance trends over time
 * Requirement 13.2: Show daily, weekly, monthly performance trends
 */
export async function getPerformanceTrends(
  partnerId: string,
  period: 'daily' | 'weekly' | 'monthly',
  startDate: Date,
  endDate: Date,
): Promise<TrendData[]> {
  // Get all content IDs for this partner
  const partnerContent = await db
    .select({ id: exploreContent.id })
    .from(exploreContent)
    .where(eq(exploreContent.partnerId, partnerId));

  const partnerShorts = await db
    .select({ id: exploreShorts.id })
    .from(exploreShorts)
    .where(eq(exploreShorts.partnerId, partnerId));

  const contentIds = [
    ...partnerContent.map((c: { id: string }) => c.id),
    ...partnerShorts.map((s: { id: number }) => s.id.toString()),
  ];

  if (contentIds.length === 0) {
    return [];
  }

  // Determine date grouping format
  const dateFormat = period === 'daily' ? '%Y-%m-%d' : period === 'weekly' ? '%Y-%U' : '%Y-%m';

  // Get engagement trends
  const trendsQuery = await db
    .select({
      date: sql<string>`DATE_FORMAT(${exploreEngagements.createdAt}, ${dateFormat})`,
      views: count(exploreEngagements.id),
      engagements: sum(
        sql<number>`CASE WHEN ${exploreEngagements.engagementType} IN ('save', 'share', 'click') THEN 1 ELSE 0 END`,
      ),
    })
    .from(exploreEngagements)
    .where(
      and(
        sql`${exploreEngagements.contentId} IN (${sql.join(
          contentIds.map(id => sql`${id}`),
          sql`, `,
        )})`,
        gte(exploreEngagements.createdAt, startDate.toISOString()),
        lte(exploreEngagements.createdAt, endDate.toISOString()),
      ),
    )
    .groupBy(sql`DATE_FORMAT(${exploreEngagements.createdAt}, ${dateFormat})`);

  // Get lead trends
  const leadTrendsQuery = await db
    .select({
      date: sql<string>`DATE_FORMAT(${partnerLeads.createdAt}, ${dateFormat})`,
      leads: count(partnerLeads.id),
    })
    .from(partnerLeads)
    .where(
      and(
        eq(partnerLeads.partnerId, partnerId),
        gte(partnerLeads.createdAt, startDate.toISOString()),
        lte(partnerLeads.createdAt, endDate.toISOString()),
      ),
    )
    .groupBy(sql`DATE_FORMAT(${partnerLeads.createdAt}, ${dateFormat})`);

  // Merge engagement and lead trends
  const leadMap = new Map(
    leadTrendsQuery.map((l: { date: string; leads: number }) => [l.date, Number(l.leads)]),
  );

  return trendsQuery.map((trend: { date: string; views: number; engagements: number | null }) => ({
    date: trend.date,
    views: Number(trend.views),
    engagements: Number(trend.engagements || 0),
    leads: leadMap.get(trend.date) || 0,
  }));
}

/**
 * Get content ranked by performance
 * Requirement 13.3: Rank partner's content pieces by engagement
 */
export async function getContentRankedByPerformance(
  partnerId: string,
  limit: number = 10,
): Promise<ContentPerformance[]> {
  // Get content with engagement metrics
  const contentPerformance = await db
    .select({
      contentId: exploreContent.id,
      title: exploreContent.title,
      type: sql<'video' | 'card' | 'short'>`'card'`,
      createdAt: exploreContent.createdAt,
      views: count(exploreEngagements.id),
      engagements: sum(
        sql<number>`CASE WHEN ${exploreEngagements.engagementType} IN ('save', 'share', 'click') THEN 1 ELSE 0 END`,
      ),
      qualityScore: contentQualityScores.overallScore,
    })
    .from(exploreContent)
    .leftJoin(exploreEngagements, eq(exploreContent.id, exploreEngagements.contentId))
    .leftJoin(contentQualityScores, eq(exploreContent.id, contentQualityScores.contentId))
    .where(eq(exploreContent.partnerId, partnerId))
    .groupBy(
      exploreContent.id,
      exploreContent.title,
      exploreContent.createdAt,
      contentQualityScores.overallScore,
    )
    .orderBy(desc(count(exploreEngagements.id)))
    .limit(limit);

  // Get shorts with engagement metrics
  const shortsPerformance = await db
    .select({
      contentId: sql<string>`CAST(${exploreShorts.id} AS CHAR)`,
      title: exploreShorts.title,
      type: sql<'video' | 'card' | 'short'>`'short'`,
      createdAt: exploreShorts.createdAt,
      views: count(exploreEngagements.id),
      engagements: sum(
        sql<number>`CASE WHEN ${exploreEngagements.engagementType} IN ('save', 'share', 'click') THEN 1 ELSE 0 END`,
      ),
      qualityScore: contentQualityScores.overallScore,
    })
    .from(exploreShorts)
    .leftJoin(
      exploreEngagements,
      sql`CAST(${exploreShorts.id} AS CHAR) = ${exploreEngagements.contentId}`,
    )
    .leftJoin(
      contentQualityScores,
      sql`CAST(${exploreShorts.id} AS CHAR) = ${contentQualityScores.contentId}`,
    )
    .where(eq(exploreShorts.partnerId, partnerId))
    .groupBy(
      exploreShorts.id,
      exploreShorts.title,
      exploreShorts.createdAt,
      contentQualityScores.overallScore,
    )
    .orderBy(desc(count(exploreEngagements.id)))
    .limit(limit);

  // Combine and sort
  const allContent = [...contentPerformance, ...shortsPerformance]
    .map(item => {
      const views = Number(item.views || 0);
      const engagements = Number(item.engagements || 0);
      return {
        contentId: item.contentId,
        title: item.title || 'Untitled',
        type: item.type,
        views,
        engagements,
        engagementRate: views > 0 ? (engagements / views) * 100 : 0,
        qualityScore: Number(item.qualityScore || 0),
        createdAt: item.createdAt,
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);

  return allContent;
}

/**
 * Get conversion funnel analytics
 * Requirement 13.4: Track view → engagement → lead funnel
 */
export async function getConversionFunnel(
  partnerId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<ConversionFunnel> {
  const summary = await getPartnerAnalyticsSummary(partnerId, startDate, endDate);

  const viewToEngagementRate = summary.totalViews > 0 ? summary.engagementRate / 100 : 0;

  const totalEngagements = Math.round(summary.totalViews * viewToEngagementRate);

  const engagementToLeadRate =
    totalEngagements > 0 ? (summary.totalLeads / totalEngagements) * 100 : 0;

  const overallConversionRate =
    summary.totalViews > 0 ? (summary.totalLeads / summary.totalViews) * 100 : 0;

  return {
    totalViews: summary.totalViews,
    totalEngagements,
    totalLeads: summary.totalLeads,
    viewToEngagementRate: Math.round(viewToEngagementRate * 10000) / 100,
    engagementToLeadRate: Math.round(engagementToLeadRate * 100) / 100,
    overallConversionRate: Math.round(overallConversionRate * 100) / 100,
  };
}

/**
 * Get tier benchmark comparisons
 * Requirement 13.5: Compare partner performance to tier averages
 */
export async function getTierBenchmarks(): Promise<TierBenchmark[]> {
  const benchmarks = await db
    .select({
      tierId: partnerTiers.id,
      tierName: partnerTiers.name,
      partnerCount: count(explorePartners.id),
      totalViews: sum(sql<number>`(
        SELECT COUNT(*) 
        FROM explore_engagements 
        WHERE content_id IN (
          SELECT id FROM explore_content WHERE partner_id = explore_partners.id
          UNION
          SELECT CAST(id AS CHAR) FROM explore_shorts WHERE partner_id = explore_partners.id
        )
      )`),
      totalEngagements: sum(sql<number>`(
        SELECT COUNT(*) 
        FROM explore_engagements 
        WHERE engagement_type IN ('save', 'share', 'click')
        AND content_id IN (
          SELECT id FROM explore_content WHERE partner_id = explore_partners.id
          UNION
          SELECT CAST(id AS CHAR) FROM explore_shorts WHERE partner_id = explore_partners.id
        )
      )`),
      totalLeads: sum(sql<number>`(
        SELECT COUNT(*) 
        FROM partner_leads 
        WHERE partner_id = explore_partners.id 
        AND status = 'converted'
      )`),
    })
    .from(partnerTiers)
    .leftJoin(explorePartners, eq(partnerTiers.id, explorePartners.tierId))
    .groupBy(partnerTiers.id, partnerTiers.name);

  return benchmarks.map((b: any) => {
    const partnerCount = Number(b.partnerCount || 1);
    const avgViews = Number(b.totalViews || 0) / partnerCount;
    const avgEngagements = Number(b.totalEngagements || 0) / partnerCount;
    const avgLeads = Number(b.totalLeads || 0) / partnerCount;
    const avgEngagementRate = avgViews > 0 ? (avgEngagements / avgViews) * 100 : 0;

    return {
      tierId: b.tierId,
      tierName: b.tierName,
      averageViews: Math.round(avgViews),
      averageEngagementRate: Math.round(avgEngagementRate * 100) / 100,
      averageLeadConversion: Math.round(avgLeads),
    };
  });
}

/**
 * Get boost campaign ROI metrics
 * Requirement 13.6: Calculate ROI for each boost campaign
 */
export async function getBoostCampaignROI(partnerId: string): Promise<BoostROI[]> {
  const campaigns = await db
    .select({
      id: boostCampaigns.id,
      contentId: boostCampaigns.contentId,
      budget: boostCampaigns.budget,
      spent: boostCampaigns.spent,
      impressions: boostCampaigns.impressions,
      clicks: boostCampaigns.clicks,
      costPerImpression: boostCampaigns.costPerImpression,
    })
    .from(boostCampaigns)
    .where(eq(boostCampaigns.partnerId, partnerId));

  const roiData: BoostROI[] = [];

  for (const campaign of campaigns) {
    // Get leads generated from this campaign's content
    const [leadData] = await db
      .select({
        leads: count(partnerLeads.id),
      })
      .from(partnerLeads)
      .where(
        and(eq(partnerLeads.partnerId, partnerId), eq(partnerLeads.contentId, campaign.contentId)),
      );

    const leads = Number(leadData?.leads || 0);
    const spent = Number(campaign.spent);
    const impressions = Number(campaign.impressions);
    const clicks = Number(campaign.clicks);

    const costPerClick = clicks > 0 ? spent / clicks : 0;
    const costPerLead = leads > 0 ? spent / leads : 0;

    // Calculate ROI (assuming average lead value of R500)
    const averageLeadValue = 500;
    const revenue = leads * averageLeadValue;
    const roi = spent > 0 ? ((revenue - spent) / spent) * 100 : 0;

    roiData.push({
      campaignId: campaign.id,
      campaignName: `Campaign ${campaign.id}`,
      budget: Number(campaign.budget),
      spent,
      impressions,
      clicks,
      leads,
      costPerImpression: Number(campaign.costPerImpression),
      costPerClick: Math.round(costPerClick * 100) / 100,
      costPerLead: Math.round(costPerLead * 100) / 100,
      roi: Math.round(roi * 100) / 100,
    });
  }

  return roiData;
}

export const partnerAnalyticsService = {
  // Main methods
  getPartnerAnalyticsSummary,
  getPerformanceTrends,
  getContentRankedByPerformance,
  getConversionFunnel,
  getTierBenchmarks,
  getBoostCampaignROI,

  // Aliases for consistency with test expectations
  getPartnerAnalytics: getPartnerAnalyticsSummary,
  getContentRanking: getContentRankedByPerformance,
  getBenchmarkComparison: getTierBenchmarks,
  getBoostROI: getBoostCampaignROI,

  // Additional helper method
  calculateEngagementRate: (views: number, engagements: number): number => {
    return views > 0 ? (engagements / views) * 100 : 0;
  },
};
