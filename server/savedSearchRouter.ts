import { z } from 'zod';
import { router, protectedProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import { getDb } from './db';
import { savedSearches } from '../drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';

export const savedSearchRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        criteria: z.record(z.any()), // JSON object for filters
        notificationFrequency: z
          .string()
          .refine(val => ['never', 'daily', 'weekly'].includes(val))
          .default('never'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      await db.insert(savedSearches).values({
        userId: ctx.user.id,
        name: input.name,
        criteria: input.criteria,
        notificationFrequency: input.notificationFrequency,
      });

      return { success: true };
    }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    const searches = await db
      .select()
      .from(savedSearches)
      .where(eq(savedSearches.userId, ctx.user.id))
      .orderBy(desc(savedSearches.createdAt));

    return searches;
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const search = await db
        .select()
        .from(savedSearches)
        .where(and(eq(savedSearches.id, input.id), eq(savedSearches.userId, ctx.user.id)))
        .limit(1);

      if (search.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Saved search not found' });
      }

      await db.delete(savedSearches).where(eq(savedSearches.id, input.id));

      return { success: true };
    }),
});
