import { z } from 'zod';
import { and, desc, eq, gt, inArray, or } from 'drizzle-orm';
import { notifyOwner } from './notification';
import { adminProcedure, publicProcedure, router } from './trpc';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { savedSearchDeliveryScheduler } from '../services/savedSearchDeliveryScheduler';
import { getLeadRoutingAudit } from '../services/leadRoutingAuditService';
import { savedSearchDeliveryHistory } from '../../drizzle/schema';

const deliveryHistoryFilterSchema = z.enum([
  'all',
  'attention',
  'pending_retry',
  'abandoned',
  'recovered',
]);

type DeliveryHistoryFilter = z.infer<typeof deliveryHistoryFilterSchema>;

function deriveDeliveryFailureCategory(row: {
  status: string;
  retryState: string;
  error: string | null;
  emailRequested: number | boolean;
  emailDelivered: number | boolean;
  retryCount: number;
  maxRetryCount: number;
}) {
  const emailRequested = Boolean(row.emailRequested);
  const emailDelivered = Boolean(row.emailDelivered);
  const error = (row.error || '').toLowerCase();

  if (row.retryState === 'succeeded') {
    return 'recovered';
  }

  if (!emailRequested || emailDelivered) {
    return row.status === 'partial' ? 'partial_delivery' : 'healthy';
  }

  if (error.includes('recipient email unavailable')) {
    return 'recipient_missing';
  }

  if (row.retryState === 'abandoned' && row.retryCount >= row.maxRetryCount) {
    return 'retry_exhausted';
  }

  if (row.retryState === 'abandoned') {
    return 'abandoned_by_admin';
  }

  if (row.retryState === 'pending' || row.retryState === 'retrying') {
    return 'retry_pending';
  }

  return row.status === 'failed' ? 'delivery_failed' : 'partial_delivery';
}

function deriveDeliveryRecoveryState(row: {
  retryState: string;
  emailRequested: number | boolean;
  emailDelivered: number | boolean;
}) {
  if (row.retryState === 'succeeded') return 'recovered';
  if (!Boolean(row.emailRequested) || Boolean(row.emailDelivered)) return 'healthy';
  if (row.retryState === 'pending' || row.retryState === 'retrying') return 'recoverable';
  return 'terminal';
}

function normalizeDeliveryHistoryRow(row: any) {
  return {
    ...row,
    inAppRequested: Boolean(row.inAppRequested),
    emailRequested: Boolean(row.emailRequested),
    inAppDelivered: Boolean(row.inAppDelivered),
    emailDelivered: Boolean(row.emailDelivered),
    diagnosticCategory: deriveDeliveryFailureCategory({
      status: row.status,
      retryState: row.retryState,
      error: row.error,
      emailRequested: row.emailRequested,
      emailDelivered: row.emailDelivered,
      retryCount: Number(row.retryCount ?? 0),
      maxRetryCount: Number(row.maxRetryCount ?? 0),
    }),
    recoveryState: deriveDeliveryRecoveryState({
      retryState: row.retryState,
      emailRequested: row.emailRequested,
      emailDelivered: row.emailDelivered,
    }),
  };
}

function escapeCsvCell(value: unknown) {
  if (value === null || value === undefined) {
    return '""';
  }

  const normalized =
    typeof value === 'string'
      ? value
      : typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : JSON.stringify(value);

  return `"${normalized.replace(/"/g, '""')}"`;
}

