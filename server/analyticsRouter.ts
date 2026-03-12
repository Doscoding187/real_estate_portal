import { router, publicProcedure } from './_core/trpc';
import { z } from 'zod';
import { recordAgentOsEvent } from './services/agentOsEventService';

export const analyticsRouter = router({
  track: publicProcedure
    .input(
      z.object({
        event: z.string(),
        properties: z.record(z.any()).optional(),
        sessionId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await recordAgentOsEvent({
        userId: ctx.user?.id ?? null,
        eventType: input.event as any,
        eventData: input.properties,
        req: ctx.req,
        requestId: ctx.requestId,
        sessionId: input.sessionId,
      });

      return { success: true };
    }),
});
