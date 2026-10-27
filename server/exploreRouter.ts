import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { publicProcedure, protectedProcedure, router } from './_core/trpc';
import { getDb } from './db';
import { exploreFeedService } from './services/exploreFeedService';
import { requireUser } from './_core/requireUser';
import {
  assertExploreReferenceOwnership,
  ExplorePublishingAuthorizationError,
  getExplorePublishingAccessMessage,
  getExplorePublishingEligibility,
} from './services/explorePublishingEligibilityService';
import { developments, exploreContent, listings } from '../drizzle/schema';
import { PLACE_ID_REGEX } from '../shared/placeAuthority';

function unavailableExploreCatalog(name: string): never {
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: `${name} is unavailable until its canonical Explore catalog is established`,
  });
}

async function requireExplorePublisher(ctx: Parameters<typeof requireUser>[0]) {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  }

  const eligibility = await getExplorePublishingEligibility(db, requireUser(ctx));
  if (!eligibility.allowed) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: getExplorePublishingAccessMessage(eligibility),
    });
  }

  return { db, eligibility };
}

/**
 * Explore Shorts tRPC Router
 *
 * Provides API endpoints for the Property Explore Shorts feature
 */

export const exploreRouter = router({
  // Get feed based on type
  getFeed: publicProcedure
    .input(
      z.object({
        feedType: z.enum(['recommended', 'area', 'category', 'agent', 'developer', 'agency']),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
        canonicalPlaceId: z.string().regex(PLACE_ID_REGEX).optional(),
        category: z.string().optional(),
        agentId: z.number().optional(),
        developerId: z.number().optional(),
        agencyId: z.number().optional(),
        includeAgentContent: z.boolean().default(true),
        userId: z.number().optional(),
      })
        .strict()
        .superRefine((input, ctx) => {
          if (input.feedType === 'area' && !input.canonicalPlaceId) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['canonicalPlaceId'],
              message: 'Area feeds require one canonical Place ID.',
            });
          }
          if (input.feedType !== 'area' && input.canonicalPlaceId) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['canonicalPlaceId'],
              message: 'A canonical Place ID is valid only for an area feed.',
            });
          }
        }),
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.user?.id || input.userId;

      switch (input.feedType) {
        case 'recommended':
          return exploreFeedService.getRecommendedFeed({
            userId,
            limit: input.limit,
            offset: input.offset,
          });

        case 'area':
          return exploreFeedService.getAreaFeed({
            canonicalPlaceId: input.canonicalPlaceId,
            limit: input.limit,
            offset: input.offset,
          });

        case 'category':
          if (!input.category) {
            throw new Error('Category is required for category feed');
          }
          return exploreFeedService.getCategoryFeed({
            category: input.category,
            limit: input.limit,
            offset: input.offset,
          });

        case 'agent':
          if (!input.agentId) {
            throw new Error('Agent ID is required for agent feed');
          }
          return exploreFeedService.getAgentFeed({
            agentId: input.agentId,
            limit: input.limit,
            offset: input.offset,
          });

        case 'developer':
          if (!input.developerId) {
            throw new Error('Developer ID is required for developer feed');
          }
          return exploreFeedService.getDeveloperFeed({
            developerId: input.developerId,
            limit: input.limit,
            offset: input.offset,
          });

        case 'agency':
          if (!input.agencyId) {
            throw new Error('Agency ID is required for agency feed');
          }
          return exploreFeedService.getAgencyFeed({
            agencyId: input.agencyId,
            limit: input.limit,
            offset: input.offset,
            includeAgentContent: input.includeAgentContent,
          });

        default:
          throw new Error('Invalid feed type');
      }
    }),

  // Legacy engagement writes are retired. The governed discovery.engage
  // boundary owns browser-originated Explore ranking signals.
  recordInteraction: publicProcedure
    .input(
      z
        .object({
          contentId: z.number().optional(),
          shortId: z.number().optional(),
          interactionType: z.enum([
            'impression',
            'view',
            'skip',
            'save',
            'share',
            'contact',
            'whatsapp',
            'book_viewing',
          ]),
          duration: z.number().optional(),
          feedType: z.enum(['recommended', 'area', 'category', 'agent', 'developer', 'agency']),
          feedContext: z.record(z.string(), z.any()).optional(),
          deviceType: z.enum(['mobile', 'tablet', 'desktop']).default('mobile'),
        })
        .refine(data => data.contentId || data.shortId, {
          message: 'Either contentId or shortId must be provided',
        }),
    )
    .mutation(async () => {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message:
          'Legacy Explore engagement tracking is unavailable. Use the governed discovery.engage workflow.',
      });
    }),

  // Legacy save path. Property saves are owned by properties.setFavorite.
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
    .mutation(async () => {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message:
          'Explore property saves are not available in the legacy Explore workflow. Use properties.setFavorite.',
      });
    }),

  // Legacy share writes are retired with the direct interaction writer.
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
    .mutation(async () => {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message:
          'Legacy Explore sharing is unavailable. Use the governed discovery.engage workflow.',
      });
    }),

  // Get highlight tags
  getHighlightTags: publicProcedure.query(async () => {
    return unavailableExploreCatalog('Explore highlight tags');
  }),

  // Get categories
  getCategories: publicProcedure.query(async () => {
    return unavailableExploreCatalog('Explore categories');
  }),

  // Get topics
  getTopics: publicProcedure.query(async () => {
    return unavailableExploreCatalog('Explore topics');
  }),

  getPublishingEligibility: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    }
    return getExplorePublishingEligibility(db, requireUser(ctx));
  }),

  // Upload new explore short
  uploadShort: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        caption: z.string().max(500).optional(),
        mediaUrls: z.array(z.string()).min(1).max(10),
        highlights: z.array(z.string()).max(4).optional(),
        listingId: z.number().int().positive().optional(),
        developmentId: z.number().int().positive().optional(),
      }).strict().refine(input => Boolean(input.listingId) !== Boolean(input.developmentId), {
        message: 'Select exactly one canonical listing or development reference.',
        path: ['listingId'],
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { db, eligibility } = await requireExplorePublisher(ctx);
      try {
        await assertExploreReferenceOwnership(db, eligibility, input);
      } catch (error) {
        if (error instanceof ExplorePublishingAuthorizationError) {
          throw new TRPCError({ code: 'FORBIDDEN', message: error.message });
        }
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'The selected property reference is not available for this publisher.',
        });
      }

      // Submission is deliberately non-public. A later approved publication
      // authority must activate it before the public feed can discover it.
      let canonicalPlaceId: string | null = null;
      if (input.listingId) {
        const [listing] = await db
          .select({ canonicalPlaceId: listings.canonicalPlaceId })
          .from(listings)
          .where(eq(listings.id, input.listingId))
          .limit(1);
        canonicalPlaceId = listing?.canonicalPlaceId ?? null;
      } else if (input.developmentId) {
        const [development] = await db
          .select({ canonicalPlaceId: developments.canonicalPlaceId })
          .from(developments)
          .where(eq(developments.id, input.developmentId))
          .limit(1);
        canonicalPlaceId = development?.canonicalPlaceId ?? null;
      }

      const result = await db.insert(exploreContent).values({
        contentType: 'video',
        referenceId: input.listingId || input.developmentId || 0,
        canonicalPlaceId,
        creatorId: eligibility.creatorId,
        creatorType: eligibility.creatorType,
        agencyId: eligibility.agencyId,
        title: input.title,
        description: input.caption || null,
        videoUrl: input.mediaUrls[0] || null,
        thumbnailUrl: input.mediaUrls[1] || null,
        metadata: {
          highlights: input.highlights?.filter(h => h.trim()) || [],
          listingId: input.listingId,
          developmentId: input.developmentId,
          agentId: eligibility.agentId,
          developerId: eligibility.developerId,
          mediaUrls: input.mediaUrls,
        },
        isActive: 0,
        isFeatured: 0,
      });

      return {
        success: true,
        shortId: Number(result.insertId),
        contentId: Number(result.insertId),
        publicationState: 'inactive' as const,
      };
    }),
});

export type ExploreRouter = typeof exploreRouter;
