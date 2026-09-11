import { getDb } from '../db';
import {
  strategicPlanningPeriods,
  strategicPlanningObjectives,
  strategicPlanningTargets,
  type SupportedMetricKey,
  SUPPORTED_METRIC_KEYS,
} from '../../drizzle/schema/strategicPlanning';
import { users } from '../../drizzle/schema/core';
import { eq, and, desc, asc, sql, or, inArray, like, type SQL } from 'drizzle-orm';
import { logManagerialAudit, AuditActions } from '../_core/auditLog';
import {
  resolveMetricValue,
  getMetricDefinition,
  isSupportedMetricKey,
  SUPPORTED_METRICS,
} from './companyMetricsService';

export type ObjectiveStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type ComparisonDirection = 'at_least' | 'at_most';

export type AuthoringReferenceData = {
  metrics: Array<{
    key: SupportedMetricKey;
    label: string;
    description: string;
    unit: 'count';
    semanticKind: 'point_in_time_count';
  }>;
  owners: Array<{
    id: number;
    displayName: string;
    email: string | null;
  }>;
};

const AUTHORING_OWNER_SEARCH_LIMIT = 20;
const AUTHORING_OWNER_ID_LIMIT = 50;

function escapeLikeTerm(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

function ownerDisplayName(row: {
  id: number;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}): string {
  const explicitName = row.name?.trim();
  if (explicitName) return explicitName;

  const fullName = [row.firstName?.trim(), row.lastName?.trim()].filter(Boolean).join(' ');
  return fullName || row.email?.trim() || `User #${row.id}`;
}

/**
 * Returns the canonical metric metadata and a deliberately bounded user
 * projection for authoring forms. An empty owner query never falls back to a
 * broad user listing; callers must provide a search term or explicit IDs.
 */
export async function getAuthoringReferenceData(input?: {
  ownerSearch?: string;
  ownerIds?: number[];
}): Promise<AuthoringReferenceData> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const metrics = SUPPORTED_METRIC_KEYS.map(key => {
    const definition = SUPPORTED_METRICS[key];
    return {
      key: definition.key,
      label: definition.label,
      description: definition.description,
      unit: definition.unit,
      semanticKind: definition.semanticKind,
    };
  });

  const ownerSearch = input?.ownerSearch?.trim();
  const ownerIds = Array.from(new Set(input?.ownerIds ?? []))
    .filter(id => Number.isInteger(id) && id > 0)
    .slice(0, AUTHORING_OWNER_ID_LIMIT);

  if (!ownerSearch && ownerIds.length === 0) {
    return { metrics, owners: [] };
  }

  const predicates: SQL[] = [];
  if (ownerSearch) {
    const term = `%${escapeLikeTerm(ownerSearch)}%`;
    const searchPredicate = or(
      like(users.name, term),
      like(users.firstName, term),
      like(users.lastName, term),
      like(users.email, term),
    );
    if (searchPredicate) predicates.push(searchPredicate);
  }
  if (ownerIds.length > 0) {
    predicates.push(inArray(users.id, ownerIds));
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(users)
    .where(predicates.length === 1 ? predicates[0] : or(...predicates))
    .orderBy(asc(users.name), asc(users.firstName), asc(users.lastName), asc(users.email))
    // Search is deliberately narrow; known owner IDs from the loaded objective
    // list can be resolved together without a broad user enumeration.
    .limit(ownerSearch ? AUTHORING_OWNER_SEARCH_LIMIT : ownerIds.length);

  return {
    metrics,
    owners: rows.map(row => ({
      id: row.id,
      displayName: ownerDisplayName(row),
      email: row.email,
    })),
  };
}

const VALID_LIFECYCLE_TRANSITIONS: Record<ObjectiveStatus, readonly ObjectiveStatus[]> = {
  draft: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

function assertValidTransition(from: ObjectiveStatus, to: ObjectiveStatus): void {
  if (!VALID_LIFECYCLE_TRANSITIONS[from].includes(to)) {
    throw new Error(`Invalid lifecycle transition: ${from} -> ${to}`);
  }
}

function assertMetricKey(key: string): SupportedMetricKey {
  if (!isSupportedMetricKey(key)) {
    throw new Error(
      `Unsupported metric key: ${key}. Supported keys: ${SUPPORTED_METRIC_KEYS.join(', ')}`,
    );
  }
  return key as SupportedMetricKey;
}

function assertValidDate(value: string, fieldName: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${fieldName} must be in YYYY-MM-DD format, got: ${value}`);
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(`${fieldName} is not a valid calendar date: ${value}`);
  }
}

function assertEvaluationDateInPeriod(
  evaluationDate: string,
  periodStart: string,
  periodEnd: string,
): void {
  assertValidDate(evaluationDate, 'evaluationDate');
  if (evaluationDate < periodStart || evaluationDate > periodEnd) {
    throw new Error(
      `Evaluation date ${evaluationDate} must fall within the objective's planning period (${periodStart} to ${periodEnd})`,
    );
  }
}

