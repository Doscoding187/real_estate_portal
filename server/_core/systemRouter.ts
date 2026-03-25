import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { notifyOwner } from './notification';
import { adminProcedure, publicProcedure, router } from './trpc';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { savedSearchDeliveryScheduler } from '../services/savedSearchDeliveryScheduler';
import { savedSearchDeliveryHistory } from '../../drizzle/schema';

export const systemRouter = router({
  health: publicProcedure
    .input(
      z
        .object({
          timestamp: z.number().min(0, 'timestamp cannot be negative').optional(),
        })
        .optional(),
    )
    .query(async () => {
      const db = await getDb();
      let dbStatus = 'disconnected';
      let dbError: string | null = null;

      try {
        if (db) {
          // Test database connection with a simple query
          await db.execute('SELECT 1');
          dbStatus = 'connected';
        }
      } catch (error) {
        dbError = error instanceof Error ? error.message : 'Unknown database error';
        console.error('[Health Check] Database error:', dbError);
      }

      return {
        ok: dbStatus === 'connected',
        status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
        database: dbStatus,
        error: dbError,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
      };
    }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, 'title is required'),
        content: z.string().min(1, 'content is required'),
      }),
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  savedSearchSchedulerStatus: adminProcedure.query(() => {
    return savedSearchDeliveryScheduler.getStatus();
  }),

  runSavedSearchScheduler: adminProcedure.mutation(async () => {
    await savedSearchDeliveryScheduler.runDueNotifications('manual');
    return savedSearchDeliveryScheduler.getStatus();
  }),

  updateSavedSearchDeliveryRetryState: adminProcedure
    .input(
      z.object({
        deliveryHistoryId: z.number().int().positive(),
        action: z.enum(['requeue', 'abandon']),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const rows = await db
        .select()
        .from(savedSearchDeliveryHistory)
        .where(eq(savedSearchDeliveryHistory.id, input.deliveryHistoryId))
        .limit(1);

      const delivery = rows[0];
      if (!delivery) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Delivery history record not found' });
      }

      if (delivery.emailRequested !== 1 || delivery.emailDelivered === 1) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This delivery does not have a retryable email failure.',
        });
      }

      const retryState = delivery.retryState;
      const retryCount = Number(delivery.retryCount ?? 0);
      const maxRetryCount = Number(delivery.maxRetryCount ?? 0);
      const nowIso = new Date().toISOString();

      if (input.action === 'requeue') {
        if (retryState !== 'pending' && retryState !== 'abandoned') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Only pending or abandoned deliveries can be requeued.',
          });
        }

        await db
          .update(savedSearchDeliveryHistory)
          .set({
            retryState: 'pending',
            nextRetryAt: nowIso,
            error: null,
            maxRetryCount: Math.max(maxRetryCount, retryCount + 1, 1),
          })
          .where(eq(savedSearchDeliveryHistory.id, input.deliveryHistoryId));
      } else {
        if (retryState !== 'pending' && retryState !== 'retrying') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Only pending or retrying deliveries can be abandoned.',
          });
        }

        await db
          .update(savedSearchDeliveryHistory)
          .set({
            retryState: 'abandoned',
            nextRetryAt: null,
          })
          .where(
            and(
              eq(savedSearchDeliveryHistory.id, input.deliveryHistoryId),
              eq(savedSearchDeliveryHistory.emailDelivered, 0),
            ),
          );
      }

      const updatedRows = await db
        .select()
        .from(savedSearchDeliveryHistory)
        .where(eq(savedSearchDeliveryHistory.id, input.deliveryHistoryId))
        .limit(1);

      const updated = updatedRows[0];
      return {
        ...updated,
        inAppRequested: Boolean(updated.inAppRequested),
        emailRequested: Boolean(updated.emailRequested),
        inAppDelivered: Boolean(updated.inAppDelivered),
        emailDelivered: Boolean(updated.emailDelivered),
      };
    }),

  savedSearchDeliveryHistory: adminProcedure
    .input(
      z
        .object({
          limit: z.number().int().positive().max(100).default(10),
        })
        .default({}),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const rows = await db
        .select()
        .from(savedSearchDeliveryHistory)
        .orderBy(desc(savedSearchDeliveryHistory.processedAt))
        .limit(input.limit);

      return rows.map(row => ({
        ...row,
        inAppRequested: Boolean(row.inAppRequested),
        emailRequested: Boolean(row.emailRequested),
        inAppDelivered: Boolean(row.inAppDelivered),
        emailDelivered: Boolean(row.emailDelivered),
      }));
    }),
});
