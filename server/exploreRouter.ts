import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from './_core/trpc';
import { exploreFeedService } from './services/exploreFeedService';
import { exploreInteractionService } from './services/exploreInteractionService';

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
        feedType: z.enum(['recommended', 'area', 'category', 'agent', 'developer']),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
        location: z.string().optional(),
        category: z.string().optional(),
        agentId: z.number().optional(),
        developerId: z.number().optional(),
        userId: z.number().optional(),
      })
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
        
        default:
          throw new Error('Invalid feed type');
      }
    }),

  // Record interaction
  recordInteraction: publicProcedure
    .input(
      z.object({
        shortId: z.number(),
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
        feedType: z.enum(['recommended', 'area', 'category', 'agent', 'developer']),
        feedContext: z.record(z.any()).optional(),
        deviceType: z.enum(['mobile', 'tablet', 'desktop']).default('mobile'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id;
      const sessionId = `session-${Date.now()}`; // Generate session ID

      await exploreInteractionService.recordInteraction({
        shortId: input.shortId,
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

  // Save property
  saveProperty: protectedProcedure
    .input(
      z.object({
        shortId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await exploreInteractionService.saveProperty(input.shortId, ctx.user.id);
      return { success: true };
    }),

  // Share property
  shareProperty: publicProcedure
    .input(
      z.object({
        shortId: z.number(),
        platform: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id;
      const sessionId = `session-${Date.now()}`;

      await exploreInteractionService.shareProperty(
        input.shortId,
        userId,
        sessionId,
        input.platform
      );

      return { success: true };
    }),

  // Get highlight tags
  getHighlightTags: publicProcedure.query(async () => {
    const { db } = await import('./db');
    const { exploreHighlightTags } = await import('../drizzle/schema');
    const { eq } = await import('drizzle-orm');

    const tags = await db
      .select()
      .from(exploreHighlightTags)
      .where(eq(exploreHighlightTags.isActive, 1)) // MySQL uses 1 for true
      .orderBy(exploreHighlightTags.displayOrder);

    return tags;
  }),
});

export type ExploreRouter = typeof exploreRouter;
