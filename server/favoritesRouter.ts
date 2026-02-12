import { z } from 'zod';
import { router, publicProcedure } from './_core/trpc';

export const favoritesRouter = router({
  list: publicProcedure.query(async () => {
    return [] as any[];
  }),
  add: publicProcedure
    .input(z.object({ propertyId: z.number() }))
    .mutation(async () => ({ success: true })),
  remove: publicProcedure
    .input(z.object({ propertyId: z.number() }))
    .mutation(async () => ({ success: true })),
});
