import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { getDb } from '../db';
import { exploreContent, exploreEngagements } from '../../drizzle/schema';

type ReportDb = Awaited<ReturnType<typeof getDb>>;

export interface DiscoveryOpsMetricPoint {
  key: string;
  label: string;
  count: number;
}

export interface DiscoveryOpsTrendPoint {
  day: string;
  count: number;
}

export interface DiscoveryOpsHealthAlert {
  contentId: number;
  title: string;
  contentType: string;
  creatorType: string;
  issues: string[];
  createdAt: string | null;
  isFeatured: boolean;
}

export interface DiscoveryOpsReport {
  summary: {
    activeContent: number;
    activeCreators: number;
    featuredContent: number;
    videosReady: number;
    engagementEvents7d: number;
    completionRate7d: number;
    saveRate7d: number;
    shareRate7d: number;
  };
  inventoryByContentType: DiscoveryOpsMetricPoint[];
  inventoryByCreatorType: DiscoveryOpsMetricPoint[];
  engagementByAction7d: DiscoveryOpsMetricPoint[];
  publishingTrend14d: DiscoveryOpsTrendPoint[];
  health: {
    missingThumbnail: number;
    missingVideo: number;
    missingTitle: number;
    featuredWithoutMedia: number;
  };
  healthAlerts: DiscoveryOpsHealthAlert[];
}

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asDateLabel(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const parsed = new Date(String(value || ''));
  return Number.isNaN(parsed.getTime()) ? String(value || '') : parsed.toISOString().slice(0, 10);
}

function buildIssues(row: {
  title: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  isFeatured: number | null;
}): string[] {
  const issues: string[] = [];

  if (!String(row.title || '').trim()) issues.push('Missing title');
  if (!String(row.thumbnailUrl || '').trim()) issues.push('Missing thumbnail');
  if (!String(row.videoUrl || '').trim()) issues.push('Missing video');
  if (Number(row.isFeatured || 0) === 1 && !String(row.thumbnailUrl || row.videoUrl || '').trim()) {
    issues.push('Featured without media');
  }

  return issues;
}

