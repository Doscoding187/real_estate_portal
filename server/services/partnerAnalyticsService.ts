/**
 * Partner Analytics Service (BOOT-SAFE)
 *
 * IMPORTANT:
 * - Do NOT import missing Drizzle exports like exploreShorts / contentTopics.
 * - Use raw SQL against MySQL/TiDB tables instead.
 * - If tables/columns differ, we fail "softly" and return safe defaults.
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

type TrendPoint = { date: string; views: number; engagements: number; leads: number };

function safeNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toISODate(d: Date): string {
  // YYYY-MM-DD
  return d.toISOString().slice(0, 10);
}

export const partnerAnalyticsService = {
  /**
   * Requirement 13.1
   * Summary: total views, engagement rate, lead conversions
   */
  async getPartnerAnalyticsSummary(partnerId: string, start?: Date, end?: Date) {
    try {
      const startDate = start ? toISODate(start) : null;
      const endDate = end ? toISODate(end) : null;

      // Explore content (views + engagement_score) best-effort
      const contentRows = await db.execute(sql`
        SELECT
          COALESCE(SUM(ec.view_count), 0) AS totalViews,
          COALESCE(SUM(ec.engagement_score), 0) AS totalEngagementScore,
          COALESCE(COUNT(*), 0) AS totalContent
        FROM explore_content ec
        WHERE (
          ec.creator_id = ${partnerId}
          OR ec.agency_id = ${partnerId}
        )
        ${startDate ? sql`AND DATE(ec.created_at) >= ${startDate}` : sql``}
        ${endDate ? sql`AND DATE(ec.created_at) <= ${endDate}` : sql``}
      `);

      const row: any = (contentRows as any)?.rows?.[0] ?? {};
      const totalViews = safeNumber(row.totalViews);
      const totalEngagementScore = safeNumber(row.totalEngagementScore);

      // Engagement rate is "score per view" as a rough metric (boot-safe)
      const engagementRate = totalViews > 0 ? Math.round((totalEngagementScore / totalViews) * 10000) / 100 : 0;

      // Leads (best-effort) from partner_leads if it exists
      let totalLeads = 0;
      try {
        const leadsRows = await db.execute(sql`
          SELECT COALESCE(COUNT(*), 0) AS totalLeads
          FROM partner_leads pl
          WHERE pl.partner_id = ${partnerId}
          ${startDate ? sql`AND DATE(pl.created_at) >= ${startDate}` : sql``}
          ${endDate ? sql`AND DATE(pl.created_at) <= ${endDate}` : sql``}
        `);
        totalLeads = safeNumber((leadsRows as any)?.rows?.[0]?.totalLeads);
      } catch {
        totalLeads = 0;
      }

      return {
        partnerId,
        totalViews,
        engagementRate,
        totalLeads,
      };
    } catch (err) {
      console.warn('[partnerAnalyticsService] getPartnerAnalyticsSummary fallback:', (err as any)?.message);
      return { partnerId, totalViews: 0, engagementRate: 0, totalLeads: 0 };
    }
  },

  /**
   * Requirement 13.2
   * Trends over time (daily/weekly/monthly)
   */
  async getPerformanceTrends(
    partnerId: string,
    period: 'daily' | 'weekly' | 'monthly',
    start: Date,
    end: Date,
  ): Promise<TrendPoint[]> {
    try {
      const startDate = toISODate(start);
      const endDate = toISODate(end);

      // Grouping key depending on period (MySQL/TiDB)
      const bucket =
        period === 'monthly'
          ? sql`DATE_FORMAT(ec.created_at, '%Y-%m-01')`
          : period === 'weekly'
            ? sql`STR_TO_DATE(CONCAT(YEAR(ec.created_at), '-', LPAD(WEEK(ec.created_at, 1), 2, '0'), '-1'), '%X-%V-%w')`
            : sql`DATE(ec.created_at)`;

      const rows = await db.execute(sql`
        SELECT
          ${bucket} AS bucketDate,
          COALESCE(SUM(ec.view_count), 0) AS views,
          COALESCE(SUM(ec.engagement_score), 0) AS engagements
        FROM explore_content ec
        WHERE (
          ec.creator_id = ${partnerId}
          OR ec.agency_id = ${partnerId}
        )
        AND DATE(ec.created_at) >= ${startDate}
        AND DATE(ec.created_at) <= ${endDate}
        GROUP BY bucketDate
        ORDER BY bucketDate ASC
      `);

      const out: TrendPoint[] = ((rows as any)?.rows ?? []).map((r: any) => ({
        date: String(r.bucketDate).slice(0, 10),
        views: safeNumber(r.views),
        engagements: safeNumber(r.engagements),
        leads: 0, // optional table, keep 0 boot-safe
      }));

      return out;
    } catch (err) {
      console.warn('[partnerAnalyticsService] getPerformanceTrends fallback:', (err as any)?.message);
      return [];
    }
  },

  /**
   * Requirement 13.3
   * Top content ranked by engagement
   */
  async getContentRankedByPerformance(partnerId: string, limit: number = 10) {
    try {
      const rows = await db.execute(sql`
        SELECT
          ec.id,
          ec.title,
          ec.thumbnail_url AS thumbnailUrl,
          ec.video_url AS videoUrl,
          ec.view_count AS viewCount,
          ec.engagement_score AS engagementScore,
          ec.created_at AS createdAt
        FROM explore_content ec
        WHERE (
          ec.creator_id = ${partnerId}
          OR ec.agency_id = ${partnerId}
        )
        ORDER BY ec.engagement_score DESC, ec.view_count DESC, ec.created_at DESC
        LIMIT ${limit}
      `);

      return (rows as any)?.rows ?? [];
    } catch (err) {
      console.warn('[partnerAnalyticsService] getContentRankedByPerformance fallback:', (err as any)?.message);
      return [];
    }
  },

  /**
   * Requirement 13.4
   * Funnel: view → engagement → lead
   */
  async getConversionFunnel(partnerId: string, start?: Date, end?: Date) {
    try {
      const startDate = start ? toISODate(start) : null;
      const endDate = end ? toISODate(end) : null;

      const contentRows = await db.execute(sql`
        SELECT
          COALESCE(SUM(ec.view_count), 0) AS views,
          COALESCE(SUM(ec.engagement_score), 0) AS engagements
        FROM explore_content ec
        WHERE (
          ec.creator_id = ${partnerId}
          OR ec.agency_id = ${partnerId}
        )
        ${startDate ? sql`AND DATE(ec.created_at) >= ${startDate}` : sql``}
        ${endDate ? sql`AND DATE(ec.created_at) <= ${endDate}` : sql``}
      `);

      const row: any = (contentRows as any)?.rows?.[0] ?? {};
      const views = safeNumber(row.views);
      const engagements = safeNumber(row.engagements);

      let leads = 0;
      try {
        const leadsRows = await db.execute(sql`
          SELECT COALESCE(COUNT(*), 0) AS leads
          FROM partner_leads pl
          WHERE pl.partner_id = ${partnerId}
          ${startDate ? sql`AND DATE(pl.created_at) >= ${startDate}` : sql``}
          ${endDate ? sql`AND DATE(pl.created_at) <= ${endDate}` : sql``}
        `);
        leads = safeNumber((leadsRows as any)?.rows?.[0]?.leads);
      } catch {
        leads = 0;
      }

      return { partnerId, views, engagements, leads };
    } catch (err) {
      console.warn('[partnerAnalyticsService] getConversionFunnel fallback:', (err as any)?.message);
      return { partnerId, views: 0, engagements: 0, leads: 0 };
    }
  },

  /**
   * Requirement 13.5
   * Tier benchmarks (boot-safe stub)
   */
  async getTierBenchmarks() {
    return [];
  },

  /**
   * Requirement 13.6
   * Boost ROI (boot-safe stub)
   */
  async getBoostCampaignROI(_partnerId: string) {
    return [];
  },
};

