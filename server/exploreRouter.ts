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
      await exploreInteractionService.saveProperty(resolvedContentId, ctx.user.id);
      return { success: true };
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
    const { db } = await import('./db');
    const { exploreHighlightTags } = await import('../drizzle/schema');
    const { eq, asc } = await import('drizzle-orm');

    const tags = await db
      .select()
      .from(exploreHighlightTags)
      .where(eq(exploreHighlightTags.isActive, 1)) // MySQL uses 1 for true
      .orderBy(asc(exploreHighlightTags.displayOrder));

    return tags;
  }),

  // Get categories
  getCategories: publicProcedure.query(async () => {
    return exploreFeedService.getCategories();
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

      // Get user's agent or developer ID and detect agency affiliation
      // Requirements 10.1, 10.2, 10.4: Auto-detect and populate agency attribution, respect opt-out
      let agentId: number | null = null;
      let developerId: number | null = null;
      let agencyId: number | null = null;
      let creatorType: 'user' | 'agent' | 'developer' | 'agency' = 'user';

      if (ctx.user.role === 'agent') {
        const agent = await db
          .select({
            id: agents.id,
            agencyId: agents.agencyId,
          })
          .from(agents)
          .where(eq(agents.userId, ctx.user.id))
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
      } else if (ctx.user.role === 'property_developer') {
        const developer = await db
          .select()
          .from(developers)
          .where(eq(developers.userId, ctx.user.id))
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
        userId: ctx.user.id,
        agentId,
        developerId,
        agencyId,
      });

      // Create the explore content (unified system - no more exploreShorts)
      const result = await db.insert(exploreContent).values({
        contentType: 'video',
        referenceId: input.listingId || input.developmentId || 0,
        creatorId: ctx.user.id,
        creatorType,
        agencyId,
        title: input.title,
        description: input.caption || null,
        videoUrl: input.mediaUrls[0] || null,
        thumbnailUrl: input.mediaUrls[1] || null,
        metadata: {
          highlights: input.highlights?.filter(h => h.trim()) || [],
          listingId: input.listingId,
          developmentId: input.developmentId,
          agentId,
          developerId,
          mediaUrls: input.mediaUrls,
        },
        isActive: 1,
        isFeatured: 0,
      });

      return {
        success: true,
        shortId: Number(result.insertId),
        contentId: Number(result.insertId), // Return both for compatibility
      };
    }),
});

export type ExploreRouter = typeof exploreRouter;
