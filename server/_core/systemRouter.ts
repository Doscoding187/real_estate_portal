import { z } from 'zod';
import { desc } from 'drizzle-orm';
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
