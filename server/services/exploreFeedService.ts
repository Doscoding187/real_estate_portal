import { db } from '../db';
import { exploreContent, listings, developments } from '../../drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { FeedType } from '../../shared/types';
import { cache, CacheKeys, CacheTTL } from '../lib/cache';

/* ------------------ TYPES ------------------ */

export interface FeedOptions {
  userId?: number;
  limit?: number;
  offset?: number;
  location?: string;
  category?: string;
  agentId?: number;
  developerId?: number;
  agencyId?: number;
  seed?: string;
  seenIds?: number[];
}

export type FeedResult = {
  items: any[];
  shorts: any[];
  feedType: FeedType;
  hasMore: boolean;
  offset: number;
  metadata?: Record<string, any>;
};

/* ------------------ MEDIA GATE ------------------ */

/**
 * ✅ LOCKED MEDIA GATE - Only references real DB columns
 */
const hasPlayableMedia = sql`
  (
    COALESCE(${exploreContent.videoUrl}, '') <> ''
    OR COALESCE(${exploreContent.thumbnailUrl}, '') <> ''
  )
`;

/* ------------------ HELPERS ------------------ */

function transformShort(row: any) {
  if (!row) return row;

  // Strip internal / API-unsafe fields
  const { isPublished, publishedAt, _reason, ...safeRow } = row;

  const mediaUrls: string[] = [];

  if (safeRow.videoUrl) mediaUrls.push(safeRow.videoUrl);
  if (safeRow.thumbnailUrl) mediaUrls.push(safeRow.thumbnailUrl);

  // Only safe runtime fallback: metadata.mediaUrls
  const metaUrls = safeRow?.metadata?.mediaUrls;
  if (Array.isArray(metaUrls)) {
    mediaUrls.push(...metaUrls.filter((u: any) => typeof u === 'string' && u));
  }

  const primaryMediaUrl =
    safeRow.videoUrl || safeRow.thumbnailUrl || mediaUrls[0] || null;

  return {
    ...safeRow,
    primaryMediaUrl,
    mediaUrls: [...new Set(mediaUrls)],
    rankReason: _reason || null,
    performanceScore: safeRow.engagementScore ?? 0,
  };
}

const normalizeSeenIds = (seenIds: unknown, max = 200): number[] => {
  if (!Array.isArray(seenIds)) return [];
  const nums = seenIds
    .map(v => Number(v))
    .filter(n => Number.isFinite(n) && n > 0)
    .slice(0, max);
  return Array.from(new Set(nums));
};

function normalizeSeed(seed?: string | null): string | null {
  const s = (seed ?? '').trim();
  return s.length ? s : null;
}

function seededJitterExpr(seed: string | null) {
  if (!seed) return sql`0`;
  return sql`((CRC32(CONCAT(${seed}, '-', ${exploreContent.id})) % 1000) / 1000.0) * 0.2`;
}

function notInIdsExpr(column: any, ids: number[]) {
  if (!ids.length) return null;
  return sql`${column} NOT IN (${sql.join(
    ids.map(id => sql`${id}`),
    sql`,`,
  )})`;
}

