import { z } from 'zod';
import { router, protectedProcedure } from './_core/trpc';
import { requireUser } from './_core/requireUser';
import { addFavorite, getUserFavorites, removeFavorite } from './db';

const favoriteInput = z.object({ propertyId: z.number().int().positive() });

export const favoritesRouter = router({
  list: protectedProcedure.query(({ ctx }) => getUserFavorites(requireUser(ctx).id)),
  add: protectedProcedure.input(favoriteInput).mutation(async ({ ctx, input }) => {
    await addFavorite(requireUser(ctx).id, input.propertyId);
    return { success: true };
  }),
  remove: protectedProcedure.input(favoriteInput).mutation(async ({ ctx, input }) => {
    await removeFavorite(requireUser(ctx).id, input.propertyId);
    return { success: true };
  }),
});
