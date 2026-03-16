import { db } from '../db';
import {
  exploreContent,
  listings,
  developments,
  economicActors,
  users,
  interactionEvents,
  outcomeEvents,
} from '../../drizzle/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import type { FeedType, ExploreIntent } from '../../shared/types';
import { cache, CacheKeys, CacheTTL } from '../lib/cache';
import { feedRankingService } from './feedRankingService';
import { warnSchemaCapabilityOnce } from './runtimeSchemaCapabilities';

/* ------------------ TYPES ------------------ */

export interface FeedOptions {
  userId?: number;
  limit?: number;
  offset?: number;
  cursor?: string;
  location?: string;
  locationType?: 'province' | 'city' | 'suburb';
  locationId?: number;
  requestId?: string;
  category?: string;
  agentId?: number;
  developerId?: number;
  agencyId?: number;
  seed?: string;
  seenIds?: number[];
  includeAgentContent?: boolean;
  rankingDebug?: boolean;
  intent?: ExploreIntent;
  intentFocus?: string;
  intentSubFocus?: string;
  creatorActorId?: number;
}

export interface CreatorSpotlightOptions {
  limit?: number;
  windowDays?: number;
}

export interface CreatorSpotlightItem {
  creatorActorId: number;
  creatorId: number | null;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  topFocusTags: string[];
  previewVideoId?: number;
  seedFocus: 'buy' | 'sell' | 'renovate' | 'services' | 'finance' | 'invest' | 'neighbourhood';
  seedSubFocus: string;
  statsPreview: {
    watchTimeScore: number;
    completionRate: number;
    saveRate: number;
    momentumScore: number;
  };
}

interface SectionPurityMeta {
  requestedFocus: string;
  requestedSubFocus: string | null;
  requestedCount: number;
  returnedCount: number;
  matchedCount: number;
  matchPct: number;
  shortfallReason?: string;
}

export type FeedResult = {
  items: any[];
  cursor?: string;
  hasMore: boolean;
  /** @deprecated Use `items` instead. Legacy alias scheduled for removal. */
  shorts?: any[];
  feedType?: FeedType;
  offset?: number;
  metadata?: Record<string, any>;
};

const CANONICAL_CONTENT_TYPES = ['short', 'walkthrough', 'showcase', 'video'] as const;

const CANONICAL_CATEGORIES = ['property', 'renovation', 'finance', 'investment', 'services'] as const;

function parseEnumValue<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if ((allowed as readonly string[]).includes(normalized)) {
    return normalized as T[number];
  }
  return fallback;
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toPositiveInt(value: unknown): number | undefined {
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  const parsed = Math.floor(num);
  return parsed > 0 ? parsed : undefined;
}

function encodeOffsetCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ offset }), 'utf8').toString('base64url');
}

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

  const primaryMediaUrl = safeRow.videoUrl || safeRow.thumbnailUrl || mediaUrls[0] || null;
  const durationSec = toFiniteNumber(safeRow.durationSec ?? safeRow?.metadata?.durationSec, 0);
  const width = toFiniteNumber(safeRow.width ?? safeRow?.metadata?.width, 0);
  const height = toFiniteNumber(safeRow.height ?? safeRow?.metadata?.height, 0);

  const orientation =
    parseEnumValue(
      safeRow.orientation ?? safeRow?.metadata?.orientation,
      ['vertical', 'horizontal', 'square'] as const,
      height > width ? 'vertical' : width > height ? 'horizontal' : 'square',
    ) || 'square';

  const rawContentType = parseEnumValue(safeRow.contentType, CANONICAL_CONTENT_TYPES, 'short');
  const contentType = rawContentType === 'video' ? 'short' : rawContentType;
  const category = parseEnumValue(
    safeRow.category ?? safeRow?.metadata?.category,
    CANONICAL_CATEGORIES,
    'property',
  );

  const actorType =
    safeRow.creatorType === 'developer'
      ? 'developer'
      : safeRow.creatorType === 'agent'
        ? 'agent'
        : safeRow.creatorType === 'agency'
          ? 'agent'
          : 'user';

  const locationFromMetadata = safeRow?.metadata?.location ?? {};
  const linkedListingId = toFiniteNumber(
    safeRow?.metadata?.listingId ?? safeRow?.listingId ?? safeRow.referenceId,
    0,
  );

  return {
    ...safeRow,
    contentType,
    category,
    primaryMediaUrl,
    mediaUrls: Array.from(new Set(mediaUrls)),
    mediaUrl: primaryMediaUrl,
    thumbnailUrl: safeRow.thumbnailUrl || null,
    durationSec,
    width,
    height,
    orientation,
    actor: {
      id: safeRow.actorId ?? null,
      displayName:
        safeRow?.metadata?.creatorName ||
        safeRow?.metadata?.actorDisplayName ||
        safeRow?.metadata?.agencyName ||
        'Creator',
      actorType,
      verificationStatus: safeRow?.metadata?.verificationStatus || 'unverified',
    },
    stats: {
      views: toFiniteNumber(safeRow.viewCount, 0),
      saves: toFiniteNumber(safeRow.saveCount, 0),
      shares: toFiniteNumber(safeRow.shareCount, 0),
    },
    location: {
      city: locationFromMetadata.city,
      suburb: locationFromMetadata.suburb,
      province: locationFromMetadata.province,
      latitude: safeRow.locationLat ? Number(safeRow.locationLat) : undefined,
      longitude: safeRow.locationLng ? Number(safeRow.locationLng) : undefined,
    },
    linkedListingId: linkedListingId > 0 ? linkedListingId : undefined,
    caption: safeRow.description ?? null,
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
  const {
    tag,
    location,
    seed,
    limit,
    offset,
    baseWhere,
    commonWhere,
    featuredWhere,
    newWhere,
    rankedWhere,
  } = params;

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
  private legacyShortsWarned = false;
  private exploreReadColumnsCache: { columns: Set<string>; expiresAt: number } | null = null;

  private async getExploreReadColumns(): Promise<Set<string>> {
    const now = Date.now();
    if (this.exploreReadColumnsCache && this.exploreReadColumnsCache.expiresAt > now) {
      return this.exploreReadColumnsCache.columns;
    }

    try {
      const result = await db.execute(sql`
        SELECT COLUMN_NAME
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'explore_content'
      `);

      const normalizedRows: Array<Record<string, unknown>> = Array.isArray(result)
        ? (Array.isArray((result as any)[0])
            ? ((result as any)[0] as Array<Record<string, unknown>>)
            : ((result as any) as Array<Record<string, unknown>>))
        : Array.isArray((result as any)?.rows)
          ? (((result as any).rows as Array<Record<string, unknown>>))
          : [];

      const columns = new Set(
        normalizedRows
          .map(
            row =>
              String(row.COLUMN_NAME ?? row.column_name ?? row.Field ?? row.field ?? '')
                .trim()
                .toLowerCase(),
          )
          .filter(Boolean),
      );

      this.exploreReadColumnsCache = {
        columns,
        expiresAt: now + 60_000,
      };
      return columns;
    } catch (error) {
      warnSchemaCapabilityOnce(
        'explore-feed-read-columns-fallback',
        '[ExploreFeed] Failed to inspect explore_content columns. Falling back to conservative read columns.',
        error,
      );
      const fallback = new Set<string>([
        'id',
        'content_type',
        'reference_id',
        'creator_id',
        'creator_type',
        'agency_id',
        'title',
        'description',
        'thumbnail_url',
        'video_url',
        'metadata',
        'tags',
        'lifestyle_categories',
        'location_lat',
        'location_lng',
        'price_min',
        'price_max',
        'view_count',
        'engagement_score',
        'is_active',
        'is_featured',
        'created_at',
        'updated_at',
      ]);
      this.exploreReadColumnsCache = {
        columns: fallback,
        expiresAt: now + 30_000,
      };
      return fallback;
    }
  }

  private async hasExploreReadColumn(columnName: string): Promise<boolean> {
    const columns = await this.getExploreReadColumns();
    return columns.has(columnName.toLowerCase());
  }

  private async getExploreReadSelectShape(): Promise<Record<string, any>> {
    const columns = await this.getExploreReadColumns();
    const shape: Record<string, any> = {};
    const maybeAdd = (columnName: string, key: string, value: any) => {
      if (columns.has(columnName)) shape[key] = value;
    };

    maybeAdd('id', 'id', exploreContent.id);
    maybeAdd('content_type', 'contentType', exploreContent.contentType);
    maybeAdd('reference_id', 'referenceId', exploreContent.referenceId);
    maybeAdd('actor_id', 'actorId', exploreContent.actorId);
    maybeAdd('creator_id', 'creatorId', exploreContent.creatorId);
    maybeAdd('creator_type', 'creatorType', exploreContent.creatorType);
    maybeAdd('agency_id', 'agencyId', exploreContent.agencyId);
    maybeAdd('title', 'title', exploreContent.title);
    maybeAdd('description', 'description', exploreContent.description);
    maybeAdd('thumbnail_url', 'thumbnailUrl', exploreContent.thumbnailUrl);
    maybeAdd('video_url', 'videoUrl', exploreContent.videoUrl);
    maybeAdd('metadata', 'metadata', exploreContent.metadata);
    maybeAdd('tags', 'tags', exploreContent.tags);
    maybeAdd('lifestyle_categories', 'lifestyleCategories', exploreContent.lifestyleCategories);
    maybeAdd('category', 'category', exploreContent.category);
    maybeAdd('duration_sec', 'durationSec', exploreContent.durationSec);
    maybeAdd('width', 'width', exploreContent.width);
    maybeAdd('height', 'height', exploreContent.height);
    maybeAdd('orientation', 'orientation', exploreContent.orientation);
    maybeAdd('location_lat', 'locationLat', exploreContent.locationLat);
    maybeAdd('location_lng', 'locationLng', exploreContent.locationLng);
    maybeAdd('price_min', 'priceMin', exploreContent.priceMin);
    maybeAdd('price_max', 'priceMax', exploreContent.priceMax);
    maybeAdd('view_count', 'viewCount', exploreContent.viewCount);
    maybeAdd('engagement_score', 'engagementScore', exploreContent.engagementScore);
    maybeAdd('is_active', 'isActive', exploreContent.isActive);
    maybeAdd('is_featured', 'isFeatured', exploreContent.isFeatured);
    maybeAdd('created_at', 'createdAt', exploreContent.createdAt);
    maybeAdd('updated_at', 'updatedAt', exploreContent.updatedAt);

    return shape;
  }

  private getGeoContext(options: FeedOptions) {
    if (!options.locationType || !options.locationId) return undefined;
    return {
      locationType: options.locationType,
      locationId: options.locationId,
      requestId: options.requestId,
      userId: options.userId ?? null,
    };
  }

  private buildDisplayName(user?: { name: string | null; firstName: string | null; lastName: string | null }) {
    const name = String(user?.name ?? '').trim();
    if (name) return name;
    const firstName = String(user?.firstName ?? '').trim();
    const lastName = String(user?.lastName ?? '').trim();
    const joined = `${firstName} ${lastName}`.trim();
    return joined || 'Creator';
  }

  private toCreatorHandle(displayName: string, actorId: number): string {
    const normalized = String(displayName || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    return normalized ? `${normalized}-${actorId}` : `creator-${actorId}`;
  }

  private mapCategoryToFocus(
    category: string,
  ): 'buy' | 'sell' | 'renovate' | 'services' | 'finance' | 'invest' | 'neighbourhood' {
    const normalized = String(category ?? '').toLowerCase();
    if (normalized === 'finance') return 'finance';
    if (normalized === 'investment') return 'invest';
    if (normalized === 'renovation') return 'renovate';
    if (normalized === 'services') return 'services';
    return 'buy';
  }

  private buildSpotlightSubFocus(topTags: string[]): string {
    if (topTags.length === 0) return 'creator';
    return topTags[0];
  }

  async getCreatorSpotlight(options: CreatorSpotlightOptions = {}) {
    const hasActorIdColumn = await this.hasExploreReadColumn('actor_id');
    if (!hasActorIdColumn) {
      warnSchemaCapabilityOnce(
        'explore-creator-spotlight-actor-id-missing',
        '[ExploreFeed] Creator spotlight disabled: explore_content.actor_id column is missing.',
      );
      return {
        items: [] as CreatorSpotlightItem[],
        meta: {
          windowDays: Math.max(1, Math.min(60, Number(options.windowDays ?? 14))),
          candidateCount: 0,
          disabledReason: 'missing_actor_id_column',
          scoringWeights: {
            watchTime: 0.35,
            completion: 0.25,
            saveShare: 0.2,
            momentum: 0.1,
            trust: 0.1,
          },
        },
      };
    }

    const limit = Math.max(1, Math.min(24, Number(options.limit ?? 8)));
    const windowDays = Math.max(1, Math.min(60, Number(options.windowDays ?? 14)));
    const candidateLimit = Math.max(40, limit * 10);
    const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    const creatorBaseRows = await db
      .select({
        actorId: economicActors.id,
        actorType: economicActors.actorType,
        verificationStatus: economicActors.verificationStatus,
        trustScore: economicActors.trustScore,
        momentumScore: economicActors.momentumScore,
        abuseScore: economicActors.abuseScore,
        creatorId: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        videoCount: sql<number>`COUNT(${exploreContent.id})`,
        previewVideoId: sql<number>`CAST(SUBSTRING_INDEX(GROUP_CONCAT(${exploreContent.id} ORDER BY ${exploreContent.createdAt} DESC), ',', 1) AS UNSIGNED)`,
        previewMediaUrl: sql<string>`SUBSTRING_INDEX(GROUP_CONCAT(COALESCE(${exploreContent.thumbnailUrl}, ${exploreContent.videoUrl}) ORDER BY ${exploreContent.createdAt} DESC), ',', 1)`,
      })
      .from(economicActors)
      .innerJoin(users, eq(users.id, economicActors.userId))
      .innerJoin(
        exploreContent,
        and(
          eq(exploreContent.actorId, economicActors.id),
          eq(exploreContent.isActive, 1),
          sql`COALESCE(${exploreContent.videoUrl}, '') <> ''`,
        ),
      )
      .groupBy(
        economicActors.id,
        economicActors.actorType,
        economicActors.verificationStatus,
        economicActors.trustScore,
        economicActors.momentumScore,
        economicActors.abuseScore,
        users.id,
        users.name,
        users.firstName,
        users.lastName,
      )
      .orderBy(desc(sql`COUNT(${exploreContent.id})`))
      .limit(candidateLimit);

    if (!creatorBaseRows.length) {
      return {
        items: [] as CreatorSpotlightItem[],
        meta: {
          windowDays,
          candidateCount: 0,
          scoringWeights: {
            watchTime: 0.35,
            completion: 0.25,
            saveShare: 0.2,
            momentum: 0.1,
            trust: 0.1,
          },
        },
      };
    }

    const actorIds = creatorBaseRows
      .map(row => Number(row.actorId))
      .filter(id => Number.isFinite(id) && id > 0);

    const interactionRows = await db
      .select({
        actorId: exploreContent.actorId,
        impressions:
          sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} IN ('impression', 'viewProgress', 'viewComplete') THEN 1 ELSE 0 END)`,
        completions: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} = 'viewComplete' THEN 1 ELSE 0 END)`,
        saves: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} = 'save' THEN 1 ELSE 0 END)`,
        shares: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} = 'share' THEN 1 ELSE 0 END)`,
        negatives:
          sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} IN ('notInterested', 'report') THEN 1 ELSE 0 END)`,
        watchMs:
          sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} IN ('viewProgress', 'viewComplete') THEN COALESCE(${interactionEvents.watchMs}, 0) ELSE 0 END)`,
      })
      .from(interactionEvents)
      .innerJoin(exploreContent, eq(interactionEvents.contentId, exploreContent.id))
      .where(
        and(
          inArray(exploreContent.actorId, actorIds),
          eq(exploreContent.isActive, 1),
          sql`${interactionEvents.createdAt} >= ${windowStart}`,
        ),
      )
      .groupBy(exploreContent.actorId);

    const outcomeRows = await db
      .select({
        actorId: exploreContent.actorId,
        outcomes: sql<number>`COUNT(${outcomeEvents.id})`,
      })
      .from(outcomeEvents)
      .innerJoin(exploreContent, eq(outcomeEvents.contentId, exploreContent.id))
      .where(
        and(
          inArray(exploreContent.actorId, actorIds),
          eq(exploreContent.isActive, 1),
          sql`${outcomeEvents.createdAt} >= ${windowStart}`,
        ),
      )
      .groupBy(exploreContent.actorId);

    const categoryRows = await db
      .select({
        actorId: exploreContent.actorId,
        category: exploreContent.category,
        count: sql<number>`COUNT(*)`,
      })
      .from(exploreContent)
      .where(
        and(
          inArray(exploreContent.actorId, actorIds),
          eq(exploreContent.isActive, 1),
          sql`${exploreContent.createdAt} >= ${windowStart}`,
        ),
      )
      .groupBy(exploreContent.actorId, exploreContent.category)
      .orderBy(desc(sql`COUNT(*)`));

    const interactionByActorId = new Map<
      number,
      {
        impressions: number;
        completions: number;
        saves: number;
        shares: number;
        negatives: number;
        watchMs: number;
      }
    >();
    for (const row of interactionRows) {
      interactionByActorId.set(Number(row.actorId), {
        impressions: toFiniteNumber(row.impressions, 0),
        completions: toFiniteNumber(row.completions, 0),
        saves: toFiniteNumber(row.saves, 0),
        shares: toFiniteNumber(row.shares, 0),
        negatives: toFiniteNumber(row.negatives, 0),
        watchMs: toFiniteNumber(row.watchMs, 0),
      });
    }

    const outcomeByActorId = new Map<number, { outcomes: number }>();
    for (const row of outcomeRows) {
      outcomeByActorId.set(Number(row.actorId), {
        outcomes: toFiniteNumber(row.outcomes, 0),
      });
    }

    const categoriesByActorId = new Map<number, Array<{ category: string; count: number }>>();
    for (const row of categoryRows) {
      const actorId = Number(row.actorId);
      const current = categoriesByActorId.get(actorId) ?? [];
      current.push({
        category: String(row.category ?? 'property'),
        count: toFiniteNumber(row.count, 0),
      });
      categoriesByActorId.set(actorId, current);
    }

    const scored = creatorBaseRows
      .map(row => {
        const actorId = Number(row.actorId);
        const interaction = interactionByActorId.get(actorId);
        const outcome = outcomeByActorId.get(actorId);

        const impressions = Math.max(1, toFiniteNumber(interaction?.impressions, 0));
        const completions = toFiniteNumber(interaction?.completions, 0);
        const saves = toFiniteNumber(interaction?.saves, 0);
        const shares = toFiniteNumber(interaction?.shares, 0);
        const negatives = toFiniteNumber(interaction?.negatives, 0);
        const watchMs = toFiniteNumber(interaction?.watchMs, 0);
        const outcomes = toFiniteNumber(outcome?.outcomes, 0);

        const avgWatchMs = watchMs / impressions;
        const watchTimeScore = this.clamp01(avgWatchMs / 30000);
        const completionRate = this.clamp01(completions / impressions);
        const saveRate = this.clamp01((saves + shares * 1.2) / impressions);
        const momentumScore = this.clamp01(toFiniteNumber(row.momentumScore, 0) / 100);
        const trustScore = this.clamp01(toFiniteNumber(row.trustScore, 0) / 100);
        const abuseScore = this.clamp01(toFiniteNumber(row.abuseScore, 0) / 100);
        const negativeRate = this.clamp01(negatives / impressions);
        const outcomeLift = Math.min(0.15, this.clamp01(outcomes / impressions) * 0.75);

        const qualityScore =
          watchTimeScore * 0.35 +
          completionRate * 0.25 +
          saveRate * 0.2 +
          momentumScore * 0.1 +
          trustScore * 0.1;

        const finalScore = qualityScore * (1 - Math.min(0.5, negativeRate)) * abuseScore * (1 + outcomeLift);
        const displayName = this.buildDisplayName({
          name: row.name,
          firstName: row.firstName,
          lastName: row.lastName,
        });
        const categoryStats = (categoriesByActorId.get(actorId) ?? [])
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);
        const topFocusTags = categoryStats.map(entry => String(entry.category).toLowerCase());
        const primaryCategory = topFocusTags[0] || 'property';

        return {
          actorId,
          actorType: String(row.actorType || 'user'),
          trustScore,
          abuseScore,
          finalScore,
          item: {
            creatorActorId: actorId,
            creatorId: Number(row.creatorId) || null,
            handle: this.toCreatorHandle(displayName, actorId),
            displayName,
            avatarUrl: (String(row.previewMediaUrl || '').trim() || null) as string | null,
            topFocusTags,
            previewVideoId: Number(row.previewVideoId) || undefined,
            seedFocus: this.mapCategoryToFocus(primaryCategory),
            seedSubFocus: this.buildSpotlightSubFocus(topFocusTags),
            statsPreview: {
              watchTimeScore: Number((watchTimeScore * 100).toFixed(2)),
              completionRate: Number((completionRate * 100).toFixed(2)),
              saveRate: Number((saveRate * 100).toFixed(2)),
              momentumScore: Number((momentumScore * 100).toFixed(2)),
            },
          } as CreatorSpotlightItem,
        };
      })
      .filter(entry => entry.trustScore >= 0.3 && entry.abuseScore >= 0.35)
      .sort((a, b) => b.finalScore - a.finalScore);

    const maxPerActorType = Math.max(1, Math.ceil(limit * 0.5));
    const actorTypeCounts = new Map<string, number>();
    const selected: typeof scored = [];

    for (const candidate of scored) {
      if (selected.length >= limit) break;
      const currentTypeCount = actorTypeCounts.get(candidate.actorType) ?? 0;
      if (currentTypeCount >= maxPerActorType) continue;
      selected.push(candidate);
      actorTypeCounts.set(candidate.actorType, currentTypeCount + 1);
    }

    if (selected.length < limit) {
      for (const candidate of scored) {
        if (selected.length >= limit) break;
        if (selected.some(item => item.actorId === candidate.actorId)) continue;
        selected.push(candidate);
      }
    }

    return {
      items: selected.map(entry => entry.item),
      meta: {
        windowDays,
        candidateCount: scored.length,
        scoringWeights: {
          watchTime: 0.35,
          completion: 0.25,
          saveShare: 0.2,
          momentum: 0.1,
          trust: 0.1,
        },
      },
    };
  }

  private getActorKey(item: any): number | null {
    const actorId = Number(item?.actor?.id ?? item?.actorId ?? 0);
    if (!Number.isFinite(actorId) || actorId <= 0) return null;
    return actorId;
  }

  private calculateTrustScore(params: {
    baseTrustScore: number;
    verificationStatus: string;
    profileCompleteness: number;
    reports: number;
    exposureEvents: number;
  }) {
    const { baseTrustScore, verificationStatus, profileCompleteness, reports, exposureEvents } = params;
    const verificationBonus =
      verificationStatus === 'verified' ? 12 : verificationStatus === 'pending' ? 4 : 0;
    const completenessBonus = Math.floor(Math.max(0, Math.min(100, profileCompleteness)) * 0.1);
    const reportRate = reports / Math.max(1, exposureEvents);
    const reportPenalty = Math.min(20, Math.round(reportRate * 200));
    return Math.max(0, Math.min(100, Math.round(baseTrustScore + verificationBonus + completenessBonus - reportPenalty)));
  }

  private withLegacyShortsAlias(items: any[]) {
    if (process.env.EXPLORE_LEGACY_SHORTS_RESPONSE === '0') {
      return {};
    }

    if (!this.legacyShortsWarned) {
      this.legacyShortsWarned = true;
      console.warn(
        '[ExploreFeed] Deprecated response field `shorts` is enabled for compatibility. Migrate consumers to `items` before removal.',
      );
    }

    return { shorts: items };
  }

  private clamp01(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
  }

  private normalizeRate(numerator: number, denominator: number, maxRate = 1): number {
    const safeDenominator = Math.max(1, denominator);
    const rate = numerator / safeDenominator;
    return this.clamp01(rate / Math.max(0.0001, maxRate));
  }

  private calculateConfidenceWeight(exposureSignals: number): number {
    const minSignals = 24;
    const raw = exposureSignals / minSignals;
    return this.clamp01(raw);
  }

  private calculateEngagementScore(params: {
    impressions: number;
    viewProgress: number;
    viewComplete: number;
    saves: number;
    shares: number;
    profileClicks: number;
    listingOpens: number;
    contactClicks: number;
    views: number;
  }) {
    const {
      impressions,
      viewProgress,
      viewComplete,
      saves,
      shares,
      profileClicks,
      listingOpens,
      contactClicks,
      views,
    } = params;

    const exposureSignals = Math.max(1, impressions + viewProgress + viewComplete);
    const completionRate = this.normalizeRate(viewComplete, exposureSignals, 0.6);
    const saveRate = this.normalizeRate(saves, exposureSignals, 0.2);
    const shareRate = this.normalizeRate(shares, exposureSignals, 0.12);
    const profileRate = this.normalizeRate(profileClicks, exposureSignals, 0.18);
    const downstreamRate = this.normalizeRate(listingOpens + contactClicks, exposureSignals, 0.08);
    const progressRate = this.normalizeRate(viewProgress, exposureSignals, 1);
    const viewLift = this.clamp01(Math.log1p(Math.max(0, views)) / Math.log1p(5000));

    const rawScore =
      completionRate * 0.3 +
      saveRate * 0.18 +
      shareRate * 0.12 +
      profileRate * 0.08 +
      downstreamRate * 0.17 +
      progressRate * 0.1 +
      viewLift * 0.05;

    const confidenceWeight = this.calculateConfidenceWeight(exposureSignals);
    const baseline = 0.2;
    const score = baseline + (rawScore - baseline) * confidenceWeight;

    return {
      score: Number(score.toFixed(6)),
      rawScore: Number(rawScore.toFixed(6)),
      confidenceWeight: Number(confidenceWeight.toFixed(6)),
      exposureSignals,
      components: {
        completionRate: Number(completionRate.toFixed(6)),
        saveRate: Number(saveRate.toFixed(6)),
        shareRate: Number(shareRate.toFixed(6)),
        profileRate: Number(profileRate.toFixed(6)),
        downstreamRate: Number(downstreamRate.toFixed(6)),
        progressRate: Number(progressRate.toFixed(6)),
        viewLift: Number(viewLift.toFixed(6)),
      },
    };
  }

  private calculateOutcomeMultiplier(params: {
    contactClicks: number;
    leadSubmitted: number;
    viewingRequest: number;
    quoteRequest: number;
    exposureSignals: number;
  }) {
    const { contactClicks, leadSubmitted, viewingRequest, quoteRequest, exposureSignals } = params;
    const weightedOutcomes =
      contactClicks * 1 + leadSubmitted * 1.4 + viewingRequest * 1.25 + quoteRequest * 1.2;
    const safeExposure = Math.max(1, exposureSignals);
    const outcomeRate = weightedOutcomes / safeExposure;
    const envK = Number(process.env.EXPLORE_OUTCOME_RATE_MULTIPLIER ?? 0.75);
    const multiplierK = Number.isFinite(envK) && envK > 0 ? envK : 0.75;
    const boost = Math.min(0.15, Math.max(0, outcomeRate * multiplierK));
    const multiplier = 1 + boost;

    return {
      multiplier: Number(multiplier.toFixed(6)),
      outcomeRate: Number(outcomeRate.toFixed(6)),
      weightedOutcomes: Number(weightedOutcomes.toFixed(6)),
      boost: Number(boost.toFixed(6)),
      capped: boost >= 0.149999,
    };
  }

  private calculateAbuseDecay(params: { reports: number; notInterested: number; exposure: number }) {
    const { reports, notInterested, exposure } = params;
    const denominator = Math.max(1, exposure);
    const reportRate = reports / denominator;
    const notInterestedRate = notInterested / denominator;
    const penalty = Math.min(0.65, reportRate * 2 + notInterestedRate * 1.2);
    return Math.max(0.35, 1 - penalty);
  }

  private calculateMomentumScore(params: { positive: number; negative: number; exposure: number }) {
    const { positive, negative, exposure } = params;
    const denominator = Math.max(1, exposure);
    const netRate = (positive - negative) / denominator; // -1..1-ish
    const normalized = 50 + netRate * 50;
    return Math.max(0, Math.min(100, normalized));
  }

  private calculateViewerActorDiminishingMultiplier(interactionCount: number) {
    const effective = Math.max(0, Math.round(interactionCount));
    if (effective <= 2) return 1;
    const multiplier = 1 / (1 + (effective - 2) / 4);
    return Number(Math.max(0.35, Math.min(1, multiplier)).toFixed(6));
  }

  private getIntentMultiplier(intent: ExploreIntent | undefined, category: string | undefined): number {
    if (!intent) return 1;
    const normalizedCategory = String(category ?? '').toLowerCase();
    const primary: Record<ExploreIntent, string[]> = {
      buy: ['property'],
      sell: ['property', 'services'],
      improve: ['renovation', 'services'],
      invest: ['investment', 'finance', 'property'],
      learn: ['finance', 'renovation', 'property', 'services'],
    };

    const secondary: Record<ExploreIntent, string[]> = {
      buy: ['investment', 'finance'],
      sell: ['finance'],
      improve: ['property'],
      invest: ['services'],
      learn: ['investment'],
    };

    if (primary[intent].includes(normalizedCategory)) return 1.08;
    if (secondary[intent].includes(normalizedCategory)) return 1.03;
    return 0.98;
  }

  private normalizeFocusLabel(input?: string): string {
    return String(input ?? '')
      .trim()
      .toLowerCase();
  }

  private itemSignalTokens(item: any): string[] {
    const metadata = item?.metadata && typeof item.metadata === 'object' ? item.metadata : {};
    const tags = Array.isArray((metadata as any)?.tags)
      ? (metadata as any).tags
      : Array.isArray(item?.tags)
        ? item.tags
        : [];
    const lifestyle = Array.isArray((metadata as any)?.lifestyleCategories)
      ? (metadata as any).lifestyleCategories
      : Array.isArray(item?.lifestyleCategories)
        ? item.lifestyleCategories
        : [];
    const raw = [
      item?.category,
      item?.contentType,
      item?.title,
      item?.description,
      ...tags,
      ...lifestyle,
    ];
    return raw
      .map(value => String(value ?? '').toLowerCase().trim())
      .filter(Boolean);
  }

  private matchesFocus(item: any, focus: string, subFocus: string): boolean {
    const normalizedFocus = this.normalizeFocusLabel(focus);
    const normalizedSubFocus = this.normalizeFocusLabel(subFocus);
    const category = this.normalizeFocusLabel(item?.category);
    const contentType = this.normalizeFocusLabel(item?.contentType);
    const signalText = this.itemSignalTokens(item).join(' ');

    const includesAny = (needles: string[]) => needles.some(needle => signalText.includes(needle));
    if (
      normalizedFocus === 'walkthroughs' ||
      normalizedSubFocus.includes('walkthrough') ||
      normalizedSubFocus === 'property_walkthroughs'
    ) {
      return contentType === 'walkthrough' || includesAny(['walkthrough', 'tour', 'showcase']);
    }
    if (
      normalizedFocus === 'investment_finance' ||
      normalizedFocus === 'finance' ||
      normalizedSubFocus.includes('investment') ||
      normalizedSubFocus.includes('finance')
    ) {
      return (
        category === 'finance' ||
        category === 'investment' ||
        includesAny(['finance', 'bond', 'investment', 'yield', 'market'])
      );
    }
    if (
      normalizedFocus === 'renovation_home_improvement' ||
      normalizedFocus === 'renovations' ||
      normalizedFocus === 'renovate' ||
      normalizedSubFocus.includes('renovation') ||
      normalizedSubFocus.includes('construction') ||
      normalizedSubFocus.includes('improvement')
    ) {
      return (
        category === 'renovation' ||
        category === 'services' ||
        includesAny(['renovation', 'remodel', 'construction', 'interior', 'improvement', 'before', 'after'])
      );
    }
    if (
      normalizedFocus === 'neighborhoods' ||
      normalizedFocus === 'neighbourhoods' ||
      normalizedFocus === 'neighbourhood' ||
      normalizedSubFocus.includes('neighborhood') ||
      normalizedSubFocus.includes('neighbourhood')
    ) {
      return includesAny(['neighborhood', 'neighbourhood', 'suburb', 'community', 'district', 'area']);
    }
    if (normalizedFocus === 'developments' || normalizedSubFocus.includes('development')) {
      return includesAny(['development', 'project', 'new build', 'launch']);
    }

    return true;
  }

  private applySectionPurity(items: any[], options: FeedOptions): { items: any[]; sectionPurity?: SectionPurityMeta } {
    const focus = this.normalizeFocusLabel(options.intentFocus);
    const subFocus = this.normalizeFocusLabel(options.intentSubFocus);
    if (!focus && !subFocus) {
      return { items };
    }

    const requestedCount = Math.max(1, Number(options.limit ?? items.length ?? 1));
    const matches = items.map(item => this.matchesFocus(item, focus, subFocus));
    const matchingItems = items.filter((_, index) => matches[index]);
    const nonMatchingItems = items.filter((_, index) => !matches[index]);

    if (matchingItems.length === 0) {
      return {
        items: [],
        sectionPurity: {
          requestedFocus: focus || 'unknown',
          requestedSubFocus: subFocus || null,
          requestedCount,
          returnedCount: 0,
          matchedCount: 0,
          matchPct: 0,
          shortfallReason: 'no_matching_content',
        },
      };
    }

    const targetCount = Math.min(requestedCount, items.length);
    const minMatchesForPurity = Math.ceil(targetCount * 0.8);
    let finalItems: any[] = [];
    let shortfallReason: string | undefined;

    if (matchingItems.length >= minMatchesForPurity) {
      const selectedMatching = matchingItems.slice(0, targetCount);
      const room = Math.max(0, targetCount - selectedMatching.length);
      const maxNonMatching = Math.floor(targetCount * 0.2);
      const nonMatchingToInclude = Math.min(nonMatchingItems.length, maxNonMatching, room);
      finalItems = [...selectedMatching, ...nonMatchingItems.slice(0, nonMatchingToInclude)];
    } else {
      finalItems = matchingItems.slice(0, Math.min(targetCount, matchingItems.length));
      shortfallReason = 'insufficient_matching_content';
    }

    const matchedCount = finalItems.filter(item => this.matchesFocus(item, focus, subFocus)).length;
    const matchPct = finalItems.length > 0 ? Number(((matchedCount / finalItems.length) * 100).toFixed(2)) : 0;

    return {
      items: finalItems,
      sectionPurity: {
        requestedFocus: focus || 'unknown',
        requestedSubFocus: subFocus || null,
        requestedCount,
        returnedCount: finalItems.length,
        matchedCount,
        matchPct,
        ...(shortfallReason ? { shortfallReason } : {}),
      },
    };
  }

  private applyActorFairnessCaps(items: any[], windowSize = 20, maxPerActor = 3, minActorDiversity = 5) {
    type FairnessAdjustment = {
      itemId: number;
      actorId: number;
      reason: 'per_actor_cap' | 'diversity_swap';
      fromIndex: number;
      toIndex: number | null;
    };
    type WrappedItem = {
      item: any;
      originalIndex: number;
    };

    if (!items.length) {
      return { items, adjustments: [] as FairnessAdjustment[] };
    }

    const prioritized: WrappedItem[] = [];
    const overflow: WrappedItem[] = [];
    const actorCounts = new Map<number, number>();
    const adjustments: FairnessAdjustment[] = [];

    items.forEach((item, index) => {
      const actorId = this.getActorKey(item);
      if (!actorId || prioritized.length >= windowSize) {
        prioritized.push({ item, originalIndex: index });
        return;
      }

      const count = actorCounts.get(actorId) ?? 0;
      if (count >= maxPerActor) {
        overflow.push({ item, originalIndex: index });
        adjustments.push({
          itemId: Number(item?.id) || -1,
          actorId,
          reason: 'per_actor_cap',
          fromIndex: index,
          toIndex: null,
        });
        return;
      }

      actorCounts.set(actorId, count + 1);
      prioritized.push({ item, originalIndex: index });
    });

    const arranged: WrappedItem[] = [...prioritized, ...overflow];
    const allActors = new Set(
      arranged
        .map(wrapped => this.getActorKey(wrapped.item))
        .filter((id): id is number => typeof id === 'number' && id > 0),
    );
    const targetDiversity = Math.min(minActorDiversity, allActors.size);

    const getFirstActors = () =>
      new Set(
        arranged
          .slice(0, Math.min(windowSize, arranged.length))
          .map(wrapped => this.getActorKey(wrapped.item))
          .filter((id): id is number => typeof id === 'number' && id > 0),
      );

    const countInWindow = () => {
      const map = new Map<number, number>();
      for (const wrapped of arranged.slice(0, Math.min(windowSize, arranged.length))) {
        const actorId = this.getActorKey(wrapped.item);
        if (!actorId) continue;
        map.set(actorId, (map.get(actorId) ?? 0) + 1);
      }
      return map;
    };

    let firstActors = getFirstActors();

    for (let i = windowSize; i < arranged.length && firstActors.size < targetDiversity; i++) {
      const candidate = arranged[i];
      const candidateActor = this.getActorKey(candidate.item);
      if (!candidateActor || firstActors.has(candidateActor)) continue;

      const windowActorCounts = countInWindow();
      let swapIndex = -1;

      for (let w = 0; w < Math.min(windowSize, arranged.length); w++) {
        const actorId = this.getActorKey(arranged[w].item);
        if (!actorId) continue;
        if ((windowActorCounts.get(actorId) ?? 0) > 1) {
          swapIndex = w;
          break;
        }
      }

      if (swapIndex >= 0) {
        const displaced = arranged[swapIndex];
        arranged[swapIndex] = candidate;
        arranged[i] = displaced;

        const incomingActorId = this.getActorKey(candidate.item) ?? -1;
        const displacedActorId = this.getActorKey(displaced.item) ?? -1;
        adjustments.push({
          itemId: Number(candidate.item?.id) || -1,
          actorId: incomingActorId,
          reason: 'diversity_swap',
          fromIndex: i,
          toIndex: swapIndex,
        });
        adjustments.push({
          itemId: Number(displaced.item?.id) || -1,
          actorId: displacedActorId,
          reason: 'diversity_swap',
          fromIndex: swapIndex,
          toIndex: i,
        });
        firstActors = getFirstActors();
      }
    }

    const finalIndexByItemId = new Map<number, number>();
    arranged.forEach((wrapped, index) => {
      const itemId = Number(wrapped.item?.id);
      if (!Number.isFinite(itemId) || itemId <= 0) return;
      if (!finalIndexByItemId.has(itemId)) {
        finalIndexByItemId.set(itemId, index);
      }
    });

    const normalizedAdjustments = adjustments.map(adjustment => ({
      ...adjustment,
      toIndex:
        adjustment.toIndex == null
          ? (finalIndexByItemId.get(adjustment.itemId) ?? null)
          : adjustment.toIndex,
    }));

    return {
      items: arranged.map(wrapped => wrapped.item),
      adjustments: normalizedAdjustments,
    };
  }

  private async applyTrustAndDiversity(
    items: any[],
    options?: {
      viewerUserId?: number;
      rankingDebug?: boolean;
      intent?: ExploreIntent;
    },
  ) {
    if (!items.length) return items;

    try {
      const viewerUserId = options?.viewerUserId;
      const rankingDebug = Boolean(options?.rankingDebug);
      const intent = options?.intent;

      type ActorRow = {
        id: number;
        userId: number;
        actorType: string;
        verificationStatus: string;
        trustScore: number | string | null;
        momentumScore: number | string | null;
        abuseScore: number | string | null;
        profileCompleteness: number | null;
      };
      type CreatorUserRow = {
        id: number;
        name: string | null;
        firstName: string | null;
        lastName: string | null;
      };
      type ActorSignal = {
        reports: number;
        exposureEvents: number;
      };
      type ContentSignal = {
        impressions: number;
        viewProgress: number;
        viewComplete: number;
        saves: number;
        shares: number;
        profileClicks: number;
        listingOpens: number;
        contactClicks: number;
        notInterested: number;
        reports: number;
      };
      type OutcomeSignal = {
        contactClicks: number;
        leadSubmitted: number;
        viewingRequest: number;
        quoteRequest: number;
      };
      type MomentumSignal = {
        positive: number;
        negative: number;
        exposureEvents: number;
      };
      type ViewerActorInfluence = {
        interactions24h: number;
      };

      const actorIds = Array.from(
        new Set(
          items
            .map(item => this.getActorKey(item))
            .filter((id): id is number => typeof id === 'number' && id > 0),
        ),
      );

      if (!actorIds.length) {
        return items;
      }
      const contentIds = Array.from(
        new Set(
          items
            .map(item => Number(item?.id))
            .filter((id): id is number => Number.isFinite(id) && id > 0),
        ),
      );

      const actors = (await db
        .select({
          id: economicActors.id,
          userId: economicActors.userId,
          actorType: economicActors.actorType,
          verificationStatus: economicActors.verificationStatus,
          trustScore: economicActors.trustScore,
          momentumScore: economicActors.momentumScore,
          abuseScore: economicActors.abuseScore,
          profileCompleteness: economicActors.profileCompleteness,
        })
        .from(economicActors)
        .where(inArray(economicActors.id, actorIds))) as ActorRow[];

      const actorById = new Map<number, ActorRow>(
        actors.map(actor => [Number(actor.id), actor as ActorRow]),
      );
      const userIds = Array.from(
        new Set(
          actors
            .map(actor => Number(actor.userId))
            .filter((id): id is number => Number.isFinite(id) && id > 0),
        ),
      );
      const creatorUsers: CreatorUserRow[] =
        userIds.length > 0
          ? ((await db
              .select({
                id: users.id,
                name: users.name,
                firstName: users.firstName,
                lastName: users.lastName,
              })
              .from(users)
              .where(inArray(users.id, userIds))) as CreatorUserRow[])
          : [];
      const userById = new Map<number, CreatorUserRow>(
        creatorUsers.map(user => [Number(user.id), user]),
      );

      const actorSignalRows: {
        actorId: number | null;
        reportCount: number;
        exposureCount: number;
      }[] =
        actorIds.length > 0
          ? ((await db
              .select({
                actorId: interactionEvents.actorId,
                reportCount: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} = 'report' THEN 1 ELSE 0 END)`,
                exposureCount: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} IN ('impression', 'viewProgress', 'viewComplete') THEN 1 ELSE 0 END)`,
              })
              .from(interactionEvents)
              .where(inArray(interactionEvents.actorId, actorIds))
              .groupBy(interactionEvents.actorId)) as {
              actorId: number | null;
              reportCount: number;
              exposureCount: number;
            }[])
          : [];

      const signalByActorId = new Map<number, ActorSignal>(
        actorSignalRows
          .filter(row => row.actorId != null)
          .map(row => [
            Number(row.actorId),
            {
              reports: toFiniteNumber(row.reportCount, 0),
              exposureEvents: toFiniteNumber(row.exposureCount, 0),
            },
          ]),
      );

      const contentSignalRows: {
        contentId: number | null;
        impressions: number;
        viewProgress: number;
        viewComplete: number;
        saves: number;
        shares: number;
        profileClicks: number;
        listingOpens: number;
        contactClicks: number;
        notInterested: number;
        reports: number;
      }[] =
        contentIds.length > 0
          ? ((await db
              .select({
                contentId: interactionEvents.contentId,
                impressions: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} = 'impression' THEN 1 ELSE 0 END)`,
                viewProgress: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} = 'viewProgress' THEN 1 ELSE 0 END)`,
                viewComplete: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} = 'viewComplete' THEN 1 ELSE 0 END)`,
                saves: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} = 'save' THEN 1 ELSE 0 END)`,
                shares: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} = 'share' THEN 1 ELSE 0 END)`,
                profileClicks: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} = 'profileClick' THEN 1 ELSE 0 END)`,
                listingOpens: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} = 'listingOpen' THEN 1 ELSE 0 END)`,
                contactClicks: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} = 'contactClick' THEN 1 ELSE 0 END)`,
                notInterested: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} = 'notInterested' THEN 1 ELSE 0 END)`,
                reports: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} = 'report' THEN 1 ELSE 0 END)`,
              })
              .from(interactionEvents)
              .where(inArray(interactionEvents.contentId, contentIds))
              .groupBy(interactionEvents.contentId)) as {
              contentId: number | null;
              impressions: number;
              viewProgress: number;
              viewComplete: number;
              saves: number;
              shares: number;
              profileClicks: number;
              listingOpens: number;
              contactClicks: number;
              notInterested: number;
              reports: number;
            }[])
          : [];

      const contentSignalById = new Map<number, ContentSignal>(
        contentSignalRows
          .filter(row => row.contentId != null)
          .map(row => [
            Number(row.contentId),
            {
              impressions: toFiniteNumber(row.impressions, 0),
              viewProgress: toFiniteNumber(row.viewProgress, 0),
              viewComplete: toFiniteNumber(row.viewComplete, 0),
              saves: toFiniteNumber(row.saves, 0),
              shares: toFiniteNumber(row.shares, 0),
              profileClicks: toFiniteNumber(row.profileClicks, 0),
              listingOpens: toFiniteNumber(row.listingOpens, 0),
              contactClicks: toFiniteNumber(row.contactClicks, 0),
              notInterested: toFiniteNumber(row.notInterested, 0),
              reports: toFiniteNumber(row.reports, 0),
            },
          ]),
      );

      const outcomeSignalRows: {
        contentId: number | null;
        contactClicks: number;
        leadSubmitted: number;
        viewingRequest: number;
        quoteRequest: number;
      }[] =
        contentIds.length > 0
          ? ((await db
              .select({
                contentId: outcomeEvents.contentId,
                contactClicks: sql<number>`SUM(CASE WHEN ${outcomeEvents.outcomeType} = 'contactClick' THEN 1 ELSE 0 END)`,
                leadSubmitted: sql<number>`SUM(CASE WHEN ${outcomeEvents.outcomeType} = 'leadSubmitted' THEN 1 ELSE 0 END)`,
                viewingRequest: sql<number>`SUM(CASE WHEN ${outcomeEvents.outcomeType} = 'viewingRequest' THEN 1 ELSE 0 END)`,
                quoteRequest: sql<number>`SUM(CASE WHEN ${outcomeEvents.outcomeType} = 'quoteRequest' THEN 1 ELSE 0 END)`,
              })
              .from(outcomeEvents)
              .where(inArray(outcomeEvents.contentId, contentIds))
              .groupBy(outcomeEvents.contentId)) as {
              contentId: number | null;
              contactClicks: number;
              leadSubmitted: number;
              viewingRequest: number;
              quoteRequest: number;
            }[])
          : [];

      const outcomeSignalByContentId = new Map<number, OutcomeSignal>(
        outcomeSignalRows
          .filter(row => row.contentId != null)
          .map(row => [
            Number(row.contentId),
            {
              contactClicks: toFiniteNumber(row.contactClicks, 0),
              leadSubmitted: toFiniteNumber(row.leadSubmitted, 0),
              viewingRequest: toFiniteNumber(row.viewingRequest, 0),
              quoteRequest: toFiniteNumber(row.quoteRequest, 0),
            },
          ]),
      );

      const momentumRows: {
        actorId: number | null;
        positive: number;
        negative: number;
        exposureEvents: number;
      }[] =
        actorIds.length > 0
          ? ((await db
              .select({
                actorId: interactionEvents.actorId,
                positive: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} IN ('viewComplete', 'save', 'share', 'profileClick', 'listingOpen', 'contactClick') THEN 1 ELSE 0 END)`,
                negative: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} IN ('notInterested', 'report') THEN 1 ELSE 0 END)`,
                exposureEvents: sql<number>`SUM(CASE WHEN ${interactionEvents.eventType} IN ('impression', 'viewProgress', 'viewComplete') THEN 1 ELSE 0 END)`,
              })
              .from(interactionEvents)
              .where(
                and(
                  inArray(interactionEvents.actorId, actorIds),
                  sql`${interactionEvents.createdAt} >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
                ),
              )
              .groupBy(interactionEvents.actorId)) as {
              actorId: number | null;
              positive: number;
              negative: number;
              exposureEvents: number;
            }[])
          : [];

      const momentumByActorId = new Map<number, MomentumSignal>(
        momentumRows
          .filter(row => row.actorId != null)
          .map(row => [
            Number(row.actorId),
            {
              positive: toFiniteNumber(row.positive, 0),
              negative: toFiniteNumber(row.negative, 0),
              exposureEvents: toFiniteNumber(row.exposureEvents, 0),
            },
          ]),
      );

      const viewerActorInfluenceRows: {
        actorId: number | null;
        interactions24h: number;
      }[] =
        viewerUserId && actorIds.length > 0
          ? ((await db
              .select({
                actorId: interactionEvents.actorId,
                interactions24h: sql<number>`COUNT(*)`,
              })
              .from(interactionEvents)
              .where(
                and(
                  eq(interactionEvents.viewerUserId, viewerUserId),
                  inArray(interactionEvents.actorId, actorIds),
                  sql`${interactionEvents.createdAt} >= DATE_SUB(NOW(), INTERVAL 1 DAY)`,
                ),
              )
              .groupBy(interactionEvents.actorId)) as {
              actorId: number | null;
              interactions24h: number;
            }[])
          : [];

      const viewerInfluenceByActorId = new Map<number, ViewerActorInfluence>(
        viewerActorInfluenceRows
          .filter(row => row.actorId != null)
          .map(row => [
            Number(row.actorId),
            {
              interactions24h: toFiniteNumber(row.interactions24h, 0),
            },
          ]),
      );

      const scored = items.map((item, index) => {
        const actorId = this.getActorKey(item);
        const contentId = Number(item?.id);
        const contentSignal = contentSignalById.get(contentId) ?? {
          impressions: 0,
          viewProgress: 0,
          viewComplete: 0,
          saves: 0,
          shares: 0,
          profileClicks: 0,
          listingOpens: 0,
          contactClicks: 0,
          notInterested: 0,
          reports: 0,
        };
        const contentExposure = Math.max(
          1,
          contentSignal.impressions + contentSignal.viewProgress + contentSignal.viewComplete,
        );
        const outcomeSignal = outcomeSignalByContentId.get(contentId) ?? {
          contactClicks: 0,
          leadSubmitted: 0,
          viewingRequest: 0,
          quoteRequest: 0,
        };
        const baseViews = toFiniteNumber(item?.stats?.views ?? item?.viewCount, 0);
        const intentMultiplier = this.getIntentMultiplier(intent, item?.category);
        const engagement = this.calculateEngagementScore({
          ...contentSignal,
          views: baseViews,
        });
        const engagementScore = engagement.score;
        const outcome = this.calculateOutcomeMultiplier({
          ...outcomeSignal,
          exposureSignals: engagement.exposureSignals,
        });
        const abuseDecay = this.calculateAbuseDecay({
          reports: contentSignal.reports,
          notInterested: contentSignal.notInterested,
          exposure: contentExposure,
        });

        if (!actorId) {
          return {
            ...item,
            actor: {
              ...item.actor,
              id: null,
              displayName: item?.actor?.displayName || 'Creator',
              actorType: item?.actor?.actorType || 'user',
              verificationStatus: item?.actor?.verificationStatus || 'unverified',
            },
            trustScore: 50,
            trustMultiplier: 0.8,
            engagementScoreV1: engagementScore,
            engagementRawScore: engagement.rawScore,
            engagementConfidence: engagement.confidenceWeight,
            intentMultiplier,
            abuseDecay: Number(abuseDecay.toFixed(6)),
            actorAbuseScore: 50,
            actorAbuseMultiplier: 0.8,
            momentumScore: 50,
            momentumMultiplier: 1,
            trustedScore: Number((engagementScore * 0.8).toFixed(6)),
            outcomeMultiplier: outcome.multiplier,
            outcomeRate: outcome.outcomeRate,
            outcomeWeighted: outcome.weightedOutcomes,
            finalScore: Number(
              (engagementScore * 0.8 * abuseDecay * 0.8 * intentMultiplier * outcome.multiplier).toFixed(
                6,
              ),
            ),
            rankingDebug: rankingDebug
              ? {
                  engagement,
                  trust: null,
                  momentum: null,
                  abuse: {
                    reports: contentSignal.reports,
                    notInterested: contentSignal.notInterested,
                    exposure: contentExposure,
                    decay: Number(abuseDecay.toFixed(6)),
                    actorAbuseScore: 50,
                    actorAbuseMultiplier: 0.8,
                  },
                  viewerActorInfluence: null,
                  intent: {
                    intent: intent ?? null,
                    category: item?.category ?? null,
                    multiplier: Number(intentMultiplier.toFixed(6)),
                  },
                  outcomes: {
                    ...outcomeSignal,
                    outcomeRate: outcome.outcomeRate,
                    weightedOutcomes: outcome.weightedOutcomes,
                    boost: outcome.boost,
                    multiplier: outcome.multiplier,
                    capped: outcome.capped,
                  },
                }
              : undefined,
            _originalIndex: index,
          };
        }

        const actor = actorById.get(actorId);
        const signal: ActorSignal = signalByActorId.get(actorId) ?? {
          reports: 0,
          exposureEvents: 0,
        };
        const user = actor ? userById.get(Number(actor.userId)) : undefined;

        const verificationStatus = String(actor?.verificationStatus ?? 'unverified');
        const profileCompleteness = toFiniteNumber(actor?.profileCompleteness, 0);
        const baseTrustScore = toFiniteNumber(actor?.trustScore, 50);
        const trustScoreModel = this.calculateTrustScore({
          baseTrustScore,
          verificationStatus,
          profileCompleteness,
          reports: signal.reports,
          exposureEvents: signal.exposureEvents,
        });
        const trustRealtimePenalty = Math.min(
          5,
          (toFiniteNumber(signal.reports, 0) / Math.max(1, toFiniteNumber(signal.exposureEvents, 0))) *
            150,
        );
        const trustScore = Math.max(0, Math.min(100, trustScoreModel - trustRealtimePenalty));
        const trustMultiplier = 0.6 + 0.4 * (trustScore / 100);
        const momentumSignal = momentumByActorId.get(actorId) ?? {
          positive: 0,
          negative: 0,
          exposureEvents: 0,
        };
        const baseMomentumScore = toFiniteNumber(actor?.momentumScore, 50);
        const momentumRealtime = this.calculateMomentumScore({
          positive: momentumSignal.positive,
          negative: momentumSignal.negative,
          exposure: momentumSignal.exposureEvents,
        });
        const momentumDelta = (momentumRealtime - 50) * 0.25;
        const momentumScore = Math.max(0, Math.min(100, baseMomentumScore + momentumDelta));
        const momentumMultiplier = 0.8 + 0.4 * (momentumScore / 100);
        const actorAbuseScore = toFiniteNumber(actor?.abuseScore, 50);
        const actorAbuseMultiplier = 0.6 + 0.4 * (actorAbuseScore / 100);
        const viewerActorInteractions = viewerInfluenceByActorId.get(actorId)?.interactions24h ?? 0;
        const viewerActorDiminishingMultiplier =
          this.calculateViewerActorDiminishingMultiplier(viewerActorInteractions);
        const trustedScore = Number((engagementScore * trustMultiplier).toFixed(6));
        const finalScore = Number(
          (
            trustedScore *
            momentumMultiplier *
            abuseDecay *
            actorAbuseMultiplier *
            viewerActorDiminishingMultiplier *
            intentMultiplier *
            outcome.multiplier
          ).toFixed(6),
        );

        return {
          ...item,
          actor: {
            ...item.actor,
            id: actorId,
            displayName: this.buildDisplayName(user as any),
            actorType: String(actor?.actorType ?? item?.actor?.actorType ?? 'user'),
            verificationStatus,
          },
          engagementScoreV1: engagementScore,
          engagementRawScore: engagement.rawScore,
          engagementConfidence: engagement.confidenceWeight,
          intentMultiplier: Number(intentMultiplier.toFixed(6)),
          abuseDecay: Number(abuseDecay.toFixed(6)),
          actorAbuseScore: Number(actorAbuseScore.toFixed(2)),
          actorAbuseMultiplier: Number(actorAbuseMultiplier.toFixed(6)),
          trustScore,
          trustMultiplier,
          momentumScore: Number(momentumScore.toFixed(2)),
          momentumMultiplier: Number(momentumMultiplier.toFixed(6)),
          viewerActorInteractions24h: viewerActorInteractions,
          viewerActorDiminishingMultiplier,
          trustedScore,
          outcomeMultiplier: outcome.multiplier,
          outcomeRate: outcome.outcomeRate,
          outcomeWeighted: outcome.weightedOutcomes,
          finalScore,
          rankingDebug: rankingDebug
            ? {
                engagement,
                trust: {
                  baseTrustScore,
                  verificationStatus,
                  profileCompleteness,
                  reports: signal.reports,
                  exposureEvents: signal.exposureEvents,
                  trustScoreModel,
                  trustRealtimePenalty: Number(trustRealtimePenalty.toFixed(6)),
                  trustScore,
                  trustMultiplier,
                },
                momentum: {
                  baseMomentumScore: Number(baseMomentumScore.toFixed(2)),
                  positive: momentumSignal.positive,
                  negative: momentumSignal.negative,
                  exposureEvents: momentumSignal.exposureEvents,
                  realtimeMomentum: Number(momentumRealtime.toFixed(2)),
                  momentumDelta: Number(momentumDelta.toFixed(6)),
                  momentumScore: Number(momentumScore.toFixed(2)),
                  momentumMultiplier: Number(momentumMultiplier.toFixed(6)),
                },
                abuse: {
                  reports: contentSignal.reports,
                  notInterested: contentSignal.notInterested,
                  exposure: contentExposure,
                  decay: Number(abuseDecay.toFixed(6)),
                  actorAbuseScore: Number(actorAbuseScore.toFixed(2)),
                  actorAbuseMultiplier: Number(actorAbuseMultiplier.toFixed(6)),
                },
                viewerActorInfluence: {
                  interactions24h: viewerActorInteractions,
                  diminishingMultiplier: viewerActorDiminishingMultiplier,
                },
                intent: {
                  intent: intent ?? null,
                  category: item?.category ?? null,
                  multiplier: Number(intentMultiplier.toFixed(6)),
                },
                outcomes: {
                  ...outcomeSignal,
                  outcomeRate: outcome.outcomeRate,
                  weightedOutcomes: outcome.weightedOutcomes,
                  boost: outcome.boost,
                  multiplier: outcome.multiplier,
                  capped: outcome.capped,
                },
              }
            : undefined,
          _originalIndex: index,
        };
      });

      scored.sort((a, b) => {
        if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
        if (b.trustedScore !== a.trustedScore) return b.trustedScore - a.trustedScore;
        return a._originalIndex - b._originalIndex;
      });

      const fairResult = this.applyActorFairnessCaps(scored);
      const adjustmentsByItemId = new Map<
        number,
        Array<{
          reason: 'per_actor_cap' | 'diversity_swap';
          fromIndex: number;
          toIndex: number | null;
        }>
      >();

      for (const adjustment of fairResult.adjustments) {
        if (!Number.isFinite(adjustment.itemId) || adjustment.itemId <= 0) continue;
        const bucket = adjustmentsByItemId.get(adjustment.itemId) ?? [];
        bucket.push({
          reason: adjustment.reason,
          fromIndex: adjustment.fromIndex,
          toIndex: adjustment.toIndex,
        });
        adjustmentsByItemId.set(adjustment.itemId, bucket);
      }

      return fairResult.items.map(({ _originalIndex, rankingDebug: itemRankingDebug, ...item }) => {
        if (!rankingDebug) {
          return item;
        }

        const itemId = Number(item?.id);
        const fairnessAdjustments =
          Number.isFinite(itemId) && itemId > 0 ? (adjustmentsByItemId.get(itemId) ?? []) : [];

        return {
          ...item,
          rankingDebug: {
            ...(itemRankingDebug ?? {}),
            fairness: {
              adjustmentsApplied: fairnessAdjustments,
            },
            final: {
              finalScore: item.finalScore,
              trustedScore: item.trustedScore,
            },
          },
        };
      });
    } catch (error) {
      console.warn('[ExploreFeed] Trust/Diversity pass skipped:', (error as any)?.message || error);
      return items;
    }
  }

  async getPersonalizedFeed(options: FeedOptions): Promise<FeedResult> {
    return this.getFeed('recommended', options);
  }

  async getCategories(): Promise<any[]> {
    return CANONICAL_CATEGORIES.map((category, index) => ({
      id: index + 1,
      key: category,
      name: category.replace('_', ' ').replace(/\b\w/g, char => char.toUpperCase()),
    }));
  }

  async getTopics(): Promise<any[]> {
    return this.getCategories();
  }
  async getRecommendedFeed(options: FeedOptions): Promise<FeedResult> {
    const {
      userId,
      intent,
      rankingDebug = false,
      limit = 20,
      offset = 0,
      location,
      seed,
      seenIds,
    } = options;
    const creatorActorId = toPositiveInt(options.creatorActorId);

    const cacheKey = CacheKeys.recommendedFeed(userId, limit, offset);
    const seedNormalized = normalizeSeed(seed);
    const jitter = seededJitterExpr(seedNormalized);
    const normalizedSeenIds = normalizeSeenIds(seenIds);

    const useCache =
      process.env.NODE_ENV === 'production' &&
      !seedNormalized &&
      normalizedSeenIds.length === 0 &&
      !location &&
      !intent &&
      !rankingDebug;

    if (useCache) {
      const cached = await cache.get<FeedResult>(cacheKey);
      if (cached) return cached;
    }

    const debugTag = process.env.NODE_ENV !== 'production' ? makeEmptyFeedDebugTag() : null;
    const contentSelect = await this.getExploreReadSelectShape();
    const hasActorIdColumn = await this.hasExploreReadColumn('actor_id');

    const baseWhere: any[] = [
      inArray(exploreContent.contentType, [...CANONICAL_CONTENT_TYPES]),
      eq(exploreContent.isActive, 1),
    ];

    const commonBase: any[] = [...baseWhere, hasPlayableMedia];
    if (creatorActorId && hasActorIdColumn) {
      commonBase.push(eq(exploreContent.actorId, creatorActorId));
    } else if (creatorActorId && !hasActorIdColumn) {
      warnSchemaCapabilityOnce(
        'explore-feed-missing-actor-id-filter-skipped',
        '[ExploreFeed] creatorActorId filter skipped: explore_content.actor_id column is missing.',
      );
    }

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
          .select(contentSelect as any)
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
            .select(contentSelect as any)
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
          .select(contentSelect as any)
          .from(exploreContent)
          .where(and(...newWhere))
          .orderBy(desc(exploreContent.createdAt))
          .limit(takeNew)
      : [];

    // Exclude IDs already taken
    const excludeIds = Array.from(
      new Set<number>([
        ...featuredRows.map(r => r.id).filter(Boolean),
        ...nearYouRows.map(r => r.id).filter(Boolean),
        ...newRows.map(r => r.id).filter(Boolean),
      ]),
    );

    const notInExclude = notInIdsExpr(exploreContent.id, excludeIds);

    const rankedWhere: any[] = [...commonBase];
    if (notInExclude) rankedWhere.push(notInExclude);

    const rankedRows = takeRanked
      ? await db
          .select(contentSelect as any)
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
      ...nearYouRows.map(r => ({ ...r, _reason: 'near_you' })),
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

    const geoContext = this.getGeoContext(options);
    const monetizedItems = await feedRankingService.applyGeographicDominanceToItems(items, geoContext);
    const trustedItems = await this.applyTrustAndDiversity(monetizedItems, {
      viewerUserId: userId,
      rankingDebug,
      intent,
    });
    const purity = this.applySectionPurity(trustedItems, options);
    const displayItems = purity.items;
    const nextOffset = offset + rankedRows.length;
    const hasMore = takeRanked > 0 && rankedRows.length === takeRanked;

    const result: FeedResult = {
      items: displayItems,
      ...this.withLegacyShortsAlias(displayItems),
      cursor: hasMore ? encodeOffsetCursor(nextOffset) : undefined,
      feedType: 'recommended',
      hasMore,
      offset: nextOffset,
      metadata: {
        personalized: false,
        paidDominanceApplied: Boolean(geoContext),
        rankingDebug,
        intent: intent ?? null,
        creatorActorId: creatorActorId ?? null,
        ...(purity.sectionPurity ? { sectionPurity: purity.sectionPurity } : {}),
        ...(process.env.NODE_ENV !== 'production' ? { debug: true } : {}),
      },
    };

    if (useCache) await cache.set(cacheKey, result, CacheTTL.FEED);

    return result;
  }

  // ────────────────────────────────────────────────
  // The other feed methods remain unchanged
  // ────────────────────────────────────────────────

  async getAreaFeed(options: FeedOptions): Promise<FeedResult> {
    const { location, limit = 20, offset = 0 } = options;
    const creatorActorId = toPositiveInt(options.creatorActorId);
    const hasActorIdColumn = await this.hasExploreReadColumn('actor_id');
    const contentSelect = await this.getExploreReadSelectShape();
    if (!location) throw new Error('Location required');
    const loc = location.toLowerCase();

    const rows = await db
      .select(contentSelect as any)
      .from(exploreContent)
      .leftJoin(listings, eq(exploreContent.referenceId, listings.id))
      .leftJoin(developments, eq(exploreContent.referenceId, developments.id))
      .where(
        and(
          inArray(exploreContent.contentType, [...CANONICAL_CONTENT_TYPES]),
          eq(exploreContent.isActive, 1),
          ...(creatorActorId && hasActorIdColumn ? [eq(exploreContent.actorId, creatorActorId)] : []),
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

    const items = rows.map(transformShort);

    if (process.env.NODE_ENV !== 'production' && items.length === 0) {
      console.warn('[Explore] EMPTY AREA FEED DEBUG', {
        location,
        limit,
        offset,
        returned: items.length,
      });
    }

    const geoContext = this.getGeoContext(options);
    const monetizedItems = await feedRankingService.applyGeographicDominanceToItems(items, geoContext);
    const trustedItems = await this.applyTrustAndDiversity(monetizedItems, {
      viewerUserId: options.userId,
      rankingDebug: options.rankingDebug,
      intent: options.intent,
    });
    const hasMore = rows.length === limit;
    const nextOffset = offset + rows.length;

    return {
      items: trustedItems,
      ...this.withLegacyShortsAlias(trustedItems),
      cursor: hasMore ? encodeOffsetCursor(nextOffset) : undefined,
      feedType: 'area',
      hasMore,
      offset: nextOffset,
      metadata: {
        location,
        rankingDebug: Boolean(options.rankingDebug),
        intent: options.intent ?? null,
        creatorActorId: creatorActorId ?? null,
      },
    };
  }

  async getAgentFeed(options: FeedOptions): Promise<FeedResult> {
    const { agentId, limit = 20, offset = 0 } = options;
    const contentSelect = await this.getExploreReadSelectShape();
    if (!agentId) throw new Error('Agent ID required');

    const rows = await db
      .select(contentSelect as any)
      .from(exploreContent)
      .where(
        and(
          inArray(exploreContent.contentType, [...CANONICAL_CONTENT_TYPES]),
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

    const monetizedItems = await feedRankingService.applyGeographicDominanceToItems(
      items,
      this.getGeoContext(options),
    );
    const trustedItems = await this.applyTrustAndDiversity(monetizedItems, {
      viewerUserId: options.userId,
      rankingDebug: options.rankingDebug,
      intent: options.intent,
    });
    const hasMore = rows.length === limit;
    const nextOffset = offset + rows.length;

    return {
      items: trustedItems,
      ...this.withLegacyShortsAlias(trustedItems),
      cursor: hasMore ? encodeOffsetCursor(nextOffset) : undefined,
      feedType: 'agent',
      hasMore,
      offset: nextOffset,
      metadata: {
        agentId,
        rankingDebug: Boolean(options.rankingDebug),
        intent: options.intent ?? null,
        creatorActorId: toPositiveInt(options.creatorActorId) ?? null,
      },
    };
  }

  async getDeveloperFeed(options: FeedOptions): Promise<FeedResult> {
    const { developerId, limit = 20, offset = 0 } = options;
    const contentSelect = await this.getExploreReadSelectShape();
    if (!developerId) throw new Error('Developer ID required');

    const rows = await db
      .select(contentSelect as any)
      .from(exploreContent)
      .where(
        and(
          inArray(exploreContent.contentType, [...CANONICAL_CONTENT_TYPES]),
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

    const monetizedItems = await feedRankingService.applyGeographicDominanceToItems(
      items,
      this.getGeoContext(options),
    );
    const trustedItems = await this.applyTrustAndDiversity(monetizedItems, {
      viewerUserId: options.userId,
      rankingDebug: options.rankingDebug,
      intent: options.intent,
    });
    const hasMore = rows.length === limit;
    const nextOffset = offset + rows.length;

    return {
      items: trustedItems,
      ...this.withLegacyShortsAlias(trustedItems),
      cursor: hasMore ? encodeOffsetCursor(nextOffset) : undefined,
      feedType: 'developer',
      hasMore,
      offset: nextOffset,
      metadata: {
        developerId,
        rankingDebug: Boolean(options.rankingDebug),
        intent: options.intent ?? null,
        creatorActorId: toPositiveInt(options.creatorActorId) ?? null,
      },
    };
  }

  async getAgencyFeed(options: FeedOptions): Promise<FeedResult> {
    const { agencyId, limit = 20, offset = 0 } = options;
    const contentSelect = await this.getExploreReadSelectShape();
    if (!agencyId) throw new Error('Agency ID required');

    const rows = await db
      .select(contentSelect as any)
      .from(exploreContent)
      .where(
        and(
          inArray(exploreContent.contentType, [...CANONICAL_CONTENT_TYPES]),
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

    const monetizedItems = await feedRankingService.applyGeographicDominanceToItems(
      items,
      this.getGeoContext(options),
    );
    const trustedItems = await this.applyTrustAndDiversity(monetizedItems, {
      viewerUserId: options.userId,
      rankingDebug: options.rankingDebug,
      intent: options.intent,
    });
    const hasMore = rows.length === limit;
    const nextOffset = offset + rows.length;

    return {
      items: trustedItems,
      ...this.withLegacyShortsAlias(trustedItems),
      cursor: hasMore ? encodeOffsetCursor(nextOffset) : undefined,
      feedType: 'agency',
      hasMore,
      offset: nextOffset,
      metadata: {
        agencyId,
        rankingDebug: Boolean(options.rankingDebug),
        intent: options.intent ?? null,
        creatorActorId: toPositiveInt(options.creatorActorId) ?? null,
      },
    };
  }

  async getCategoryFeed(options: FeedOptions): Promise<FeedResult> {
    const { category, limit = 20, offset = 0 } = options;
    const creatorActorId = toPositiveInt(options.creatorActorId);
    const hasActorIdColumn = await this.hasExploreReadColumn('actor_id');
    const hasCategoryColumn = await this.hasExploreReadColumn('category');
    const contentSelect = await this.getExploreReadSelectShape();
    if (!category) throw new Error('Category required');
    const cat = category.toLowerCase();
    const normalizedCategory = parseEnumValue(category, CANONICAL_CATEGORIES, 'property');

    const rows = await db
      .select(contentSelect as any)
      .from(exploreContent)
      .where(
        and(
          inArray(exploreContent.contentType, [...CANONICAL_CONTENT_TYPES]),
          eq(exploreContent.isActive, 1),
          ...(creatorActorId && hasActorIdColumn ? [eq(exploreContent.actorId, creatorActorId)] : []),
          hasPlayableMedia,
          hasCategoryColumn
            ? sql`(
                LOWER(COALESCE(${exploreContent.category}, '')) = ${normalizedCategory}
                OR
                LOWER(COALESCE(${exploreContent.title}, '')) LIKE ${`%${cat}%`}
                OR LOWER(COALESCE(${exploreContent.description}, '')) LIKE ${`%${cat}%`}
              )`
            : sql`(
                LOWER(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(${exploreContent.metadata}, '$.category')), '')) = ${normalizedCategory}
                OR LOWER(COALESCE(${exploreContent.title}, '')) LIKE ${`%${cat}%`}
                OR LOWER(COALESCE(${exploreContent.description}, '')) LIKE ${`%${cat}%`}
              )`,
        ),
      )
      .orderBy(desc(exploreContent.createdAt))
      .limit(limit)
      .offset(offset);

    const items = rows.map(transformShort);

    if (process.env.NODE_ENV !== 'production' && items.length === 0) {
      console.warn('[Explore] EMPTY CATEGORY FEED DEBUG', {
        category,
        limit,
        offset,
        returned: items.length,
      });
    }

    const monetizedItems = await feedRankingService.applyGeographicDominanceToItems(
      items,
      this.getGeoContext(options),
    );
    const trustedItems = await this.applyTrustAndDiversity(monetizedItems, {
      viewerUserId: options.userId,
      rankingDebug: options.rankingDebug,
      intent: options.intent,
    });
    const hasMore = rows.length === limit;
    const nextOffset = offset + rows.length;

    return {
      items: trustedItems,
      ...this.withLegacyShortsAlias(trustedItems),
      cursor: hasMore ? encodeOffsetCursor(nextOffset) : undefined,
      feedType: 'category',
      hasMore,
      offset: nextOffset,
      metadata: {
        category,
        rankingDebug: Boolean(options.rankingDebug),
        intent: options.intent ?? null,
        creatorActorId: creatorActorId ?? null,
      },
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
