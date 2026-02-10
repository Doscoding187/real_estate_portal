/**
 * Analytics Router (STUBBED)
 *
 * Disabled: References locationAnalyticsEvents which is not exported from schema.
 * This router will be re-enabled once the table is properly added via migration.
 */

import { router, publicProcedure } from './_core/trpc';
import { z } from 'zod';

export const analyticsRouter = router({
  // Track endpoint - stubbed to return success without DB operation
  track: publicProcedure
    .input(
      z.object({
        event: z.string(),
        properties: z.record(z.any()).optional(),
        sessionId: z.string().optional(),
      }),
    )
    .mutation(async () => {
      // STUB: Analytics tracking disabled - table not available
      console.debug(
        '[analyticsRouter] Track called but disabled (no locationAnalyticsEvents table)',
      );
      return { success: true };
    }),
});
