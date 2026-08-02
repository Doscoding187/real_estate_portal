import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, protectedProcedure, router } from './_core/trpc';
import { getDb } from './db';
import { exploreFeedService } from './services/exploreFeedService';
import { exploreInteractionService } from './services/exploreInteractionService';
import { requireUser } from './_core/requireUser';
import {
  assertExploreReferenceOwnership,
  ExplorePublishingAuthorizationError,
  getExplorePublishingAccessMessage,
  getExplorePublishingEligibility,
} from './services/explorePublishingEligibilityService';
import { exploreContent } from '../drizzle/schema';
import { getUserFavorites } from './db';

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
        location: z.string().optional(),
        category: z.string().optional(),
        agentId: z.number().optional(),
        developerId: z.number().optional(),
        agencyId: z.number().optional(),
        includeAgentContent: z.boolean().default(true),
        userId: z.number().optional(),
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
          if (!input.location) {
            throw new Error('Location is required for area feed');
          }
          return exploreFeedService.getAreaFeed({
            location: input.location,
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
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id;
      const sessionId = `session-${Date.now()}`; // Generate session ID
      const resolvedContentId = input.contentId ?? input.shortId!;

      await exploreInteractionService.recordInteraction({
        contentId: resolvedContentId,
        userId,
        sessionId,
        interactionType: input.interactionType,
        duration: input.duration,
        feedType: input.feedType,
        feedContext: input.feedContext || {},
        deviceType: input.deviceType,
        userAgent: ctx.req.headers['user-agent'] || '',
        ipAddress: ctx.req.ip || '',
      });

      return { success: true };
    }),

  // Legacy save path. Property saves are owned by properties.toggleFavorite.
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
          'Explore property saves are not available in the legacy Explore workflow. Use properties.toggleFavorite.',
      });
    }),

  // Saved properties use the canonical property-favorites workflow.
  getSavedProperties: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const saved = await getUserFavorites(requireUser(ctx).id);
      const start = input.offset;
      const end = start + input.limit;

      return {
        data: {
          items: saved.slice(start, end).map(item => ({
            id: item.id,
            propertyId: item.propertyId,
            property: item.property,
            savedAt: item.createdAt,
          })),
          total: saved.length,
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

  getFollowedItems: protectedProcedure.query(async () => {
    return { items: { neighbourhoods: [], creators: [] } };
  }),

  // Get topics
  getTopics: publicProcedure.query(async () => {
    return exploreFeedService.getTopics();
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
        listingId: z.number().optional(),
        developmentId: z.number().optional(),
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
      const result = await db.insert(exploreContent).values({
        contentType: 'video',
        referenceId: input.listingId || input.developmentId || 0,
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
