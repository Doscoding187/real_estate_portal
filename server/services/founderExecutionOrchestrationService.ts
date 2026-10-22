import { and, asc, eq, inArray } from 'drizzle-orm';
import { getDb } from '../db';
import { users } from '../../drizzle/schema/core';
import { strategicPlanningObjectives as objectives } from '../../drizzle/schema/strategicPlanning';
import { strategicPlanningCommitments as commitments } from '../../drizzle/schema/strategicCommitments';
import { AuditActions, logManagerialAudit } from '../_core/auditLog';

export type CommitmentResolution = { id: number; resolution: 'completed' | 'dropped'; reason?: string };

export function validateResolutions(ids: number[], resolutions: CommitmentResolution[]) {
  const supplied = new Set(resolutions.map(item => item.id));
  if (supplied.size !== resolutions.length || ids.length !== resolutions.length || ids.some(id => !supplied.has(id))) {
    throw new Error('Explicit resolution is required for every outstanding Commitment; refresh and try again');
  }
  if (resolutions.some(item => item.resolution === 'dropped' && !item.reason?.trim())) throw new Error('Drop reason is required');
}

/** All writers lock Objective before Commitment, serializing creation with closure. */
export async function closeObjective(id: number, actorUserId: number, command: { status: 'completed'; resolutions: CommitmentResolution[] } | { status: 'cancelled'; reason: string }) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  if (command.status === 'cancelled' && !command.reason.trim()) throw new Error('Cancellation reason is required');
  return db.transaction(async tx => {
    const [actor] = await tx.select().from(users).where(eq(users.id, actorUserId));
    if (actor?.role !== 'super_admin') throw new Error('Super-admin access required');
    const [before] = await tx.select().from(objectives).where(eq(objectives.id, id)).for('update');
    if (!before) throw new Error('Objective not found');
    if (before.status !== 'active' && !(before.status === 'draft' && command.status === 'cancelled')) throw new Error('Invalid lifecycle transition');
    const outstanding = await tx.select().from(commitments).where(and(eq(commitments.objectiveId, id), inArray(commitments.status, ['open', 'in_progress']))).orderBy(asc(commitments.id)).for('update');
    if (command.status === 'completed') validateResolutions(outstanding.map(row => row.id), command.resolutions);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    for (const row of outstanding) {
      const resolution = command.status === 'completed' ? command.resolutions.find(item => item.id === row.id)! : { resolution: 'dropped' as const, reason: `Objective cancelled: ${command.reason.trim()}` };
      await tx.update(commitments).set({ status: resolution.resolution, completedAt: resolution.resolution === 'completed' ? now : null, droppedAt: resolution.resolution === 'dropped' ? now : null, dropReason: resolution.resolution === 'dropped' ? resolution.reason!.trim() : null, updatedByUserId: actorUserId }).where(eq(commitments.id, row.id));
      const [after] = await tx.select().from(commitments).where(eq(commitments.id, row.id));
      await logManagerialAudit({ executor: tx, actorUserId, action: 'strategic_commitment_resolved', targetType: 'strategic_commitment', targetId: row.id, beforeData: row, afterData: after, metadata: { objectiveId: id, objectiveTransition: command.status } });
    }
    await tx.update(objectives).set({ status: command.status, updatedByUserId: actorUserId }).where(eq(objectives.id, id));
    const after = await tx.select().from(objectives).where(eq(objectives.id, id));
    await logManagerialAudit({ executor: tx, actorUserId, action: command.status === 'completed' ? AuditActions.STRATEGIC_OBJECTIVE_COMPLETE : AuditActions.STRATEGIC_OBJECTIVE_CANCEL, targetType: 'strategic_planning_objective', targetId: id, beforeData: before, afterData: after, metadata: { resolvedCommitmentIds: outstanding.map(row => row.id), ...(command.status === 'cancelled' ? { reason: command.reason.trim() } : {}) } });
    return after;
  });
}