function getDeliveryHistoryWhereClause(filter: DeliveryHistoryFilter) {
  switch (filter) {
    case 'attention':
      return or(
        eq(savedSearchDeliveryHistory.retryState, 'pending'),
        eq(savedSearchDeliveryHistory.retryState, 'retrying'),
        eq(savedSearchDeliveryHistory.retryState, 'abandoned'),
        eq(savedSearchDeliveryHistory.status, 'failed'),
        eq(savedSearchDeliveryHistory.status, 'partial'),
      );
    case 'pending_retry':
      return and(
        eq(savedSearchDeliveryHistory.emailRequested, 1),
        eq(savedSearchDeliveryHistory.emailDelivered, 0),
        inArray(savedSearchDeliveryHistory.retryState, ['pending', 'retrying']),
      );
    case 'abandoned':
      return and(
        eq(savedSearchDeliveryHistory.emailRequested, 1),
        eq(savedSearchDeliveryHistory.emailDelivered, 0),
        eq(savedSearchDeliveryHistory.retryState, 'abandoned'),
      );
    case 'recovered':
      return or(
        eq(savedSearchDeliveryHistory.retryState, 'succeeded'),
        and(eq(savedSearchDeliveryHistory.emailDelivered, 1), gt(savedSearchDeliveryHistory.retryCount, 0)),
      );
    case 'all':
    default:
      return undefined;
  }
}

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
          filter: deliveryHistoryFilterSchema.default('all'),
        })
        .default({}),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const whereClause = getDeliveryHistoryWhereClause(input.filter);
      const baseQuery = db.select().from(savedSearchDeliveryHistory) as any;
      const rows = await (
        whereClause ? baseQuery.where(whereClause) : baseQuery
      )
        .orderBy(desc(savedSearchDeliveryHistory.processedAt))
        .limit(input.limit);

      return rows.map(normalizeDeliveryHistoryRow);
    }),

  exportSavedSearchDeliveryHistory: adminProcedure
    .input(
      z
        .object({
          filter: deliveryHistoryFilterSchema.default('all'),
        })
        .default({}),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const whereClause = getDeliveryHistoryWhereClause(input.filter);
      const baseQuery = db.select().from(savedSearchDeliveryHistory) as any;
      const rows = await (
        whereClause ? baseQuery.where(whereClause) : baseQuery
      )
        .orderBy(desc(savedSearchDeliveryHistory.processedAt))
        .limit(5000);

      const normalizedRows = rows.map(normalizeDeliveryHistoryRow);
      const headers = [
        'Processed At',
        'Saved Search ID',
        'User ID',
        'Search Name',
        'Alert Title',
        'Alert Content',
        'Listing Source',
        'Notification Frequency',
        'Status',
        'Diagnostic Category',
        'Recovery State',
        'Total Matches',
        'New Matches',
        'In-App Requested',
        'In-App Delivered',
        'Email Requested',
        'Email Delivered',
        'Retry State',
        'Retry Count',
        'Max Retry Count',
        'Next Retry At',
        'Last Retry At',
        'Action Url',
        'Error',
      ];

      const csvRows = normalizedRows.map(row => [
        row.processedAt,
        row.savedSearchId ?? '',
        row.userId,
        row.searchName,
        row.title,
        row.content,
        row.listingSource,
        row.notificationFrequency,
        row.status,
        row.diagnosticCategory,
        row.recoveryState,
        row.totalMatches,
        row.newMatchCount,
        row.inAppRequested,
        row.inAppDelivered,
        row.emailRequested,
        row.emailDelivered,
        row.retryState,
        row.retryCount,
        row.maxRetryCount,
        row.nextRetryAt ?? '',
        row.lastRetryAt ?? '',
        row.actionUrl ?? '',
        row.error ?? '',
      ]);

      const content = [headers, ...csvRows]
        .map(row => row.map(escapeCsvCell).join(','))
        .join('\n');
      const filterSuffix = input.filter === 'all' ? 'all' : input.filter;

      return {
        filename: `saved-search-delivery-history-${filterSuffix}-${new Date()
          .toISOString()
          .split('T')[0]}.csv`,
        content,
      };
    }),

  leadRoutingAudit: adminProcedure
    .input(
      z
        .object({
          days: z.number().int().positive().max(365).default(30),
          attentionLimit: z.number().int().positive().max(50).default(10),
        })
        .default({}),
    )
    .query(async ({ input }) => {
      return getLeadRoutingAudit(input);
    }),
});
