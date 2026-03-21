import type { FeedType } from '../../../../shared/types';
import { getDb } from '../../../db';
import { exploreContent, listings, developments } from '../../../../drizzle/schema';
import { and, desc, eq, sql } from 'drizzle-orm';

interface CategoryCandidatesOptions {
  category: string;
  limit: number;
  offset: number;
}

interface AreaCandidatesOptions {
  location: string;
  limit: number;
  offset: number;
}

interface RecommendedCandidatesOptions {
  userId?: number;
  limit: number;
  offset: number;
}

export interface DiscoveryCandidateResult {
  items: any[];
  shorts: any[];
  feedType: FeedType;
  hasMore: boolean;
  offset: number;
  metadata?: Record<string, any>;
}

const hasPlayableMedia = sql`
  (
    COALESCE(${exploreContent.videoUrl}, '') <> ''
    OR COALESCE(${exploreContent.thumbnailUrl}, '') <> ''
  )
`;

function normalizeCandidateRow(row: any) {
  if (!row) return row;

  const { isPublished, publishedAt, _reason, ...safeRow } = row;
  const mediaUrls: string[] = [];

  if (safeRow.videoUrl) mediaUrls.push(safeRow.videoUrl);
  if (safeRow.thumbnailUrl) mediaUrls.push(safeRow.thumbnailUrl);

  const metaUrls = safeRow?.metadata?.mediaUrls;
  if (Array.isArray(metaUrls)) {
    mediaUrls.push(...metaUrls.filter((url: unknown) => typeof url === 'string' && url));
  }

  const primaryMediaUrl = safeRow.videoUrl || safeRow.thumbnailUrl || mediaUrls[0] || null;

  return {
    ...safeRow,
    primaryMediaUrl,
    mediaUrls: Array.from(new Set(mediaUrls)),
    rankReason: _reason || null,
    performanceScore: safeRow.engagementScore ?? 0,
  };
}

class DiscoveryLegacyFeedSource {
  async getCategoryCandidates(options: CategoryCandidatesOptions): Promise<DiscoveryCandidateResult> {
    const { category, limit, offset } = options;
    const db = await getDb();
    const cat = category.toLowerCase();

    const rows = await db
      .select({ content: exploreContent })
      .from(exploreContent)
      .where(
        and(
          eq(exploreContent.contentType, 'video'),
          eq(exploreContent.isActive, 1),
          hasPlayableMedia,
          sql`(
            LOWER(COALESCE(${exploreContent.title}, '')) LIKE ${`%${cat}%`}
            OR LOWER(COALESCE(${exploreContent.description}, '')) LIKE ${`%${cat}%`}
          )`,
        ),
      )
      .orderBy(desc(exploreContent.createdAt))
      .limit(limit)
      .offset(offset);

    const items = rows.map((row: any) => normalizeCandidateRow(row.content));

    return {
      items,
      shorts: items,
      feedType: 'category',
      hasMore: rows.length === limit,
      offset: offset + rows.length,
      metadata: { category },
    };
  }

  async getAreaCandidates(options: AreaCandidatesOptions): Promise<DiscoveryCandidateResult> {
    const { location, limit, offset } = options;
    const db = await getDb();
    const loc = location.toLowerCase();

    const rows = await db
      .select({ content: exploreContent })
      .from(exploreContent)
      .leftJoin(listings, eq(exploreContent.referenceId, listings.id))
      .leftJoin(developments, eq(exploreContent.referenceId, developments.id))
      .where(
        and(
          eq(exploreContent.contentType, 'video'),
          eq(exploreContent.isActive, 1),
          hasPlayableMedia,
          sql`(
            LOWER(COALESCE(${listings.city}, '')) LIKE ${`%${loc}%`}
            OR LOWER(COALESCE(${listings.suburb}, '')) LIKE ${`%${loc}%`}
            OR LOWER(COALESCE(${listings.province}, '')) LIKE ${`%${loc}%`}
            OR LOWER(COALESCE(${developments.city}, '')) LIKE ${`%${loc}%`}
            OR LOWER(COALESCE(${developments.province}, '')) LIKE ${`%${loc}%`}
          )`,
        ),
      )
      .orderBy(desc(exploreContent.createdAt))
      .limit(limit)
      .offset(offset);

    const items = rows.map((row: any) => normalizeCandidateRow(row.content));

    return {
      items,
      shorts: items,
      feedType: 'area',
      hasMore: rows.length === limit,
      offset: offset + rows.length,
      metadata: { location },
    };
  }

  async getRecommendedCandidates(
    options: RecommendedCandidatesOptions,
  ): Promise<DiscoveryCandidateResult> {
    const { limit, offset } = options;
    const db = await getDb();

    const rows = await db
      .select()
      .from(exploreContent)
      .where(
        and(
          eq(exploreContent.contentType, 'video'),
          eq(exploreContent.isActive, 1),
          hasPlayableMedia,
        ),
      )
      .orderBy(
        desc(exploreContent.isFeatured),
        sql`(
          (
            COALESCE(${exploreContent.engagementScore}, 0)
            + (COALESCE(${exploreContent.viewCount}, 0) * 0.25)
            + CASE
                WHEN TIMESTAMPDIFF(HOUR, ${exploreContent.createdAt}, NOW()) < 24 THEN 2
                ELSE 0
              END
          )
          * (1 / (1 + (TIMESTAMPDIFF(HOUR, ${exploreContent.createdAt}, NOW()) / 48)))
        ) DESC`,
        desc(exploreContent.createdAt),
        desc(exploreContent.id),
      )
      .limit(limit)
      .offset(offset);

    const items = rows.map((row: any) => normalizeCandidateRow(row));

    return {
      items,
      shorts: items,
      feedType: 'recommended',
      hasMore: rows.length === limit,
      offset: offset + rows.length,
      metadata: {
        personalized: false,
      },
    };
  }
}

export const discoveryLegacyFeedSource = new DiscoveryLegacyFeedSource();
