import { publicProcedure, router } from '../../_core/trpc';
import { discoveryEngagementSchema, discoveryQuerySchema } from '../../../shared/discovery/schemas';
import { discoveryFeedService } from './services/discoveryFeedService';
import { discoveryEngagementService } from './services/discoveryEngagementService';

export const discoveryRouter = router({
  getFeed: publicProcedure.input(discoveryQuerySchema).query(async ({ input, ctx }) => {
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
