import { z } from 'zod';
import { router, publicProcedure } from './_core/trpc';

export const reviewsRouter = router({
  getByTarget: publicProcedure
    .input(z.object({ targetType: z.string(), targetId: z.number() }))
    .query(async () => {
      return [] as any[];
    }),
});
