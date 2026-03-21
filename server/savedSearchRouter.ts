import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import { getDb } from './db';
import { savedSearches } from '../drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { requireUser } from './_core/requireUser';
import {
  normalizeSavedSearch,
  savedSearchCriteriaSchema,
  savedSearchNotificationFrequencySchema,
  serializeSavedSearchCriteria,
} from './lib/savedSearchContract';
import { savedSearchNotificationEngine } from './services/savedSearchNotificationEngine';
import { verifySavedSearchDeliveryActionToken } from './services/savedSearchDeliveryActionTokenService';

function getUserId(ctx: { user: { id: number } | null }) {
  return requireUser(ctx).id;
}

export const savedSearchRouter = router({
  applyDeliveryActionByToken: publicProcedure
    .input(
      z.object({
        token: z.string().trim().min(16).max(2048),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      let tokenPayload: ReturnType<typeof verifySavedSearchDeliveryActionToken>;
      try {
        tokenPayload = verifySavedSearchDeliveryActionToken(input.token);
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: (error as Error)?.message || 'Invalid saved search action token.',
        });
      }

      const search = await db
        .select()
        .from(savedSearches)
        .where(
          and(
            eq(savedSearches.id, tokenPayload.savedSearchId),
            eq(savedSearches.userId, tokenPayload.userId),
          ),
        )
        .limit(1);

      if (search.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Saved search not found' });
      }

      const normalized = normalizeSavedSearch(search[0]);
      const nextState =
        tokenPayload.action === 'pause'
          ? {
              ...normalized,
              notificationFrequency: 'never' as const,
            }
          : {
              ...normalized,
              emailEnabled: false,
            };

      await db
        .update(savedSearches)
        .set({
          notificationFrequency: nextState.notificationFrequency,
          criteria: serializeSavedSearchCriteria(nextState.criteria, nextState),
        })
        .where(eq(savedSearches.id, normalized.id));

      return {
        success: true,
        action: tokenPayload.action,
        savedSearch: nextState,
        message:
          tokenPayload.action === 'pause'
            ? 'Saved-search alerts have been paused.'
            : 'Saved-search email alerts have been turned off.',
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        criteria: savedSearchCriteriaSchema,
        notificationFrequency: savedSearchNotificationFrequencySchema.default('never'),
        emailEnabled: z.boolean().default(true),
        inAppEnabled: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const result = await db.insert(savedSearches).values({
        userId: getUserId(ctx),
        name: input.name,
        criteria: serializeSavedSearchCriteria(input.criteria, input),
        notificationFrequency: input.notificationFrequency,
      });

      return {
        success: true,
        data: {
          id: Number(result[0].insertId),
        },
      };
    }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    const searches = await db
      .select()
      .from(savedSearches)
      .where(eq(savedSearches.userId, getUserId(ctx)))
      .orderBy(desc(savedSearches.createdAt));

    return searches.map(normalizeSavedSearch);
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
        .where(and(eq(savedSearches.id, input.id), eq(savedSearches.userId, getUserId(ctx))))
        .limit(1);

      if (search.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Saved search not found' });
      }

      await db.delete(savedSearches).where(eq(savedSearches.id, input.id));

      return { success: true };
    }),

  updatePreferences: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        notificationFrequency: savedSearchNotificationFrequencySchema,
        emailEnabled: z.boolean(),
        inAppEnabled: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const search = await db
        .select()
        .from(savedSearches)
        .where(and(eq(savedSearches.id, input.id), eq(savedSearches.userId, getUserId(ctx))))
        .limit(1);

      if (search.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Saved search not found' });
      }

      const normalized = normalizeSavedSearch(search[0]);

      await db
        .update(savedSearches)
        .set({
          notificationFrequency: input.notificationFrequency,
          criteria: serializeSavedSearchCriteria(normalized.criteria, input),
        })
        .where(eq(savedSearches.id, input.id));

      const updatedSearch = await db
        .select()
        .from(savedSearches)
        .where(eq(savedSearches.id, input.id))
        .limit(1);

      return normalizeSavedSearch(updatedSearch[0]);
    }),

  processNotifications: protectedProcedure
    .input(
      z
        .object({
          dryRun: z.boolean().default(false),
          limit: z.number().int().positive().max(100).optional(),
        })
        .default({}),
    )
    .mutation(async ({ ctx, input }) => {
      return savedSearchNotificationEngine.processDueNotifications({
        userId: getUserId(ctx),
        dryRun: input.dryRun,
        limit: input.limit,
      });
    }),
});
