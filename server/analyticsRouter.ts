import { router, publicProcedure } from './_core/trpc';
import { z } from 'zod';
import { db } from './db';
import { locationAnalyticsEvents } from '../drizzle/schema';
import { sql } from 'drizzle-orm';

export const analyticsRouter = router({
  // Fire-and-forget tracking endpoint
  track: publicProcedure
    .input(
      z.object({
        event: z.string(),
        properties: z.record(z.any()).optional(),
        sessionId: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { event, properties, sessionId } = input;
      const userId = ctx.session?.user?.id;

      try {
        await db.insert(locationAnalyticsEvents).values({
          eventType: event,
          metadata: properties,
          sessionId: sessionId || 'anonymous',
          userId: userId ? parseInt(userId.toString()) : null,

          // Extract known ID fields from properties for indexed columns
          locationId: properties?.locationId ? parseInt(properties.locationId.toString()) : null,
          developmentId: properties?.developmentId
            ? parseInt(properties.developmentId.toString())
            : null,
          listingId: properties?.listingId ? parseInt(properties.listingId.toString()) : null,
          targetId:
            properties?.adId || properties?.agentId
              ? parseInt((properties.adId || properties.agentId).toString())
              : null,
        });

        return { success: true };
      } catch (error) {
        // Analytics failure should not break the app, just log it
        console.error('Analytics tracking failed:', error);
        return { success: false, error: 'Tracking failed' };
      }
    }),
});
