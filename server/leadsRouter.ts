import { z } from 'zod';
import { router, publicProcedure } from './_core/trpc';

export const leadsRouter = router({
  create: publicProcedure
    .input(
      z.object({
        agentId: z.number(),
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        message: z.string().optional(),
        leadType: z.string().optional(),
        source: z.string().optional(),
      }),
    )
    .mutation(async () => ({ success: true })),
});