/**
 * Verify the supplied actor is a super-admin within the active transaction.
 * Follows the repository's privileged-service pattern from developmentService.ts.
 */
async function verifySuperAdmin(tx: any, actorUserId: number): Promise<void> {
  const [actor] = await tx
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(and(eq(users.id, actorUserId), eq(users.role, 'super_admin')))
    .limit(1)
    .for('update');
  if (!actor) {
    throw new Error('Only an authenticated super-admin can perform this operation');
  }
}

// ─── Period Functions ──────────────────────────────────────────────

export async function listPeriods() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return db
    .select()
    .from(strategicPlanningPeriods)
    .orderBy(desc(strategicPlanningPeriods.startDate));
}

export async function createPeriod(
  input: { name: string; startDate: string; endDate: string },
  actorUserId: number,
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  assertValidDate(input.startDate, 'startDate');
  assertValidDate(input.endDate, 'endDate');
  if (input.startDate >= input.endDate) {
    throw new Error('startDate must be before endDate');
  }

  return db.transaction(async (tx) => {
    await verifySuperAdmin(tx, actorUserId);

    const [result] = await tx.insert(strategicPlanningPeriods).values({
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
    });

    const afterRow = await tx
      .select()
      .from(strategicPlanningPeriods)
      .where(eq(strategicPlanningPeriods.id, result.insertId))
      .limit(1);

    await logManagerialAudit({
      executor: tx,
      actorUserId,
      action: AuditActions.STRATEGIC_PERIOD_CREATE,
      targetType: 'strategic_planning_period',
      targetId: result.insertId,
      beforeData: null,
      afterData: afterRow,
    });

    return afterRow;
  });
}

export async function updatePeriod(
  input: { id: number; name?: string; startDate?: string; endDate?: string },
  actorUserId: number,
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return db.transaction(async (tx) => {
    await verifySuperAdmin(tx, actorUserId);

    const [existing] = await tx
      .select()
      .from(strategicPlanningPeriods)
      .where(eq(strategicPlanningPeriods.id, input.id))
      .for('update');

    if (!existing) throw new Error('Planning period not found');

    const name = input.name ?? existing.name;
    const startDate = input.startDate ?? existing.startDate;
    const endDate = input.endDate ?? existing.endDate;

    if (input.startDate) assertValidDate(input.startDate, 'startDate');
    if (input.endDate) assertValidDate(input.endDate, 'endDate');
    if (startDate >= endDate) {
      throw new Error('startDate must be before endDate');
    }

    if (input.startDate || input.endDate) {
      const nonDraftObjectives = await tx
        .select({ id: strategicPlanningObjectives.id })
        .from(strategicPlanningObjectives)
        .where(
          and(
            eq(strategicPlanningObjectives.planningPeriodId, input.id),
            sql`${strategicPlanningObjectives.status} != 'draft'`,
          ),
        )
        .limit(1);

      if (nonDraftObjectives.length > 0) {
        throw new Error(
          'Cannot change period dates while non-draft objectives reference this period',
        );
      }

      const existingTargets = await tx
        .select({ id: strategicPlanningTargets.id, evaluationDate: strategicPlanningTargets.evaluationDate })
        .from(strategicPlanningTargets)
        .innerJoin(
          strategicPlanningObjectives,
          eq(strategicPlanningTargets.objectiveId, strategicPlanningObjectives.id),
        )
        .where(eq(strategicPlanningObjectives.planningPeriodId, input.id));

      for (const target of existingTargets) {
        if (target.evaluationDate < startDate || target.evaluationDate > endDate) {
          throw new Error(
            `Target ${target.id} has evaluation date ${target.evaluationDate} outside the revised period (${startDate} to ${endDate})`,
          );
        }
      }
    }

    await tx
      .update(strategicPlanningPeriods)
      .set({ name, startDate, endDate })
      .where(eq(strategicPlanningPeriods.id, input.id));

    const afterRow = await tx
      .select()
      .from(strategicPlanningPeriods)
      .where(eq(strategicPlanningPeriods.id, input.id))
      .limit(1);

    await logManagerialAudit({
      executor: tx,
      actorUserId,
      action: AuditActions.STRATEGIC_PERIOD_UPDATE,
      targetType: 'strategic_planning_period',
      targetId: input.id,
      beforeData: existing,
      afterData: afterRow,
    });

    return afterRow;
  });
}

