import { z } from 'zod';
import { router, superAdminProcedure } from './_core/trpc';
import * as service from './services/strategicCommitmentService';

const fields = { title: z.string().min(1).max(200), description: z.string().optional().nullable(), ownerUserId: z.number().int().positive(), dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable() };
export const strategicCommitmentRouter = router({
  listForObjective: superAdminProcedure.input(z.object({ objectiveId: z.number().int().positive() })).query(({ input }) => service.listCommitmentsForObjective(input.objectiveId)),
  listForToday: superAdminProcedure.query(() => service.listStrategicWorkForToday()),
  create: superAdminProcedure.input(z.object({ objectiveId: z.number().int().positive(), ...fields })).mutation(({ input, ctx }) => service.createCommitment(input, ctx.user.id)),
  start: superAdminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input, ctx }) => service.transitionCommitment(input.id, 'in_progress', ctx.user.id)),
  complete: superAdminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input, ctx }) => service.transitionCommitment(input.id, 'completed', ctx.user.id)),
  drop: superAdminProcedure.input(z.object({ id: z.number().int().positive(), reason: z.string().trim().min(1) })).mutation(({ input, ctx }) => service.transitionCommitment(input.id, 'dropped', ctx.user.id, input.reason)),
});
