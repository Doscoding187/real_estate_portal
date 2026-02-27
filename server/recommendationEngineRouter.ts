import { z } from 'zod';
import { router, protectedProcedure } from './_core/trpc';
import { requireUser } from './_core/requireUser';

/**
 * Stabilization-safe router for recommendationEngine.*
 * Goal: prevent runtime failures for Explore video feed session tracking.
 */
export const recommendationEngineRouter = router({
  createSession: protectedProcedure
    .input(
      z
        .object({
          deviceType: z.string().optional(),
          seed: z.string().optional(),
          context: z.record(z.any()).optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx }) => {
      return {
        success: true,
        data: {
          sessionId: Date.now(),
          userId: requireUser(ctx).id,
        },
      };
    }),

  recordEngagement: protectedProcedure
    .input(
      z.object({
        sessionId: z.union([z.string(), z.number()]).optional(),
        contentId: z.union([z.string(), z.number()]).optional(),
        itemId: z.union([z.string(), z.number()]).optional(),
        engagementType: z.string().optional(),
        event: z.string().optional(),
        watchTime: z.number().optional(),
        completed: z.boolean().optional(),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .mutation(async () => {
      return {
        success: true,
        data: { ok: true },
      };
    }),

  closeSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.union([z.string(), z.number()]),
      }),
    )
    .mutation(async () => {
      return {
        success: true,
        data: { ok: true },
      };
    }),
});