// ─── Objective Functions ──────────────────────────────────────────

export async function listObjectives(periodId?: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const where = periodId
    ? eq(strategicPlanningObjectives.planningPeriodId, periodId)
    : undefined;

  const rows = await db
    .select()
    .from(strategicPlanningObjectives)
    .where(where)
    .orderBy(desc(strategicPlanningObjectives.createdAt));

  const objectivesWithTargets = await Promise.all(
    rows.map(async (obj) => {
      const targets = await db
        .select()
        .from(strategicPlanningTargets)
        .where(eq(strategicPlanningTargets.objectiveId, obj.id));
      return { ...obj, targets };
    }),
  );

  return objectivesWithTargets;
}

export async function getObjective(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [objective] = await db
    .select()
    .from(strategicPlanningObjectives)
    .where(eq(strategicPlanningObjectives.id, id))
    .limit(1);

  if (!objective) return null;

  const targets = await db
    .select()
    .from(strategicPlanningTargets)
    .where(eq(strategicPlanningTargets.objectiveId, id));

  return { ...objective, targets };
}

export async function createObjective(
  input: {
    title: string;
    description?: string;
    planningPeriodId: number;
    ownerUserId?: number;
  },
  actorUserId: number,
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return db.transaction(async (tx) => {
    await verifySuperAdmin(tx, actorUserId);

    const [period] = await tx
      .select()
      .from(strategicPlanningPeriods)
      .where(eq(strategicPlanningPeriods.id, input.planningPeriodId))
      .limit(1);

    if (!period) throw new Error('Planning period not found');

    const [result] = await tx.insert(strategicPlanningObjectives).values({
      title: input.title,
      description: input.description ?? null,
      status: 'draft',
      ownerUserId: input.ownerUserId ?? null,
      planningPeriodId: input.planningPeriodId,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
    });

    const afterRow = await tx
      .select()
      .from(strategicPlanningObjectives)
      .where(eq(strategicPlanningObjectives.id, result.insertId))
      .limit(1);

    await logManagerialAudit({
      executor: tx,
      actorUserId,
      action: AuditActions.STRATEGIC_OBJECTIVE_CREATE,
      targetType: 'strategic_planning_objective',
      targetId: result.insertId,
      beforeData: null,
      afterData: afterRow,
    });

    return afterRow;
  });
}

