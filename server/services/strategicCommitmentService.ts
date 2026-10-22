import { getDb } from '../db';
import { strategicPlanningCommitments } from '../../drizzle/schema/strategicCommitments';
import { strategicPlanningObjectives } from '../../drizzle/schema/strategicPlanning';
import { and, eq, inArray } from 'drizzle-orm';
import { logManagerialAudit } from '../_core/auditLog';

export type CommitmentStatus = 'open' | 'in_progress' | 'completed' | 'dropped';

export async function listCommitmentsForObjective(objectiveId: number) {
  const db = await getDb(); if (!db) throw new Error('Database not available');
  return db.select().from(strategicPlanningCommitments)
    .where(eq(strategicPlanningCommitments.objectiveId, objectiveId));
}

export async function createCommitment(input: { objectiveId: number; title: string; description?: string | null; ownerUserId: number; dueDate?: string | null }, actorUserId: number) {
  const db = await getDb(); if (!db) throw new Error('Database not available');
  return db.transaction(async tx => {
    const [objective] = await tx.select({ status: strategicPlanningObjectives.status }).from(strategicPlanningObjectives).where(eq(strategicPlanningObjectives.id, input.objectiveId)).for('update');
    if (!objective || objective.status !== 'active') throw new Error('Commitments may only be created for active objectives');
    if (!input.title.trim()) throw new Error('Commitment title is required');
    const [result] = await tx.insert(strategicPlanningCommitments).values({ ...input, title: input.title.trim(), status: 'open', createdByUserId: actorUserId, updatedByUserId: actorUserId });
    const [row] = await tx.select().from(strategicPlanningCommitments).where(eq(strategicPlanningCommitments.id, result.insertId));
    await logManagerialAudit({ executor: tx, actorUserId, action: 'strategic_commitment_created', targetType: 'strategic_commitment', targetId: row.id, beforeData: null, afterData: row });
    return row;
  });
}

export async function transitionCommitment(id: number, status: 'in_progress'|'completed'|'dropped', actorUserId: number, reason?: string) {
  const db = await getDb(); if (!db) throw new Error('Database not available');
  return db.transaction(async tx => {
    const [identity] = await tx.select({ objectiveId: strategicPlanningCommitments.objectiveId }).from(strategicPlanningCommitments).where(eq(strategicPlanningCommitments.id, id));
    if (!identity) throw new Error('Commitment not found');
    const [objective] = await tx.select().from(strategicPlanningObjectives).where(eq(strategicPlanningObjectives.id, identity.objectiveId)).for('update');
    if (objective.status !== 'active') throw new Error('Commitment requires an active Objective');
    const [row] = await tx.select().from(strategicPlanningCommitments).where(eq(strategicPlanningCommitments.id, id)).for('update');
    if (!row || row.status === 'completed' || row.status === 'dropped') throw new Error('Commitment is terminal or missing');
    if (status === 'dropped' && !reason?.trim()) throw new Error('Drop reason is required');
    if (row.status === status) throw new Error('Invalid commitment transition');
    const patch: any = { status, updatedByUserId: actorUserId };
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    if (status === 'completed') patch.completedAt = now;
    if (status === 'dropped') { patch.droppedAt = now; patch.dropReason = reason!.trim(); }
    await tx.update(strategicPlanningCommitments).set(patch).where(eq(strategicPlanningCommitments.id, id));
    const [updated] = await tx.select().from(strategicPlanningCommitments).where(eq(strategicPlanningCommitments.id, id));
    await logManagerialAudit({ executor: tx, actorUserId, action: `strategic_commitment_${status}`, targetType: 'strategic_commitment', targetId: id, beforeData: row, afterData: updated });
    return updated;
  });
}

export async function updateCommitment(input: { id: number; title?: string; description?: string | null; ownerUserId?: number; dueDate?: string | null }, actorUserId: number) {
  const db = await getDb(); if (!db) throw new Error('Database not available');
  return db.transaction(async tx => {
    const [row] = await tx.select().from(strategicPlanningCommitments).where(eq(strategicPlanningCommitments.id, input.id)).for('update');
    if (!row || !['open', 'in_progress'].includes(row.status)) throw new Error('Commitment is read-only or missing');
    const patch = { ...input, id: undefined, updatedByUserId: actorUserId } as any;
    delete patch.id;
    await tx.update(strategicPlanningCommitments).set(patch).where(eq(strategicPlanningCommitments.id, input.id));
    const [after] = await tx.select().from(strategicPlanningCommitments).where(eq(strategicPlanningCommitments.id, input.id));
    await logManagerialAudit({ executor: tx, actorUserId, action: 'strategic_commitment_updated', targetType: 'strategic_commitment', targetId: input.id, beforeData: row, afterData: after });
    return after;
  });
}

export async function listStrategicWorkForToday(limit = 50) {
  const db = await getDb(); if (!db) throw new Error('Database not available');
  return db.select().from(strategicPlanningCommitments)
    .innerJoin(strategicPlanningObjectives, eq(strategicPlanningCommitments.objectiveId, strategicPlanningObjectives.id))
    .where(and(eq(strategicPlanningObjectives.status, 'active'), inArray(strategicPlanningCommitments.status, ['open', 'in_progress'])))
    .limit(limit);
}