export async function buildDiscoveryOpsReport(db: NonNullable<ReportDb>): Promise<DiscoveryOpsReport> {
  const activeContentRows = await db
    .select({
      activeContent: sql<number>`count(*)`,
      activeCreators: sql<number>`count(distinct ${exploreContent.creatorId})`,
      featuredContent: sql<number>`sum(case when ${exploreContent.isFeatured} = 1 then 1 else 0 end)`,
      videosReady: sql<number>`sum(case when ${exploreContent.videoUrl} is not null and ${exploreContent.videoUrl} <> '' then 1 else 0 end)`,
    })
    .from(exploreContent)
    .where(eq(exploreContent.isActive, 1));

  const inventoryByContentTypeRows = await db
    .select({
      key: exploreContent.contentType,
      count: sql<number>`count(*)`,
    })
    .from(exploreContent)
    .where(eq(exploreContent.isActive, 1))
    .groupBy(exploreContent.contentType)
    .orderBy(desc(sql`count(*)`));

  const inventoryByCreatorTypeRows = await db
    .select({
      key: exploreContent.creatorType,
      count: sql<number>`count(*)`,
    })
    .from(exploreContent)
    .where(eq(exploreContent.isActive, 1))
    .groupBy(exploreContent.creatorType)
    .orderBy(desc(sql`count(*)`));

  const engagementCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const engagementByActionRows = await db
    .select({
      key: exploreEngagements.interactionType,
      count: sql<number>`count(*)`,
    })
    .from(exploreEngagements)
    .where(gte(exploreEngagements.createdAt, engagementCutoff))
    .groupBy(exploreEngagements.interactionType)
    .orderBy(desc(sql`count(*)`));

  const publishingCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const publishingTrendRows = await db
    .select({
      day: sql<string>`date(${exploreContent.createdAt})`,
      count: sql<number>`count(*)`,
    })
    .from(exploreContent)
    .where(and(eq(exploreContent.isActive, 1), gte(exploreContent.createdAt, publishingCutoff)))
    .groupBy(sql`date(${exploreContent.createdAt})`)
    .orderBy(sql`date(${exploreContent.createdAt})`);

  const healthRows = await db
    .select({
      missingThumbnail: sql<number>`sum(case when ${exploreContent.thumbnailUrl} is null or ${exploreContent.thumbnailUrl} = '' then 1 else 0 end)`,
      missingVideo: sql<number>`sum(case when ${exploreContent.videoUrl} is null or ${exploreContent.videoUrl} = '' then 1 else 0 end)`,
      missingTitle: sql<number>`sum(case when ${exploreContent.title} is null or ${exploreContent.title} = '' then 1 else 0 end)`,
      featuredWithoutMedia: sql<number>`sum(case when ${exploreContent.isFeatured} = 1 and ((${exploreContent.thumbnailUrl} is null or ${exploreContent.thumbnailUrl} = '') and (${exploreContent.videoUrl} is null or ${exploreContent.videoUrl} = '')) then 1 else 0 end)`,
    })
    .from(exploreContent)
    .where(eq(exploreContent.isActive, 1));

  const healthAlertRows = await db
    .select({
      contentId: exploreContent.id,
      title: exploreContent.title,
      contentType: exploreContent.contentType,
      creatorType: exploreContent.creatorType,
      thumbnailUrl: exploreContent.thumbnailUrl,
      videoUrl: exploreContent.videoUrl,
      createdAt: exploreContent.createdAt,
      isFeatured: exploreContent.isFeatured,
    })
    .from(exploreContent)
    .where(
      and(
        eq(exploreContent.isActive, 1),
        sql`(
          ${exploreContent.title} is null or ${exploreContent.title} = '' or
          ${exploreContent.thumbnailUrl} is null or ${exploreContent.thumbnailUrl} = '' or
          ${exploreContent.videoUrl} is null or ${exploreContent.videoUrl} = ''
        )`,
      ),
    )
    .orderBy(desc(exploreContent.createdAt))
    .limit(12);

  const summaryRow = activeContentRows[0] ?? {
    activeContent: 0,
    activeCreators: 0,
    featuredContent: 0,
    videosReady: 0,
  };
  const healthRow = healthRows[0] ?? {
    missingThumbnail: 0,
    missingVideo: 0,
    missingTitle: 0,
    featuredWithoutMedia: 0,
  };

  const engagementByAction7d = engagementByActionRows.map(row => ({
    key: String(row.key || 'unknown'),
    label: String(row.key || 'unknown').replace(/_/g, ' '),
    count: asNumber(row.count),
  }));
  const totalEvents7d = engagementByAction7d.reduce((sum, row) => sum + row.count, 0);
  const views7d = engagementByAction7d.find(row => row.key === 'view')?.count ?? 0;
  const completions7d = engagementByAction7d.find(row => row.key === 'complete')?.count ?? 0;
  const saves7d = engagementByAction7d.find(row => row.key === 'save')?.count ?? 0;
  const shares7d = engagementByAction7d.find(row => row.key === 'share')?.count ?? 0;

  return {
    summary: {
      activeContent: asNumber(summaryRow.activeContent),
      activeCreators: asNumber(summaryRow.activeCreators),
      featuredContent: asNumber(summaryRow.featuredContent),
      videosReady: asNumber(summaryRow.videosReady),
      engagementEvents7d: totalEvents7d,
      completionRate7d: views7d > 0 ? completions7d / views7d : 0,
      saveRate7d: views7d > 0 ? saves7d / views7d : 0,
      shareRate7d: views7d > 0 ? shares7d / views7d : 0,
    },
    inventoryByContentType: inventoryByContentTypeRows.map(row => ({
      key: String(row.key || 'unknown'),
      label: String(row.key || 'unknown'),
      count: asNumber(row.count),
    })),
    inventoryByCreatorType: inventoryByCreatorTypeRows.map(row => ({
      key: String(row.key || 'unknown'),
      label: String(row.key || 'unknown'),
      count: asNumber(row.count),
    })),
    engagementByAction7d,
    publishingTrend14d: publishingTrendRows.map(row => ({
      day: asDateLabel(row.day),
      count: asNumber(row.count),
    })),
    health: {
      missingThumbnail: asNumber(healthRow.missingThumbnail),
      missingVideo: asNumber(healthRow.missingVideo),
      missingTitle: asNumber(healthRow.missingTitle),
      featuredWithoutMedia: asNumber(healthRow.featuredWithoutMedia),
    },
    healthAlerts: healthAlertRows.map(row => ({
      contentId: asNumber(row.contentId),
      title: String(row.title || 'Untitled content'),
      contentType: String(row.contentType || 'unknown'),
      creatorType: String(row.creatorType || 'unknown'),
      issues: buildIssues(row),
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
      isFeatured: Number(row.isFeatured || 0) === 1,
    })),
  };
}

export async function getDiscoveryOpsReport(): Promise<DiscoveryOpsReport> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return buildDiscoveryOpsReport(db);
}