export async function updateObjective(
  input: {
    id: number;
    title?: string;
    description?: string;
    ownerUserId?: number | null;
    planningPeriodId?: number;
  },
  actorUserId: number,
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return db.transaction(async (tx) => {
    await verifySuperAdmin(tx, actorUserId);

    const [existing] = await tx
      .select()
      .from(strategicPlanningObjectives)
      .where(eq(strategicPlanningObjectives.id, input.id))
      .for('update');

    if (!existing) throw new Error('Objective not found');

    if (existing.status === 'completed' || existing.status === 'cancelled') {
      throw new Error('Completed or cancelled objectives cannot be edited');
    }

    const title = input.title ?? existing.title;
    const description = input.description !== undefined ? input.description : existing.description;
    const ownerUserId = input.ownerUserId !== undefined ? input.ownerUserId : existing.ownerUserId;
    const planningPeriodId = input.planningPeriodId ?? existing.planningPeriodId;

    if (existing.status === 'active') {
      if (input.planningPeriodId !== undefined) {
        throw new Error('Cannot change planning period on an active objective');
      }
    }

    if (input.planningPeriodId !== undefined && input.planningPeriodId !== existing.planningPeriodId) {
      const [newPeriod] = await tx
        .select()
        .from(strategicPlanningPeriods)
        .where(eq(strategicPlanningPeriods.id, input.planningPeriodId))
        .for('update');

      if (!newPeriod) throw new Error('Planning period not found');

      const targets = await tx
        .select()
        .from(strategicPlanningTargets)
        .where(eq(strategicPlanningTargets.objectiveId, input.id))
        .for('update');

      for (const target of targets) {
        if (target.evaluationDate < newPeriod.startDate || target.evaluationDate > newPeriod.endDate) {
          throw new Error(
            `Target ${target.id} has evaluation date ${target.evaluationDate} outside the replacement period (${newPeriod.startDate} to ${newPeriod.endDate})`,
          );
        }
      }
    }

    if (title === existing.title && description === existing.description && ownerUserId === existing.ownerUserId && planningPeriodId === existing.planningPeriodId) {
      throw new Error('No changes to update');
    }

    await tx
      .update(strategicPlanningObjectives)
      .set({
        title,
        description,
        ownerUserId,
        planningPeriodId,
        updatedByUserId: actorUserId,
      })
      .where(eq(strategicPlanningObjectives.id, input.id));

    const afterRow = await tx
      .select()
      .from(strategicPlanningObjectives)
      .where(eq(strategicPlanningObjectives.id, input.id))
      .limit(1);

    await logManagerialAudit({
      executor: tx,
      actorUserId,
      action: AuditActions.STRATEGIC_OBJECTIVE_UPDATE,
      targetType: 'strategic_planning_objective',
      targetId: input.id,
      beforeData: existing,
      afterData: afterRow,
    });

    return afterRow;
  });
}

export async function activateObjective(id: number, actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return db.transaction(async (tx) => {
    await verifySuperAdmin(tx, actorUserId);

    const [existing] = await tx
      .select()
      .from(strategicPlanningObjectives)
      .where(eq(strategicPlanningObjectives.id, id))
      .for('update');

    if (!existing) throw new Error('Objective not found');
    assertValidTransition(existing.status, 'active');

    if (!existing.ownerUserId) {
      throw new Error('Cannot activate objective without an owner');
    }

    const targets = await tx
      .select()
      .from(strategicPlanningTargets)
      .where(eq(strategicPlanningTargets.objectiveId, id))
      .for('update');

    if (targets.length === 0) {
      throw new Error('Cannot activate objective without at least one target');
    }

    const [period] = await tx
      .select()
      .from(strategicPlanningPeriods)
      .where(eq(strategicPlanningPeriods.id, existing.planningPeriodId))
      .limit(1);

    for (const target of targets) {
      if (!isSupportedMetricKey(target.metricKey)) {
        throw new Error(`Target ${target.id} has unsupported metric key: ${target.metricKey}`);
      }
      assertEvaluationDateInPeriod(target.evaluationDate, period.startDate, period.endDate);
    }

    await tx
      .update(strategicPlanningObjectives)
      .set({ status: 'active', updatedByUserId: actorUserId })
      .where(eq(strategicPlanningObjectives.id, id));

    const afterRow = await tx
      .select()
      .from(strategicPlanningObjectives)
      .where(eq(strategicPlanningObjectives.id, id))
      .limit(1);

    await logManagerialAudit({
      executor: tx,
      actorUserId,
      action: AuditActions.STRATEGIC_OBJECTIVE_ACTIVATE,
      targetType: 'strategic_planning_objective',
      targetId: id,
      beforeData: existing,
      afterData: afterRow,
    });

    return afterRow;
  });
}

export async function completeObjective(id: number, actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return db.transaction(async (tx) => {
    await verifySuperAdmin(tx, actorUserId);

    const [existing] = await tx
      .select()
      .from(strategicPlanningObjectives)
      .where(eq(strategicPlanningObjectives.id, id))
      .for('update');

    if (!existing) throw new Error('Objective not found');
    assertValidTransition(existing.status, 'completed');

    await tx
      .update(strategicPlanningObjectives)
      .set({ status: 'completed', updatedByUserId: actorUserId })
      .where(eq(strategicPlanningObjectives.id, id));

    const afterRow = await tx
      .select()
      .from(strategicPlanningObjectives)
      .where(eq(strategicPlanningObjectives.id, id))
      .limit(1);

    await logManagerialAudit({
      executor: tx,
      actorUserId,
      action: AuditActions.STRATEGIC_OBJECTIVE_COMPLETE,
      targetType: 'strategic_planning_objective',
      targetId: id,
      beforeData: existing,
      afterData: afterRow,
    });

    return afterRow;
  });
}

