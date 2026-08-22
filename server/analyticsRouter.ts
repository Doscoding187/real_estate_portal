import { router, publicProcedure } from './_core/trpc';
import { z } from 'zod';
import { PUBLIC_AGENT_PROFILE_EVENTS } from '../shared/analytics/public-agent-profile-events';
import { recordAgentOsEvent } from './services/agentOsEventService';

export const analyticsRouter = router({
  track: publicProcedure
    .input(
      z.object({
        event: z.enum(PUBLIC_AGENT_PROFILE_EVENTS),
        properties: z.record(z.any()).optional(),
        sessionId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await recordAgentOsEvent({
        userId: ctx.user?.id ?? null,
        eventType: input.event,
        eventData: input.properties,
        req: ctx.req,
        requestId: ctx.requestId,
        sessionId: input.sessionId,
      });

      return { success: true };
    }),
});