function makeEmptyFeedDebugTag() {
  return `ExploreEmptyFeed:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}

async function logRecommendedEmptyDiagnostics(params: {
  tag: string;
  location?: string;
  seed?: string | null;
  limit: number;
  offset: number;
  baseWhere: any[];
  commonWhere: any[];
  featuredWhere: any[];
  newWhere: any[];
  rankedWhere: any[];
}) {
  const { tag, location, seed, limit, offset, baseWhere, commonWhere, featuredWhere, newWhere, rankedWhere } = params;

  const safeCount = async (q: any) => {
    try {
      const rows = await q;
      return rows?.[0]?.n ?? 0;
    } catch {
      return -1;
    }
  };

  const base = await safeCount(
    db
      .select({ n: sql<number>`COUNT(*)` })
      .from(exploreContent)
      .where(and(...baseWhere))
      .limit(1),
  );

  const mediaGate = await safeCount(
    db
      .select({ n: sql<number>`COUNT(*)` })
      .from(exploreContent)
      .where(and(...commonWhere))
      .limit(1),
  );

  const featured = await safeCount(
    db
      .select({ n: sql<number>`COUNT(*)` })
      .from(exploreContent)
      .where(and(...featuredWhere))
      .limit(1),
  );

  const newest = await safeCount(
    db
      .select({ n: sql<number>`COUNT(*)` })
      .from(exploreContent)
      .where(and(...newWhere))
      .limit(1),
  );

  const ranked = await safeCount(
    db
      .select({ n: sql<number>`COUNT(*)` })
      .from(exploreContent)
      .where(and(...rankedWhere))
      .limit(1),
  );

  let nearYou: number | undefined;
  if (location) {
    nearYou = await safeCount(
      db
        .select({ n: sql<number>`COUNT(DISTINCT ${exploreContent.id})` })
        .from(exploreContent)
        .leftJoin(listings, eq(exploreContent.referenceId, listings.id))
        .where(
          and(
            ...commonWhere,
            sql`(
              COALESCE(${listings.city}, '') = ${location}
              OR COALESCE(${listings.suburb}, '') = ${location}
              OR COALESCE(${listings.province}, '') = ${location}
            )`,
          ),
        )
        .limit(1),
    );
  }

  console.warn('[Explore] EMPTY RECOMMENDED FEED DIAGNOSTICS', {
    tag,
    limit,
    offset,
    location,
    seed,
    counts: {
      base,
      mediaGate,
      featured,
      nearYou,
      new: newest,
      ranked,
    },
  });
}

/* ------------------ SERVICE ------------------ */

export class ExploreFeedService {
  async getRecommendedFeed(options: FeedOptions): Promise<FeedResult> {
    const { userId, limit = 20, offset = 0, location, seed, seenIds } = options;

    const cacheKey = CacheKeys.recommendedFeed(userId, limit, offset);
    const seedNormalized = normalizeSeed(seed);
    const jitter = seededJitterExpr(seedNormalized);
    const normalizedSeenIds = normalizeSeenIds(seenIds);

    const useCache =
      process.env.NODE_ENV === 'production' &&
      !seedNormalized &&
      normalizedSeenIds.length === 0 &&
      !location;

    if (useCache) {
      const cached = await cache.get<FeedResult>(cacheKey);
      if (cached) return cached;
    }

    const debugTag =
      process.env.NODE_ENV !== 'production' ? makeEmptyFeedDebugTag() : null;

    const baseWhere: any[] = [
      eq(exploreContent.contentType, 'video'),
      eq(exploreContent.isActive, 1),
    ];

    const commonBase: any[] = [...baseWhere, hasPlayableMedia];

    // Seen filter
    const notInSeen = notInIdsExpr(exploreContent.id, normalizedSeenIds);
    if (notInSeen) commonBase.push(notInSeen);

    const takeFeatured = Math.min(2, limit);
    const takeNearYou = location ? Math.min(2, Math.max(0, limit - takeFeatured)) : 0;
    const takeNew = Math.min(2, Math.max(0, limit - takeFeatured - takeNearYou));
    const takeRanked = Math.max(0, limit - takeFeatured - takeNearYou - takeNew);

    const featuredWhere = [...commonBase, eq(exploreContent.isFeatured, 1)];

    const featuredRows = takeFeatured
      ? await db
          .select()
          .from(exploreContent)
          .where(and(...featuredWhere))
          .orderBy(desc(exploreContent.createdAt))
          .limit(takeFeatured)
      : [];

    // Near You
    const nearYouWhere: any[] = [...commonBase];

    if (featuredRows.length > 0) {
      nearYouWhere.push(
        sql`${exploreContent.id} NOT IN (${sql.join(
          featuredRows.map(r => sql`${r.id}`),
          sql`,`,
        )})`,
      );
    }

    if (location) {
      nearYouWhere.push(
        sql`(
          COALESCE(${listings.city}, '') = ${location}
          OR COALESCE(${listings.suburb}, '') = ${location}
          OR COALESCE(${listings.province}, '') = ${location}
        )`,
      );
    }

    const nearYouRows =
      takeNearYou && location
        ? await db
            .select({ content: exploreContent })
            .from(exploreContent)
            .leftJoin(listings, eq(exploreContent.referenceId, listings.id))
            .where(and(...nearYouWhere))
            .orderBy(desc(exploreContent.createdAt))
            .limit(takeNearYou)
        : [];

    // New (last 24h)
    const newWhere: any[] = [
      ...commonBase,
      sql`TIMESTAMPDIFF(HOUR, ${exploreContent.createdAt}, NOW()) < 24`,
    ];

    if (featuredRows.length > 0) {
      newWhere.push(
        sql`${exploreContent.id} NOT IN (${sql.join(
          featuredRows.map(r => sql`${r.id}`),
          sql`,`,
        )})`,
      );
    }

    const newRows = takeNew
      ? await db
          .select()
          .from(exploreContent)
          .where(and(...newWhere))
          .orderBy(desc(exploreContent.createdAt))
          .limit(takeNew)
      : [];

    // Exclude IDs already taken
    const excludeIds = Array.from(
      new Set<number>([
        ...featuredRows.map(r => r.id).filter(Boolean),
        ...nearYouRows.map(r => r.content?.id).filter(Boolean),
        ...newRows.map(r => r.id).filter(Boolean),
      ]),
    );

    const notInExclude = notInIdsExpr(exploreContent.id, excludeIds);

    const rankedWhere: any[] = [...commonBase];
    if (notInExclude) rankedWhere.push(notInExclude);

    const rankedRows = takeRanked
      ? await db
          .select()
          .from(exploreContent)
          .where(and(...rankedWhere))
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
              + ${jitter}
            ) DESC`,
            desc(exploreContent.createdAt),
            desc(exploreContent.id),
          )
          .limit(takeRanked)
          .offset(offset)
      : [];

    const merged = [
      ...featuredRows.map(r => ({ ...r, _reason: 'featured' })),
      ...nearYouRows.map(r => ({ ...r.content, _reason: 'near_you' })),
      ...newRows.map(r => ({ ...r, _reason: 'new' })),
      ...rankedRows.map(r => ({ ...r, _reason: 'ranked' })),
    ];

    // Final de-dupe
    const seen = new Set<number>();
    const items = merged
      .filter(v => v?.id && !seen.has(v.id) && (seen.add(v.id), true))
      .map(transformShort)
      .slice(0, limit);

    /* ------------------ DEV DIAGNOSTICS ------------------ */
    if (process.env.NODE_ENV !== 'production' && items.length === 0) {
      console.warn('[Explore] EMPTY RECOMMENDED FEED DEBUG', {
        tag: debugTag,
        takeFeatured,
        takeNearYou,
        takeNew,
        takeRanked,
        counts: {
          featured: featuredRows.length,
          nearYou: nearYouRows.length,
          new: newRows.length,
          ranked: rankedRows.length,
          returned: items.length,
        },
        limit,
        offset,
        seed,
        location,
        excludeIdsCount: excludeIds.length,
      });

      await logRecommendedEmptyDiagnostics({
        tag: debugTag ?? 'n/a',
        location,
        seed: seedNormalized,
        limit,
        offset,
        baseWhere,
        commonWhere: commonBase,
        featuredWhere,
        newWhere,
        rankedWhere,
      });
    }

    const result: FeedResult = {
      items,
      shorts: items,
      feedType: 'recommended',
      hasMore: takeRanked > 0 && rankedRows.length === takeRanked,
      offset: offset + rankedRows.length,
      metadata: {
        personalized: false,
        ...(process.env.NODE_ENV !== 'production' ? { debug: true } : {}),
      },
    };

    if (useCache) await cache.set(cacheKey, result, CacheTTL.FEED);

    return result;
  }

  // ────────────────────────────────────────────────
  // The other feed methods remain unchanged
  // ────────────────────────────────────────────────

  async getAreaFeed({ location, limit = 20, offset = 0 }: FeedOptions): Promise<FeedResult> {
    if (!location) throw new Error('Location required');
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

    const items = rows.map(r => transformShort(r.content));

    if (process.env.NODE_ENV !== 'production' && items.length === 0) {
      console.warn('[Explore] EMPTY AREA FEED DEBUG', {
        location,
        limit,
        offset,
        returned: items.length,
      });
    }

    return {
      items,
      shorts: items,
      feedType: 'area',
      hasMore: rows.length === limit,
      offset: offset + rows.length,
      metadata: { location },
    };
  }

  async getAgentFeed({ agentId, limit = 20, offset = 0 }: FeedOptions): Promise<FeedResult> {
    if (!agentId) throw new Error('Agent ID required');

    const rows = await db
      .select()
      .from(exploreContent)
      .where(
        and(
          eq(exploreContent.contentType, 'video'),
          eq(exploreContent.isActive, 1),
          eq(exploreContent.creatorType, 'agent'),
          eq(exploreContent.creatorId, agentId),
          hasPlayableMedia,
        ),
      )
      .orderBy(desc(exploreContent.createdAt))
      .limit(limit)
      .offset(offset);

    const items = rows.map(transformShort);

    if (process.env.NODE_ENV !== 'production' && items.length === 0) {
      console.warn('[Explore] EMPTY AGENT FEED DEBUG', {
        agentId,
        limit,
        offset,
        returned: items.length,
      });
    }

    return {
      items,
      shorts: items,
      feedType: 'agent',
      hasMore: rows.length === limit,
      offset: offset + rows.length,
      metadata: { agentId },
    };
  }

  async getDeveloperFeed({ developerId, limit = 20, offset = 0 }: FeedOptions): Promise<FeedResult> {
    if (!developerId) throw new Error('Developer ID required');

    const rows = await db
      .select()
      .from(exploreContent)
      .where(
        and(
          eq(exploreContent.contentType, 'video'),
          eq(exploreContent.isActive, 1),
          eq(exploreContent.creatorType, 'developer'),
          eq(exploreContent.creatorId, developerId),
          hasPlayableMedia,
        ),
      )
      .orderBy(desc(exploreContent.createdAt))
      .limit(limit)
      .offset(offset);

    const items = rows.map(transformShort);

    if (process.env.NODE_ENV !== 'production' && items.length === 0) {
      console.warn('[Explore] EMPTY DEVELOPER FEED DEBUG', {
        developerId,
        limit,
        offset,
        returned: items.length,
      });
    }

    return {
      items,
      shorts: items,
      feedType: 'developer',
      hasMore: rows.length === limit,
      offset: offset + rows.length,
      metadata: { developerId },
    };
  }

  async getAgencyFeed({ agencyId, limit = 20, offset = 0 }: FeedOptions): Promise<FeedResult> {
    if (!agencyId) throw new Error('Agency ID required');

    const rows = await db
      .select()
      .from(exploreContent)
      .where(
        and(
          eq(exploreContent.contentType, 'video'),
          eq(exploreContent.isActive, 1),
          eq(exploreContent.agencyId, agencyId),
          hasPlayableMedia,
        ),
      )
      .orderBy(desc(exploreContent.createdAt))
      .limit(limit)
      .offset(offset);

    const items = rows.map(transformShort);

    if (process.env.NODE_ENV !== 'production' && items.length === 0) {
      console.warn('[Explore] EMPTY AGENCY FEED DEBUG', {
        agencyId,
        limit,
        offset,
        returned: items.length,
      });
    }

    return {
      items,
      shorts: items,
      feedType: 'agency',
      hasMore: rows.length === limit,
      offset: offset + rows.length,
      metadata: { agencyId },
    };
  }

  async getCategoryFeed({ category, limit = 20, offset = 0 }: FeedOptions): Promise<FeedResult> {
    if (!category) throw new Error('Category required');
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

    const items = rows.map(r => transformShort(r.content));

    if (process.env.NODE_ENV !== 'production' && items.length === 0) {
      console.warn('[Explore] EMPTY CATEGORY FEED DEBUG', {
        category,
        limit,
        offset,
        returned: items.length,
      });
    }

    return {
      items,
      shorts: items,
      feedType: 'category',
      hasMore: rows.length === limit,
      offset: offset + rows.length,
      metadata: { category },
    };
  }

  async getFeed(feedType: FeedType, options: FeedOptions): Promise<FeedResult> {
    switch (feedType) {
      case 'recommended':
        return this.getRecommendedFeed(options);
      case 'area':
        return this.getAreaFeed(options);
      case 'category':
        return this.getCategoryFeed(options);
      case 'agent':
        return this.getAgentFeed(options);
      case 'developer':
        return this.getDeveloperFeed(options);
      case 'agency':
        return this.getAgencyFeed(options);
      default:
        throw new Error(`Unknown feed type: ${feedType}`);
    }
  }
}

export const exploreFeedService = new ExploreFeedService();