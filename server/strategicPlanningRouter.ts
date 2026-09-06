import { z } from 'zod';
import { router, superAdminProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import * as spService from './services/strategicPlanningService';
import { SUPPORTED_METRIC_KEYS, SUPPORTED_METRIC_KEY_VALUES } from '../drizzle/schema/strategicPlanning';

const metricKeyEnum = z.enum(SUPPORTED_METRIC_KEY_VALUES);
const comparisonDirectionEnum = z.enum(['at_least', 'at_most']);

function toTrpcError(err: unknown): TRPCError {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('not found') || message.includes('Not found')) {
    return new TRPCError({ code: 'NOT_FOUND', message });
  }
  if (
    message.includes('Cannot activate') ||
    message.includes('Only draft') ||
    message.includes('can only') ||
    message.includes('Invalid lifecycle') ||
    message.includes('must fall within') ||
    message.includes('Cannot change') ||
    message.includes('outside the revised') ||
    message.includes('Cancellation reason') ||
    message.includes('No changes') ||
    message.includes('Completed or cancelled')
  ) {
    return new TRPCError({ code: 'PRECONDITION_FAILED', message });
  }
  return new TRPCError({ code: 'BAD_REQUEST', message });
}

export const strategicPlanningRouter = router({
  listPeriods: superAdminProcedure.query(async () => {
    return spService.listPeriods();
  }),

  createPeriod: superAdminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await spService.createPeriod(input, ctx.user.id);
      } catch (err) {
        throw toTrpcError(err);
      }
    }),

  updatePeriod: superAdminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(100).optional(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await spService.updatePeriod(input, ctx.user.id);
      } catch (err) {
        throw toTrpcError(err);
      }
    }),

  listObjectives: superAdminProcedure
    .input(z.object({ periodId: z.number().int().positive().optional() }).optional())
    .query(async ({ input }) => {
      return spService.listObjectives(input?.periodId);
    }),

  getObjective: superAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const result = await spService.getObjective(input.id);
      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Objective not found' });
      }
      return result;
    }),

  createObjective: superAdminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        planningPeriodId: z.number().int().positive(),
        ownerUserId: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await spService.createObjective(input, ctx.user.id);
      } catch (err) {
        throw toTrpcError(err);
      }
    }),

  updateObjective: superAdminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        ownerUserId: z.number().int().positive().nullable().optional(),
        planningPeriodId: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await spService.updateObjective(input, ctx.user.id);
      } catch (err) {
        throw toTrpcError(err);
      }
    }),

  activateObjective: superAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await spService.activateObjective(input.id, ctx.user.id);
      } catch (err) {
        throw toTrpcError(err);
      }
    }),

  completeObjective: superAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await spService.completeObjective(input.id, ctx.user.id);
      } catch (err) {
        throw toTrpcError(err);
      }
    }),

  cancelObjective: superAdminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        reason: z.string().min(1, 'Cancellation reason is required'),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await spService.cancelObjective(input.id, ctx.user.id, input.reason);
      } catch (err) {
        throw toTrpcError(err);
      }
    }),

  createTarget: superAdminProcedure
    .input(
      z.object({
        objectiveId: z.number().int().positive(),
        metricKey: metricKeyEnum,
        label: z.string().min(1).max(200),
        targetValue: z.number().int().min(0).max(2_147_483_647),
        comparisonDirection: comparisonDirectionEnum.optional(),
        evaluationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await spService.createTarget(input, ctx.user.id);
      } catch (err) {
        throw toTrpcError(err);
      }
    }),

  updateTarget: superAdminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        metricKey: metricKeyEnum.optional(),
        label: z.string().min(1).max(200).optional(),
        targetValue: z.number().int().min(0).max(2_147_483_647).optional(),
        comparisonDirection: comparisonDirectionEnum.optional(),
        evaluationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await spService.updateTarget(input, ctx.user.id);
      } catch (err) {
        throw toTrpcError(err);
      }
    }),

  removeTarget: superAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await spService.removeTarget(input.id, ctx.user.id);
      } catch (err) {
        throw toTrpcError(err);
      }
    }),

  getTargetProgress: superAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const result = await spService.getTargetProgress(input.id);
      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Target not found' });
      }
      return result;
    }),
});