export async function cancelObjective(id: number, actorUserId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  if (!reason || reason.trim().length === 0) {
    throw new Error('Cancellation reason is required');
  }

  return db.transaction(async (tx) => {
    await verifySuperAdmin(tx, actorUserId);

    const [existing] = await tx
      .select()
      .from(strategicPlanningObjectives)
      .where(eq(strategicPlanningObjectives.id, id))
      .for('update');

    if (!existing) throw new Error('Objective not found');
    assertValidTransition(existing.status, 'cancelled');

    await tx
      .update(strategicPlanningObjectives)
      .set({ status: 'cancelled', updatedByUserId: actorUserId })
      .where(eq(strategicPlanningObjectives.id, id));

    const afterRow = await tx
      .select()
      .from(strategicPlanningObjectives)
      .where(eq(strategicPlanningObjectives.id, id))
      .limit(1);

    await logManagerialAudit({
      executor: tx,
      actorUserId,
      action: AuditActions.STRATEGIC_OBJECTIVE_CANCEL,
      targetType: 'strategic_planning_objective',
      targetId: id,
      beforeData: existing,
      afterData: afterRow,
      metadata: { reason: reason.trim() },
    });

    return afterRow;
  });
}

// ─── Target Functions ────────────────────────────────────────────

export async function createTarget(
  input: {
    objectiveId: number;
    metricKey: string;
    label: string;
    targetValue: number;
    comparisonDirection?: ComparisonDirection;
    evaluationDate: string;
  },
  actorUserId: number,
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const metricKey = assertMetricKey(input.metricKey);
  const comparisonDirection = input.comparisonDirection ?? 'at_least';

  if (input.targetValue < 0 || input.targetValue > 2_147_483_647) {
    throw new Error('targetValue must be between 0 and 2,147,483,647');
  }

  return db.transaction(async (tx) => {
    await verifySuperAdmin(tx, actorUserId);

    const [objective] = await tx
      .select()
      .from(strategicPlanningObjectives)
      .where(eq(strategicPlanningObjectives.id, input.objectiveId))
      .for('update');

    if (!objective) throw new Error('Objective not found');
    if (objective.status !== 'draft') {
      throw new Error('Targets can only be added to draft objectives');
    }

    const [period] = await tx
      .select()
      .from(strategicPlanningPeriods)
      .where(eq(strategicPlanningPeriods.id, objective.planningPeriodId))
      .limit(1);

    assertEvaluationDateInPeriod(input.evaluationDate, period.startDate, period.endDate);

    const [result] = await tx.insert(strategicPlanningTargets).values({
      objectiveId: input.objectiveId,
      metricKey,
      label: input.label,
      targetValue: input.targetValue,
      comparisonDirection,
      evaluationDate: input.evaluationDate,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
    });

    const afterRow = await tx
      .select()
      .from(strategicPlanningTargets)
      .where(eq(strategicPlanningTargets.id, result.insertId))
      .limit(1);

    await logManagerialAudit({
      executor: tx,
      actorUserId,
      action: AuditActions.STRATEGIC_TARGET_CREATE,
      targetType: 'strategic_planning_target',
      targetId: result.insertId,
      beforeData: null,
      afterData: afterRow,
    });

    return afterRow;
  });
}

