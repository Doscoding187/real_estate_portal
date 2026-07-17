import { protectedProcedure, publicProcedure, router } from '../../_core/trpc';
import {
  discoveryEngagementSchema,
  discoveryFeedResponseSchema,
  discoveryQuerySchema,
} from '../../../shared/discovery/schemas';
import { discoveryFeedService } from './services/discoveryFeedService';
import { discoveryEngagementService } from './services/discoveryEngagementService';
import { canAccessExploreOptionAPilot } from './exploreOptionAPilotAccess';
import { exploreOptionAEligibilityService } from './services/exploreOptionAEligibilityService';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { requireUser } from '../../_core/requireUser';

function requireOptionAPilotAccess(userId: number | null | undefined): void {
  if (!canAccessExploreOptionAPilot(userId)) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Not found' });
  }
}

export const discoveryRouter = router({
  getOptionAPilotAccess: protectedProcedure.query(({ ctx }) => ({
    accessible: canAccessExploreOptionAPilot(ctx.user?.id),
  })),

  getOptionAIdentityContext: protectedProcedure.query(async ({ ctx }) => {
    const operator = requireUser(ctx);
    requireOptionAPilotAccess(operator.id);

    return {
      operator: {
        userId: operator.id,
      },
      eligibleProfiles: await exploreOptionAEligibilityService.resolveEligibleProfessionalProfiles(
        operator.id,
      ),
    };
  }),

  listOptionAListingCandidates: protectedProcedure
    .input(z.object({ professionalProfileId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const operator = requireUser(ctx);
      requireOptionAPilotAccess(operator.id);

      return {
        professionalProfileId: input.professionalProfileId,
        candidates: await exploreOptionAEligibilityService.resolveListingCandidates(
          operator.id,
          input.professionalProfileId,
        ),
      };
    }),

  getFeed: publicProcedure
    .input(discoveryQuerySchema)
    .output(discoveryFeedResponseSchema)
    .query(async ({ input, ctx }) => {
      return discoveryFeedService.getFeed(input, {
        userId: ctx.user?.id,
      });
    }),

  engage: publicProcedure.input(discoveryEngagementSchema).mutation(async ({ input, ctx }) => {
    return discoveryEngagementService.handle(input, {
      user: ctx.user
        ? {
            id: ctx.user.id,
          }
        : null,
      req: {
        headers: ctx.req.headers,
        ip: ctx.req.ip,
      },
    });
  }),
});
