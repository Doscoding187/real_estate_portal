import { z } from 'zod';
import { notifyOwner } from './notification';
import { adminProcedure, publicProcedure, router } from './trpc';
import { getDb } from '../db';

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
      let dbError = null;

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
});
