import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, protectedProcedure, router, superAdminProcedure } from './_core/trpc';
import { exploreFeedService } from './services/exploreFeedService';
import { exploreInteractionService } from './services/exploreInteractionService';
import { requireUser } from './_core/requireUser';
import { getOrCreateEconomicActorForUser } from './services/economicActorService';
import { getRuntimeSchemaCapabilities, warnSchemaCapabilityOnce } from './services/runtimeSchemaCapabilities';
import { db } from './db';
import { exploreContent, exploreUserIntents } from '../drizzle/schema';
import { and, eq, sql } from 'drizzle-orm';
import type { ExploreIntent } from '../shared/types';
import { canRoleUploadToExplore } from './lib/exploreUploadAccess';

/**
 * Explore Shorts tRPC Router
 *
 * Provides API endpoints for the Property Explore Shorts feature
 */

function decodeOffsetCursor(cursor?: string): number | undefined {
  if (!cursor) return undefined;
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    const offset = Number(decoded?.offset);
    if (Number.isFinite(offset) && offset >= 0) {
      return offset;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function validateUploadConstraints(input: {
  contentType: 'short' | 'walkthrough' | 'showcase';
  durationSec: number;
  width: number;
  height: number;
  orientation: 'vertical' | 'horizontal' | 'square';
}) {
  const { contentType, durationSec, width, height, orientation } = input;
  const inferredOrientation =
    height > width ? 'vertical' : width > height ? 'horizontal' : 'square';

  if (inferredOrientation !== orientation) {
    throw new Error('Orientation does not match provided width/height');
  }

  if (contentType === 'short') {
    if (durationSec > 90) {
      throw new Error('Short content must be 90 seconds or less');
    }
    const ratio = width / height;
    const target = 9 / 16;
    if (Math.abs(ratio - target) > 0.08 || orientation !== 'vertical') {
      throw new Error('Short content must be vertical 9:16 format');
    }
  }

  if (contentType === 'walkthrough' && durationSec > 600) {
    throw new Error('Walkthrough content must be 10 minutes or less');
  }

  if (contentType === 'showcase' && durationSec > 180) {
    throw new Error('Showcase content must be 3 minutes or less');
  }
}

function isRankingDebugAllowed(role?: string | null) {
  return role === 'super_admin' || role === 'agency_admin';
}

function mapOutcomeToInteractionType(
  outcomeType: 'contactClick' | 'leadSubmitted' | 'viewingRequest' | 'quoteRequest',
):
  | 'contactClick'
  | 'book_viewing' {
  switch (outcomeType) {
    case 'viewingRequest':
      return 'book_viewing';
    case 'contactClick':
    case 'leadSubmitted':
    case 'quoteRequest':
    default:
      return 'contactClick';
  }
}

function sanitizeFeedContext(input?: Record<string, unknown>) {
  if (!input) return {};
  const safe: Record<string, string | number | boolean> = {};
  const entries = Object.entries(input).slice(0, 24);

  for (const [key, value] of entries) {
    if (!key || key.length > 48) continue;
    if (typeof value === 'string') {
      safe[key] = value.slice(0, 160);
      continue;
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) continue;
      safe[key] = Number(value.toFixed(6));
      continue;
    }
    if (typeof value === 'boolean') {
      safe[key] = value;
    }
  }

  return safe;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const EXPLORE_CONTENT_COLUMN_CACHE_TTL_MS = 60_000;
type ExploreColumnInfo = {
  name: string;
  isNullable: boolean;
  dataType: string;
};
let exploreContentColumnCache: {
  columns: Set<string>;
  details: Map<string, ExploreColumnInfo>;
  expiresAt: number;
} | null = null;

function normalizeColumnRows(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) {
    if (result.length > 0 && Array.isArray(result[0])) {
      return result[0] as Array<Record<string, unknown>>;
    }
    if (result.length > 0 && typeof result[0] === 'object') {
      return result as Array<Record<string, unknown>>;
    }
  }
  if (result && typeof result === 'object' && Array.isArray((result as any).rows)) {
    return (result as any).rows as Array<Record<string, unknown>>;
  }
  return [];
}

async function getExploreContentColumnInfo(): Promise<{
  columns: Set<string>;
  details: Map<string, ExploreColumnInfo>;
}> {
  const now = Date.now();
  if (exploreContentColumnCache && exploreContentColumnCache.expiresAt > now) {
    return {
      columns: exploreContentColumnCache.columns,
      details: exploreContentColumnCache.details,
    };
  }

  try {
    const result = await db.execute(sql`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'explore_content'
    `);

    const rows = normalizeColumnRows(result);
    const columns = new Set<string>();
    const details = new Map<string, ExploreColumnInfo>();
    for (const row of rows) {
      const columnName = String(
        row.column_name ?? row.COLUMN_NAME ?? Object.values(row)[0] ?? '',
      ).trim();
      if (columnName) {
        columns.add(columnName);
        const isNullable =
          String(row.is_nullable ?? row.IS_NULLABLE ?? 'NO')
            .trim()
            .toUpperCase() === 'YES';
        const dataType = String(row.data_type ?? row.DATA_TYPE ?? '')
          .trim()
          .toLowerCase();
        details.set(columnName, {
          name: columnName,
          isNullable,
          dataType,
        });
      }
    }

    exploreContentColumnCache = {
      columns,
      details,
      expiresAt: now + EXPLORE_CONTENT_COLUMN_CACHE_TTL_MS,
    };
    return { columns, details };
  } catch (error) {
    warnSchemaCapabilityOnce(
      'explore-uploadShort-column-discovery-failed',
      '[explore.uploadShort] Failed to inspect explore_content columns. Falling back to conservative column set.',
      error,
    );
    // Conservative fallback for legacy explore_content schema.
    const columns = new Set<string>([
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
      'is_active',
      'is_featured',
    ]);
    const details = new Map<string, ExploreColumnInfo>();
    for (const column of columns) {
      details.set(column, {
        name: column,
        isNullable: !['content_type', 'reference_id'].includes(column),
        dataType: column === 'metadata' ? 'json' : 'varchar',
      });
    }
    return { columns, details };
  }
}

function sqlIdentifier(column: string) {
  if (!/^[a-z0-9_]+$/i.test(column)) {
    throw new Error(`Invalid SQL identifier: ${column}`);
  }
  return sql.raw(`\`${column}\``);
}

function extractInsertId(result: unknown): number {
  if (Array.isArray(result) && result.length > 0) {
    const first = result[0] as Record<string, unknown>;
    const value = Number(first?.insertId ?? first?.insert_id ?? 0);
    if (Number.isFinite(value) && value > 0) return value;
  }

  if (result && typeof result === 'object') {
    const row = result as Record<string, unknown>;
    const direct = Number(row.insertId ?? row.insert_id ?? 0);
    if (Number.isFinite(direct) && direct > 0) return direct;
    if (Array.isArray(row.rows) && row.rows.length > 0) {
      const first = row.rows[0] as Record<string, unknown>;
      const nested = Number(first?.insertId ?? first?.insert_id ?? 0);
      if (Number.isFinite(nested) && nested > 0) return nested;
    }
  }

  return 0;
}

type LegacyExploreIntent = ExploreIntent;

function normalizeIntentSeed(value?: string): string | undefined {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  return normalized.length ? normalized : undefined;
}

function mapIntentFocusToLegacyIntent(
  intentFocus?: string,
  intentSubFocus?: string,
): LegacyExploreIntent | undefined {
  const focus = normalizeIntentSeed(intentFocus);
  const subFocus = normalizeIntentSeed(intentSubFocus);
  if (!focus && !subFocus) return undefined;
  const source = `${focus ?? ''} ${subFocus ?? ''}`;

  if (focus === 'sell' || source.includes('sell')) return 'sell';
  if (focus === 'finance' || focus === 'investment_finance' || source.includes('finance')) {
    return 'invest';
  }
  if (
    focus === 'renovate' ||
    focus === 'renovations' ||
    focus === 'renovation_home_improvement' ||
    focus === 'services' ||
    source.includes('renovation') ||
    source.includes('construction') ||
    source.includes('interior') ||
    source.includes('architecture')
  ) {
    return 'improve';
  }
  if (focus === 'neighbourhood' || focus === 'neighborhoods' || source.includes('neighbourhood')) {
    return 'learn';
  }
  if (focus === 'invest' || focus === 'developments' || source.includes('investment')) {
    return 'invest';
  }
  if (focus === 'buy' || focus === 'walkthroughs' || source.includes('walkthrough')) {
    return 'buy';
  }
  return undefined;
}

function withIntentDebugMetadata(params: {
  feed: any;
  mode: string;
  requestedIntentFocus?: string;
  requestedIntentSubFocus?: string;
  resolvedLegacyIntent?: LegacyExploreIntent;
  requestedCreatorActorId?: number;
}) {
  const {
    feed,
    mode,
    requestedIntentFocus,
    requestedIntentSubFocus,
    resolvedLegacyIntent,
    requestedCreatorActorId,
  } = params;
  const multipliers = Array.isArray(feed?.items)
    ? feed.items
        .map((item: any) => Number(item?.intentMultiplier))
        .filter((value: number) => Number.isFinite(value))
    : [];
  const appliedIntentMultiplier =
    multipliers.length > 0
      ? Number((multipliers.reduce((sum, value) => sum + value, 0) / multipliers.length).toFixed(6))
      : null;

  return {
    ...feed,
    metadata: {
      ...(feed?.metadata ?? {}),
      mode,
      requestedIntentFocus: requestedIntentFocus ?? null,
      requestedIntentSubFocus: requestedIntentSubFocus ?? null,
      resolvedLegacyIntent: resolvedLegacyIntent ?? null,
      requestedCreatorActorId: requestedCreatorActorId ?? null,
      appliedIntentMultiplier,
    },
  };
}

export const exploreRouter = router({
  getTrendingGlobal: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ input, ctx }) => {
      return exploreFeedService.getRecommendedFeed({
        limit: input.limit,
        offset: input.offset,
        requestId: ctx.requestId,
      });
    }),

  getCreatorSpotlight: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(24).default(8),
        windowDays: z.number().int().min(1).max(60).default(14),
      }),
    )
    .query(async ({ input }) => {
      return exploreFeedService.getCreatorSpotlight({
        limit: input.limit,
        windowDays: input.windowDays,
      });
    }),

  // Get feed based on type
  getFeed: publicProcedure
    .input(
      z.object({
        feedType: z.enum(['recommended', 'area', 'category', 'agent', 'developer', 'agency']),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
        cursor: z.string().optional(),
        location: z.string().optional(),
        locationType: z.enum(['province', 'city', 'suburb']).optional(),
        locationId: z.number().optional(),
        category: z.string().optional(),
        agentId: z.number().optional(),
        developerId: z.number().optional(),
        agencyId: z.number().optional(),
        includeAgentContent: z.boolean().default(true),
        userId: z.number().optional(),
        intent: z.enum(['buy', 'sell', 'improve', 'invest', 'learn']).optional(),
        intentFocus: z.string().trim().min(1).max(64).optional(),
        intentSubFocus: z.string().trim().min(1).max(96).optional(),
        creatorActorId: z.number().int().positive().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.user?.id || input.userId;
      const offset = decodeOffsetCursor(input.cursor) ?? input.offset;
      const requestedIntentFocus = normalizeIntentSeed(input.intentFocus);
      const requestedIntentSubFocus = normalizeIntentSeed(input.intentSubFocus);
      const requestedCreatorActorId = input.creatorActorId;
      const focusIntent = mapIntentFocusToLegacyIntent(requestedIntentFocus, requestedIntentSubFocus);
      const rankingDebug =
        process.env.EXPLORE_RANKING_DEBUG === '1' && isRankingDebugAllowed(ctx.user?.role);
      const persistedIntent =
        !input.intent && !focusIntent && userId
          ? await db
              .select({ intent: exploreUserIntents.intent })
              .from(exploreUserIntents)
              .where(eq(exploreUserIntents.userId, userId))
              .limit(1)
          : [];
      const resolvedIntent = focusIntent ?? input.intent ?? persistedIntent[0]?.intent ?? undefined;

      switch (input.feedType) {
        case 'recommended':
          return withIntentDebugMetadata({
            feed: await exploreFeedService.getRecommendedFeed({
              userId,
              intent: resolvedIntent,
              intentFocus: requestedIntentFocus,
              intentSubFocus: requestedIntentSubFocus,
              creatorActorId: requestedCreatorActorId,
              rankingDebug,
              limit: input.limit,
              offset,
              locationType: input.locationType,
              locationId: input.locationId,
              requestId: ctx.requestId,
            }),
            mode: 'recommended',
            requestedIntentFocus,
            requestedIntentSubFocus,
            resolvedLegacyIntent: resolvedIntent,
            requestedCreatorActorId,
          });

        case 'area':
          if (!input.location) {
            throw new Error('Location is required for area feed');
          }
          return withIntentDebugMetadata({
            feed: await exploreFeedService.getAreaFeed({
              userId,
              intent: resolvedIntent,
              intentFocus: requestedIntentFocus,
              intentSubFocus: requestedIntentSubFocus,
              creatorActorId: requestedCreatorActorId,
              rankingDebug,
              location: input.location,
              limit: input.limit,
              offset,
              locationType: input.locationType,
              locationId: input.locationId,
              requestId: ctx.requestId,
            }),
            mode: 'area',
            requestedIntentFocus,
            requestedIntentSubFocus,
            resolvedLegacyIntent: resolvedIntent,
            requestedCreatorActorId,
          });

        case 'category':
          if (!input.category) {
            throw new Error('Category is required for category feed');
          }
          return withIntentDebugMetadata({
            feed: await exploreFeedService.getCategoryFeed({
              userId,
              intent: resolvedIntent,
              intentFocus: requestedIntentFocus,
              intentSubFocus: requestedIntentSubFocus,
              creatorActorId: requestedCreatorActorId,
              rankingDebug,
              category: input.category,
              limit: input.limit,
              offset,
              locationType: input.locationType,
              locationId: input.locationId,
              requestId: ctx.requestId,
            }),
            mode: 'category',
            requestedIntentFocus,
            requestedIntentSubFocus,
            resolvedLegacyIntent: resolvedIntent,
            requestedCreatorActorId,
          });

        case 'agent':
          if (!input.agentId) {
            throw new Error('Agent ID is required for agent feed');
          }
          return withIntentDebugMetadata({
            feed: await exploreFeedService.getAgentFeed({
              userId,
              intent: resolvedIntent,
              intentFocus: requestedIntentFocus,
              intentSubFocus: requestedIntentSubFocus,
              creatorActorId: requestedCreatorActorId,
              rankingDebug,
              agentId: input.agentId,
              limit: input.limit,
              offset,
              locationType: input.locationType,
              locationId: input.locationId,
              requestId: ctx.requestId,
            }),
            mode: 'agent',
            requestedIntentFocus,
            requestedIntentSubFocus,
            resolvedLegacyIntent: resolvedIntent,
            requestedCreatorActorId,
          });

        case 'developer':
          if (!input.developerId) {
            throw new Error('Developer ID is required for developer feed');
          }
          return withIntentDebugMetadata({
            feed: await exploreFeedService.getDeveloperFeed({
              userId,
              intent: resolvedIntent,
              intentFocus: requestedIntentFocus,
              intentSubFocus: requestedIntentSubFocus,
              creatorActorId: requestedCreatorActorId,
              rankingDebug,
              developerId: input.developerId,
              limit: input.limit,
              offset,
              locationType: input.locationType,
              locationId: input.locationId,
              requestId: ctx.requestId,
            }),
            mode: 'developer',
            requestedIntentFocus,
            requestedIntentSubFocus,
            resolvedLegacyIntent: resolvedIntent,
            requestedCreatorActorId,
          });

        case 'agency':
          if (!input.agencyId) {
            throw new Error('Agency ID is required for agency feed');
          }
          return withIntentDebugMetadata({
            feed: await exploreFeedService.getAgencyFeed({
              userId,
              intent: resolvedIntent,
              intentFocus: requestedIntentFocus,
              intentSubFocus: requestedIntentSubFocus,
              creatorActorId: requestedCreatorActorId,
              rankingDebug,
              agencyId: input.agencyId,
              limit: input.limit,
              offset,
              includeAgentContent: input.includeAgentContent,
              locationType: input.locationType,
              locationId: input.locationId,
              requestId: ctx.requestId,
            }),
            mode: 'agency',
            requestedIntentFocus,
            requestedIntentSubFocus,
            resolvedLegacyIntent: resolvedIntent,
            requestedCreatorActorId,
          });

        default:
          throw new Error('Invalid feed type');
      }
    }),

  getPublicVideoPage: publicProcedure
    .input(
      z.object({
        contentId: z.number().int().positive(),
        relatedLimit: z.number().int().min(1).max(24).default(12),
      }),
    )
    .query(async ({ input, ctx }) => {
      const pageSize = 50;
      const maxPages = 6;
      let video: any | null = null;
      let related: any[] = [];

      for (let page = 0; page < maxPages; page++) {
        const offset = page * pageSize;
        const feed = await exploreFeedService.getRecommendedFeed({
          limit: pageSize,
          offset,
          requestId: ctx.requestId,
        });

        if (!video) {
          video = feed.items.find(item => Number(item.id) === input.contentId) ?? null;
        }

        if (video) {
          related = feed.items
            .filter(item => Number(item.id) !== Number(video.id))
            .slice(0, input.relatedLimit);
          break;
        }

        if (!feed.hasMore) break;
      }

      if (!video) {
        const row = await db
          .select({
            id: exploreContent.id,
            contentType: exploreContent.contentType,
            category: exploreContent.category,
            title: exploreContent.title,
            videoUrl: exploreContent.videoUrl,
            thumbnailUrl: exploreContent.thumbnailUrl,
            durationSec: exploreContent.durationSec,
            orientation: exploreContent.orientation,
            viewCount: exploreContent.viewCount,
            metadata: exploreContent.metadata,
          })
          .from(exploreContent)
          .where(and(eq(exploreContent.id, input.contentId), eq(exploreContent.isActive, 1)))
          .limit(1);

        const fallback = row[0];
        if (!fallback?.videoUrl) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Explore video not found',
          });
        }

        const metadata =
          fallback.metadata && typeof fallback.metadata === 'object'
            ? (fallback.metadata as Record<string, unknown>)
            : {};
        const creatorName =
          typeof metadata.creatorName === 'string' ? metadata.creatorName : 'Creator';

        video = {
          id: fallback.id,
          contentType:
            fallback.contentType === 'walkthrough' || fallback.contentType === 'showcase'
              ? fallback.contentType
              : 'short',
          category: fallback.category || 'property',
          title: fallback.title || 'Explore Video',
          mediaUrl: fallback.videoUrl,
          thumbnailUrl: fallback.thumbnailUrl || fallback.videoUrl,
          durationSec: fallback.durationSec || 30,
          orientation: fallback.orientation || 'vertical',
          actor: {
            id: null,
            displayName: creatorName,
            actorType: 'user',
            verificationStatus: 'unverified',
          },
          stats: {
            views: fallback.viewCount || 0,
            saves: 0,
            shares: 0,
          },
        };

        const relatedFeed = await exploreFeedService.getRecommendedFeed({
          limit: Math.max(input.relatedLimit + 1, 12),
          offset: 0,
          requestId: ctx.requestId,
        });
        related = relatedFeed.items
          .filter(item => Number(item.id) !== Number(video.id))
          .slice(0, input.relatedLimit);
      }

      const creatorHandle = slugify(video.actor?.displayName || 'creator');
      const canonicalSlug = `${slugify(video.title || 'video')}-${video.id}`;

      return {
        video,
        related,
        canonicalPath: `/explore/@${creatorHandle}/${canonicalSlug}`,
      };
    }),

  getIntent: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.user?.id;
    if (!userId) {
      return { intent: null as null | 'buy' | 'sell' | 'improve' | 'invest' | 'learn' };
    }

    const rows = await db
      .select({ intent: exploreUserIntents.intent })
      .from(exploreUserIntents)
      .where(eq(exploreUserIntents.userId, userId))
      .limit(1);

    return { intent: rows[0]?.intent ?? null };
  }),

  setIntent: protectedProcedure
    .input(
      z.object({
        intent: z.enum(['buy', 'sell', 'improve', 'invest', 'learn']),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = requireUser(ctx).id;
      const existing = await db
        .select({ id: exploreUserIntents.id })
        .from(exploreUserIntents)
        .where(eq(exploreUserIntents.userId, userId))
        .limit(1);

      if (existing[0]) {
        await db
          .update(exploreUserIntents)
          .set({ intent: input.intent })
          .where(eq(exploreUserIntents.userId, userId));
      } else {
        await db.insert(exploreUserIntents).values({
          userId,
          intent: input.intent,
        });
      }

      return { success: true, intent: input.intent };
    }),

  // Record interaction
  recordInteraction: publicProcedure
    .input(
      z
        .object({
          contentId: z.number().optional(),
          shortId: z.number().optional(),
          interactionType: z.enum([
            'impression',
            'view',
            'viewProgress',
            'viewComplete',
            'skip',
            'save',
            'share',
            'like',
            'profileClick',
            'listingOpen',
            'contactClick',
            'notInterested',
            'report',
            'contact',
            'whatsapp',
            'book_viewing',
          ]),
          duration: z.number().min(0).max(3600).optional(),
          feedType: z.enum(['recommended', 'area', 'category', 'agent', 'developer', 'agency']),
          feedContext: z.record(z.string(), z.unknown()).optional(),
          deviceType: z.enum(['mobile', 'tablet', 'desktop']).default('mobile'),
        })
        .refine(data => data.contentId || data.shortId, {
          message: 'Either contentId or shortId must be provided',
        }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id;
      const sanitizedFeedContext = sanitizeFeedContext(input.feedContext);
      const clientSessionId = sanitizedFeedContext.sessionId;
      const sessionId =
        typeof clientSessionId === 'string' && clientSessionId.length >= 8
          ? clientSessionId
          : `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const resolvedContentId = input.contentId ?? input.shortId!;
      const duration =
        typeof input.duration === 'number'
          ? Math.max(0, Math.min(3600, Number(input.duration.toFixed(3))))
          : undefined;

      await exploreInteractionService.recordInteraction({
        contentId: resolvedContentId,
        userId,
        sessionId,
        interactionType: input.interactionType,
        duration,
        feedType: input.feedType,
        feedContext: sanitizedFeedContext,
        deviceType: input.deviceType,
        userAgent: ctx.req.headers['user-agent'] || '',
        ipAddress: ctx.req.ip || '',
      });

      return { success: true };
    }),

  recordOutcome: publicProcedure
    .input(
      z
        .object({
          contentId: z.number().optional(),
          shortId: z.number().optional(),
          outcomeType: z.enum(['contactClick', 'leadSubmitted', 'viewingRequest', 'quoteRequest']),
          feedType: z.enum(['recommended', 'area', 'category', 'agent', 'developer', 'agency']),
          outcomeContext: z.record(z.string(), z.unknown()).optional(),
          deviceType: z.enum(['mobile', 'tablet', 'desktop']).default('mobile'),
        })
        .refine(data => data.contentId || data.shortId, {
          message: 'Either contentId or shortId must be provided',
        }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id;
      const sanitizedOutcomeContext = sanitizeFeedContext(input.outcomeContext);
      const clientSessionId = sanitizedOutcomeContext.sessionId;
      const sessionId =
        typeof clientSessionId === 'string' && clientSessionId.length >= 8
          ? clientSessionId
          : `outcome-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const resolvedContentId = input.contentId ?? input.shortId!;

      await exploreInteractionService.recordOutcome({
        contentId: resolvedContentId,
        userId,
        sessionId,
        outcomeType: input.outcomeType,
        metadata: {
          feedType: input.feedType,
          deviceType: input.deviceType,
          outcomeContext: sanitizedOutcomeContext,
        },
      });

      // Keep existing interaction and ranking signals populated while outcomes roll out.
      await exploreInteractionService.recordInteraction({
        contentId: resolvedContentId,
        userId,
        sessionId,
        interactionType: mapOutcomeToInteractionType(input.outcomeType),
        feedType: input.feedType,
        feedContext: {
          ...sanitizedOutcomeContext,
          outcomeType: input.outcomeType,
          source: 'outcome_event',
        },
        deviceType: input.deviceType,
        userAgent: ctx.req.headers['user-agent'] || '',
        ipAddress: ctx.req.ip || '',
      });

      return { success: true };
    }),

  // Save property
  saveProperty: protectedProcedure
    .input(
      z
        .object({
          contentId: z.number().optional(),
          shortId: z.number().optional(),
        })
        .refine(data => data.contentId || data.shortId, {
          message: 'Either contentId or shortId must be provided',
        }),
    )
    .mutation(async ({ input, ctx }) => {
      const resolvedContentId = input.contentId ?? input.shortId!;
      await exploreInteractionService.saveProperty(resolvedContentId, requireUser(ctx).id);
      return { success: true };
    }),

  // Saved properties (stubbed for compile)
  getSavedProperties: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async () => {
      return {
        data: {
          items: [] as any[],
          total: 0,
        },
      };
    }),

  // Share property
  shareProperty: publicProcedure
    .input(
      z
        .object({
          contentId: z.number().optional(),
          shortId: z.number().optional(),
          platform: z.string().optional(),
        })
        .refine(data => data.contentId || data.shortId, {
          message: 'Either contentId or shortId must be provided',
        }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id;
      const sessionId = `session-${Date.now()}`;
      const resolvedContentId = input.contentId ?? input.shortId!;

      await exploreInteractionService.shareProperty(
        resolvedContentId,
        userId,
        sessionId,
        input.platform,
      );

      return { success: true };
    }),

  // Get highlight tags
  getHighlightTags: publicProcedure.query(async () => {
    return [] as any[];
  }),

  // Get categories
  getCategories: publicProcedure.query(async () => {
    return exploreFeedService.getCategories();
  }),

  getFollowedItems: publicProcedure.query(async () => {
    return { items: { neighbourhoods: [], creators: [] } };
  }),

  getRankingAudit: superAdminProcedure
    .input(
      z.object({
        feedType: z.enum(['recommended', 'area', 'category', 'agent', 'developer', 'agency']),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
        location: z.string().optional(),
        category: z.string().optional(),
        agentId: z.number().optional(),
        developerId: z.number().optional(),
        agencyId: z.number().optional(),
        includeAgentContent: z.boolean().default(true),
        intent: z.enum(['buy', 'sell', 'improve', 'invest', 'learn']).optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const feed = await exploreFeedService.getFeed(input.feedType, {
        userId: ctx.user.id,
        limit: input.limit,
        offset: input.offset,
        location: input.location,
        category: input.category,
        agentId: input.agentId,
        developerId: input.developerId,
        agencyId: input.agencyId,
        includeAgentContent: input.includeAgentContent,
        intent: input.intent,
        rankingDebug: true,
      });

      return {
        feedType: input.feedType,
        hasMore: feed.hasMore,
        cursor: feed.cursor,
        count: feed.items.length,
        items: feed.items.map((item: any) => ({
          id: item.id,
          title: item.title,
          contentType: item.contentType,
          category: item.category,
          actor: item.actor ?? null,
          stats: item.stats ?? null,
          finalScore: item.finalScore ?? null,
          trustedScore: item.trustedScore ?? null,
          engagementScore: item.engagementScoreV1 ?? null,
          trustScore: item.trustScore ?? null,
          momentumScore: item.momentumScore ?? null,
          abuseDecay: item.abuseDecay ?? null,
          outcomeMultiplier: item.outcomeMultiplier ?? 1,
          rankingDebug: item.rankingDebug ?? null,
        })),
      };
    }),

  toggleCreatorFollow: protectedProcedure
    .input(
      z.object({
        creatorId: z.number().int(),
        following: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return {
        success: true,
        data: {
          following: input.following ?? true,
          creatorId: input.creatorId,
        },
      };
    }),

  toggleNeighbourhoodFollow: protectedProcedure
    .input(
      z.object({
        neighbourhoodId: z.number().int(),
        following: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return {
        success: true,
        data: {
          following: input.following ?? true,
          neighbourhoodId: input.neighbourhoodId,
        },
      };
    }),

  // Get topics
  getTopics: publicProcedure.query(async () => {
    return exploreFeedService.getTopics();
  }),

  // Upload new explore short
  uploadShort: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        caption: z.string().max(500).optional(),
        mediaUrls: z.array(z.string()).min(1).max(10),
        contentType: z.enum(['short', 'walkthrough', 'showcase']).default('short'),
        category: z.enum(['property', 'renovation', 'finance', 'investment', 'services']),
        durationSec: z.number().int().min(1),
        width: z.number().int().min(1),
        height: z.number().int().min(1),
        orientation: z.enum(['vertical', 'horizontal', 'square']),
        highlights: z.array(z.string()).max(4).optional(),
        listingId: z.number().optional(),
        developmentId: z.number().optional(),
        attributeToAgency: z.boolean().default(true), // NEW: Agency attribution opt-out
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { db } = await import('./db');
      const { exploreContent, agents, developers } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      const currentUser = requireUser(ctx);
      if (!canRoleUploadToExplore(currentUser.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            'Explore uploads are limited to verified agents, agencies, developers, partners, and admins.',
        });
      }

      validateUploadConstraints({
        contentType: input.contentType,
        durationSec: input.durationSec,
        width: input.width,
        height: input.height,
        orientation: input.orientation,
      });

      // Get user's agent or developer ID and detect agency affiliation
      // Requirements 10.1, 10.2, 10.4: Auto-detect and populate agency attribution, respect opt-out
      let agentId: number | null = null;
      let developerId: number | null = null;
      let agencyId: number | null = null;
      let creatorType: 'user' | 'agent' | 'developer' | 'agency' = 'user';

      if (currentUser.role === 'agent') {
        const agent = await db
          .select({
            id: agents.id,
            agencyId: agents.agencyId,
          })
          .from(agents)
          .where(eq(agents.userId, currentUser.id))
          .limit(1);

        if (agent[0]) {
          agentId = agent[0].id;
          creatorType = 'agent';

          // Only attribute to agency if agent opted in and has an agency
          // Requirements 10.4: Allow agents to opt-out of agency attribution
          if (input.attributeToAgency && agent[0].agencyId) {
            agencyId = agent[0].agencyId;
            console.log(`[ExploreUpload] Agent ${agentId} uploading with agency ${agencyId}`);
          } else {
            console.log(
              `[ExploreUpload] Agent ${agentId} uploading without agency attribution (opted out or no agency)`,
            );
          }
        }
      } else if (currentUser.role === 'property_developer') {
        const developer = await db
          .select()
          .from(developers)
          .where(eq(developers.userId, currentUser.id))
          .limit(1);
        developerId = developer[0]?.id || null;
        creatorType = 'developer';

        console.log(`[ExploreUpload] Developer ${developerId} uploading`);
      }

      // Validate agency attribution
      // Requirements 10.5, 4.4: Prevent invalid agency attribution
      if (agencyId) {
        // Verify agency exists
        const { agencies } = await import('../drizzle/schema');
        const agencyRecord = await db
          .select()
          .from(agencies)
          .where(eq(agencies.id, agencyId))
          .limit(1);

        if (!agencyRecord[0]) {
          throw new Error(`Agency with ID ${agencyId} does not exist`);
        }

        // Verify agent belongs to agency
        if (agentId) {
          const agentRecord = await db
            .select({ agencyId: agents.agencyId })
            .from(agents)
            .where(eq(agents.id, agentId))
            .limit(1);

          if (agentRecord[0]?.agencyId !== agencyId) {
            throw new Error(`Agent ${agentId} does not belong to agency ${agencyId}`);
          }
        }
      }

      // Log attribution decision
      console.log(`[ExploreUpload] Agency attribution decision:`, {
        userId: currentUser.id,
        agentId,
        developerId,
        agencyId,
      });

      const actorTypeHint =
        creatorType === 'agent'
          ? 'agent'
          : creatorType === 'developer'
            ? 'developer'
            : 'contractor';

      let actorId: number | null = null;
      const capabilities = await getRuntimeSchemaCapabilities();
      if (!capabilities.economicActorsReady) {
        warnSchemaCapabilityOnce(
          'explore-uploadShort-economic-actors-not-ready',
          '[explore.uploadShort] Economic actor schema not ready. Continuing without actorId.',
          capabilities.economicActorsDetails,
        );
      } else {
        try {
          const actor = await getOrCreateEconomicActorForUser({
            userId: currentUser.id,
            roleHint: currentUser.role,
            actorTypeHint,
          });
          actorId = actor.id;
        } catch (actorError) {
          // Keep uploads functional even when economic actor provisioning is partially unavailable.
          console.warn(
            '[explore.uploadShort] Economic actor resolution failed. Continuing without actorId:',
            actorError,
          );
        }
      }

      // Create the explore content (unified system - no more exploreShorts)
      const { columns: exploreContentColumns, details: exploreContentColumnDetails } =
        await getExploreContentColumnInfo();
      const requiredLegacyColumns = ['content_type', 'reference_id', 'creator_type', 'video_url'];
      const missingRequiredColumns = requiredLegacyColumns.filter(
        column => !exploreContentColumns.has(column),
      );
      if (missingRequiredColumns.length > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Explore upload schema missing required column(s): ${missingRequiredColumns.join(', ')}`,
        });
      }

      const uploadMetadata = {
        highlights: input.highlights?.filter(h => h.trim()) || [],
        listingId: input.listingId,
        developmentId: input.developmentId,
        agentId,
        developerId,
        contentType: input.contentType,
        category: input.category,
        durationSec: input.durationSec,
        width: input.width,
        height: input.height,
        orientation: input.orientation,
        mediaUrls: input.mediaUrls,
      };
      const metadataJson = JSON.stringify(uploadMetadata);
      const resolvedReferenceId = input.listingId || input.developmentId || null;
      const referenceColumn = exploreContentColumnDetails.get('reference_id');
      const persistedReferenceId =
        resolvedReferenceId === null && referenceColumn && !referenceColumn.isNullable
          ? 0
          : resolvedReferenceId;

      const insertEntries: Array<{ column: string; value: unknown }> = [];
      if (exploreContentColumns.has('content_type'))
        insertEntries.push({ column: 'content_type', value: input.contentType });
      if (exploreContentColumns.has('reference_id')) {
        insertEntries.push({
          column: 'reference_id',
          value: persistedReferenceId,
        });
      }
      if (exploreContentColumns.has('actor_id')) {
        insertEntries.push({ column: 'actor_id', value: actorId });
      }
      if (exploreContentColumns.has('creator_id')) {
        insertEntries.push({ column: 'creator_id', value: currentUser.id });
      }
      if (exploreContentColumns.has('creator_type')) {
        insertEntries.push({ column: 'creator_type', value: creatorType });
      }
      if (exploreContentColumns.has('agency_id')) {
        insertEntries.push({ column: 'agency_id', value: agencyId });
      }
      if (exploreContentColumns.has('title')) {
        insertEntries.push({ column: 'title', value: input.title });
      }
      if (exploreContentColumns.has('description')) {
        insertEntries.push({ column: 'description', value: input.caption || null });
      }
      if (exploreContentColumns.has('video_url')) {
        insertEntries.push({ column: 'video_url', value: input.mediaUrls[0] || null });
      }
      if (exploreContentColumns.has('thumbnail_url')) {
        insertEntries.push({ column: 'thumbnail_url', value: input.mediaUrls[1] || null });
      }
      if (exploreContentColumns.has('metadata')) {
        insertEntries.push({ column: 'metadata', value: metadataJson });
      }
      if (exploreContentColumns.has('category')) {
        insertEntries.push({ column: 'category', value: input.category });
      }
      if (exploreContentColumns.has('duration_sec')) {
        insertEntries.push({ column: 'duration_sec', value: input.durationSec });
      }
      if (exploreContentColumns.has('width')) {
        insertEntries.push({ column: 'width', value: input.width });
      }
      if (exploreContentColumns.has('height')) {
        insertEntries.push({ column: 'height', value: input.height });
      }
      if (exploreContentColumns.has('orientation')) {
        insertEntries.push({ column: 'orientation', value: input.orientation });
      }
      if (exploreContentColumns.has('is_active')) {
        insertEntries.push({ column: 'is_active', value: 1 });
      }
      if (exploreContentColumns.has('is_featured')) {
        insertEntries.push({ column: 'is_featured', value: 0 });
      }

      if (insertEntries.length === 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Explore upload schema does not expose writable columns.',
        });
      }

      const insertSql = sql`INSERT INTO ${sqlIdentifier('explore_content')} (${sql.join(
        insertEntries.map(entry => sqlIdentifier(entry.column)),
        sql`, `,
      )}) VALUES (${sql.join(
        insertEntries.map(entry => sql`${entry.value}`),
        sql`, `,
      )})`;
      console.log('[explore.uploadShort] Handler version=2026-02-24-column-aware-insert', {
        resolvedColumns: insertEntries.map(entry => entry.column),
      });

      let insertedId = 0;
      try {
        const rawInsertResult = await db.execute(insertSql);
        insertedId = extractInsertId(rawInsertResult);
      } catch (error: any) {
        console.error('[explore.uploadShort] insert failed', {
          code: error?.code ?? error?.cause?.code,
          sqlState: error?.sqlState ?? error?.cause?.sqlState,
          sqlMessage: error?.sqlMessage ?? error?.cause?.sqlMessage ?? error?.message,
        });
        const sqlMessage =
          String(error?.sqlMessage || '') ||
          String(error?.cause?.sqlMessage || '') ||
          String(error?.message || '');
        if (
          sqlMessage.includes('Unknown column') ||
          String(error?.code || '').includes('ER_BAD_FIELD_ERROR')
        ) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message:
              'Explore upload failed due to schema drift on explore_content. Run Explore schema migration before uploading.',
          });
        }
        throw error;
      }

      if (!insertedId) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Explore upload insert succeeded but no insertId was returned.',
        });
      }

      return {
        success: true,
        shortId: insertedId,
        contentId: insertedId, // Return both for compatibility
      };
    }),
});

export type ExploreRouter = typeof exploreRouter;