export async function updateTarget(
  input: {
    id: number;
    metricKey?: string;
    label?: string;
    targetValue?: number;
    comparisonDirection?: ComparisonDirection;
    evaluationDate?: string;
  },
  actorUserId: number,
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return db.transaction(async (tx) => {
    await verifySuperAdmin(tx, actorUserId);

    const [existing] = await tx
      .select()
      .from(strategicPlanningTargets)
      .where(eq(strategicPlanningTargets.id, input.id))
      .for('update');

    if (!existing) throw new Error('Target not found');

    const [objective] = await tx
      .select()
      .from(strategicPlanningObjectives)
      .where(eq(strategicPlanningObjectives.id, existing.objectiveId))
      .for('update');

    if (!objective || objective.status !== 'draft') {
      throw new Error('Targets can only be edited while the parent objective is in draft status');
    }

    const metricKey = input.metricKey ? assertMetricKey(input.metricKey) : existing.metricKey;
    const label = input.label ?? existing.label;
    const targetValue = input.targetValue ?? existing.targetValue;
    const comparisonDirection = input.comparisonDirection ?? existing.comparisonDirection;
    const evaluationDate = input.evaluationDate ?? existing.evaluationDate;

    if (input.targetValue !== undefined && (input.targetValue < 0 || input.targetValue > 2_147_483_647)) {
      throw new Error('targetValue must be between 0 and 2,147,483,647');
    }

    if (input.evaluationDate) {
      const [period] = await tx
        .select()
        .from(strategicPlanningPeriods)
        .where(eq(strategicPlanningPeriods.id, objective.planningPeriodId))
        .limit(1);

      assertEvaluationDateInPeriod(evaluationDate, period.startDate, period.endDate);
    }

    if (
      metricKey === existing.metricKey &&
      label === existing.label &&
      targetValue === existing.targetValue &&
      comparisonDirection === existing.comparisonDirection &&
      evaluationDate === existing.evaluationDate
    ) {
      throw new Error('No changes to update');
    }

    await tx
      .update(strategicPlanningTargets)
      .set({
        metricKey,
        label,
        targetValue,
        comparisonDirection,
        evaluationDate,
        updatedByUserId: actorUserId,
      })
      .where(eq(strategicPlanningTargets.id, input.id));

    const afterRow = await tx
      .select()
      .from(strategicPlanningTargets)
      .where(eq(strategicPlanningTargets.id, input.id))
      .limit(1);

    await logManagerialAudit({
      executor: tx,
      actorUserId,
      action: AuditActions.STRATEGIC_TARGET_UPDATE,
      targetType: 'strategic_planning_target',
      targetId: input.id,
      beforeData: existing,
      afterData: afterRow,
    });

    return afterRow;
  });
}

export async function removeTarget(id: number, actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return db.transaction(async (tx) => {
    await verifySuperAdmin(tx, actorUserId);

    const [existing] = await tx
      .select()
      .from(strategicPlanningTargets)
      .where(eq(strategicPlanningTargets.id, id))
      .for('update');

    if (!existing) throw new Error('Target not found');

    const [objective] = await tx
      .select()
      .from(strategicPlanningObjectives)
      .where(eq(strategicPlanningObjectives.id, existing.objectiveId))
      .for('update');

    if (!objective || objective.status !== 'draft') {
      throw new Error('Targets can only be removed while the parent objective is in draft status');
    }

    await tx
      .delete(strategicPlanningTargets)
      .where(eq(strategicPlanningTargets.id, id));

    await logManagerialAudit({
      executor: tx,
      actorUserId,
      action: AuditActions.STRATEGIC_TARGET_REMOVE,
      targetType: 'strategic_planning_target',
      targetId: id,
      beforeData: existing,
      afterData: null,
    });

    return { success: true };
  });
}

export async function getTargetProgress(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [target] = await db
    .select()
    .from(strategicPlanningTargets)
    .where(eq(strategicPlanningTargets.id, id))
    .limit(1);

  if (!target) return null;

  const metricDef = getMetricDefinition(target.metricKey);
  if (!metricDef) return null;

  const resolution = await resolveMetricValue(target.metricKey as SupportedMetricKey);

  const currentlySatisfies =
    resolution.state === 'resolved'
      ? target.comparisonDirection === 'at_least'
        ? resolution.value >= target.targetValue
        : resolution.value <= target.targetValue
      : null;

  return {
    target,
    metricDefinition: {
      key: metricDef.key,
      label: metricDef.label,
      description: metricDef.description,
      unit: metricDef.unit,
      semanticKind: metricDef.semanticKind,
    },
    currentActualValue: resolution.value,
    actualState: resolution.state,
    currentlySatisfiesComparison: currentlySatisfies,
    resolvedAt: new Date().toISOString(),
  };
}
