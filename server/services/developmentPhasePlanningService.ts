import { and, asc, eq, ne } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

import { developmentPhases, developments, managerialAuditLogs } from '../../drizzle/schema';
import { AuditActions } from '../_core/auditLog';
import { getDb } from '../db-connection';
import { developerIdentityService } from './developerIdentityService';

type DatabaseExecutor = NonNullable<Awaited<ReturnType<typeof getDb>>>;

const PHASE_PLAN_EDITOR_ROLES = new Set(['owner', 'admin', 'sales_manager']);

export type DevelopmentPhasePlanInput = {
  name: string;
  phaseNumber: number;
  description?: string | null;
  specType?: 'affordable' | 'gap' | 'luxury' | 'custom' | null;
  customSpecType?: string | null;
  phaseHighlights?: string[];
};

const phasePlanFields = {
  id: developmentPhases.id,
  developmentId: developmentPhases.developmentId,
  name: developmentPhases.name,
  phaseNumber: developmentPhases.phaseNumber,
  description: developmentPhases.description,
  status: developmentPhases.status,
  specType: developmentPhases.specType,
  customSpecType: developmentPhases.customSpecType,
  phaseHighlights: developmentPhases.phaseHighlights,
};

async function getDeveloperIdentityForUser(userId: number) {
  const profile = await developerIdentityService.getDeveloperByUserId(userId);
  if (!profile) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Developer profile not found.' });
  }

  return profile;
}

async function requirePhasePlanEditor(userId: number) {
  const profile = await getDeveloperIdentityForUser(userId);
  if (!PHASE_PLAN_EDITOR_ROLES.has(profile.membership.role)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Only a developer owner, admin, or sales manager can change phase plans.',
    });
  }

  return profile;
}

function normalizePlanInput(input: DevelopmentPhasePlanInput) {
  const specType = input.specType ?? null;
  const customSpecType = input.customSpecType?.trim() || null;
  if (specType === 'custom' && !customSpecType) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Add a label for the custom phase specification.',
    });
  }

  return {
    name: input.name.trim(),
    phaseNumber: input.phaseNumber,
    description: input.description?.trim() || null,
    specType,
    customSpecType: specType === 'custom' ? customSpecType : null,
    phaseHighlights:
      input.phaseHighlights
        ?.map(highlight => highlight.trim())
        .filter(Boolean)
        .slice(0, 12) ?? [],
  };
}

function normalizePhaseHighlights(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((highlight): highlight is string => typeof highlight === 'string')
    .map(highlight => highlight.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizePhasePlan<T extends { phaseHighlights: unknown }>(phase: T) {
  return { ...phase, phaseHighlights: normalizePhaseHighlights(phase.phaseHighlights) };
}

async function requireOwnedDevelopment(
  executor: DatabaseExecutor,
  developmentId: number,
  publisherId: number,
  lock = false,
) {
  const query = executor
    .select({ id: developments.id })
    .from(developments)
    .where(
      and(eq(developments.id, developmentId), eq(developments.cataloguePublisherId, publisherId)),
    )
    .limit(1);

  const [development] = lock ? await query.for('update') : await query;
  if (!development) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found.' });
  }
}

async function ensurePhaseNumberAvailable(
  executor: DatabaseExecutor,
  developmentId: number,
  phaseNumber: number,
  exceptPhaseId?: number,
) {
  const conditions = [
    eq(developmentPhases.developmentId, developmentId),
    eq(developmentPhases.phaseNumber, phaseNumber),
  ];
  if (exceptPhaseId !== undefined) conditions.push(ne(developmentPhases.id, exceptPhaseId));

  const [existing] = await executor
    .select({ id: developmentPhases.id })
    .from(developmentPhases)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: `Phase ${phaseNumber} already exists in this development.`,
    });
  }
}

export async function listDeveloperPhasePlans(developmentId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable.' });

  const profile = await getDeveloperIdentityForUser(userId);
  await requireOwnedDevelopment(db, developmentId, profile.publisherId);

  const phases = await db
    .select(phasePlanFields)
    .from(developmentPhases)
    .where(eq(developmentPhases.developmentId, developmentId))
    .orderBy(asc(developmentPhases.phaseNumber), asc(developmentPhases.id));

  return {
    phases: phases.map(normalizePhasePlan),
    canManage: PHASE_PLAN_EDITOR_ROLES.has(profile.membership.role),
  };
}

export async function prepareDeveloperPhase(
  developmentId: number,
  userId: number,
  input: DevelopmentPhasePlanInput,
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable.' });

  const profile = await requirePhasePlanEditor(userId);
  const plan = normalizePlanInput(input);

  return db.transaction(async tx => {
    // Locking the parent serializes phase-number checks for this development.
    await requireOwnedDevelopment(tx, developmentId, profile.publisherId, true);
    await ensurePhaseNumberAvailable(tx, developmentId, plan.phaseNumber);

    const [insertResult] = await tx.insert(developmentPhases).values({
      developmentId,
      ...plan,
      status: 'planning',
    });
    const phaseId = Number(insertResult.insertId);
    const [created] = await tx
      .select(phasePlanFields)
      .from(developmentPhases)
      .where(
        and(eq(developmentPhases.id, phaseId), eq(developmentPhases.developmentId, developmentId)),
      )
      .limit(1);

    if (!created) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'The phase plan was not available after creation.',
      });
    }

    await tx.insert(managerialAuditLogs).values({
      actorUserId: userId,
      action: AuditActions.DEVELOPER_PHASE_PREPARED,
      targetType: 'development_phase',
      targetId: phaseId,
      afterData: {
        developmentId,
        name: created.name,
        phaseNumber: created.phaseNumber,
        description: created.description,
        status: created.status,
        specType: created.specType,
        customSpecType: created.customSpecType,
        phaseHighlights: created.phaseHighlights,
      },
      metadata: { developmentId },
    });

    return normalizePhasePlan(created);
  });
}

export async function updateDeveloperPhasePlan(
  phaseId: number,
  userId: number,
  input: DevelopmentPhasePlanInput & { expectedPlan: DevelopmentPhasePlanInput },
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable.' });

  const profile = await requirePhasePlanEditor(userId);
  const [phaseReference] = await db
    .select({ developmentId: developmentPhases.developmentId })
    .from(developmentPhases)
    .where(eq(developmentPhases.id, phaseId))
    .limit(1);

  if (!phaseReference) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Phase not found.' });
  }

  const plan = normalizePlanInput(input);
  return db.transaction(async tx => {
    await requireOwnedDevelopment(tx, phaseReference.developmentId, profile.publisherId, true);

    const [current] = await tx
      .select(phasePlanFields)
      .from(developmentPhases)
      .where(
        and(
          eq(developmentPhases.id, phaseId),
          eq(developmentPhases.developmentId, phaseReference.developmentId),
        ),
      )
      .limit(1)
      .for('update');

    if (!current) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Phase not found.' });
    }
    const expectedPlan = normalizePlanInput(input.expectedPlan);
    const currentPlan = normalizePlanInput({
      name: current.name,
      phaseNumber: Number(current.phaseNumber),
      description: current.description,
      specType: current.specType,
      customSpecType: current.customSpecType,
      phaseHighlights: normalizePhaseHighlights(current.phaseHighlights),
    });
    if (JSON.stringify(currentPlan) !== JSON.stringify(expectedPlan)) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message:
          'This phase plan changed after you opened it. Refresh and review the latest details before saving.',
      });
    }
    if (current.status !== 'planning') {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Only planned phases can be edited here.',
      });
    }

    await ensurePhaseNumberAvailable(tx, phaseReference.developmentId, plan.phaseNumber, phaseId);

    await tx
      .update(developmentPhases)
      .set(plan)
      .where(
        and(
          eq(developmentPhases.id, phaseId),
          eq(developmentPhases.developmentId, phaseReference.developmentId),
          eq(developmentPhases.status, 'planning'),
        ),
      );

    const [updated] = await tx
      .select(phasePlanFields)
      .from(developmentPhases)
      .where(
        and(
          eq(developmentPhases.id, phaseId),
          eq(developmentPhases.developmentId, phaseReference.developmentId),
        ),
      )
      .limit(1);

    if (!updated) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'The phase plan was not available after saving.',
      });
    }

    await tx.insert(managerialAuditLogs).values({
      actorUserId: userId,
      action: AuditActions.DEVELOPER_PHASE_PLAN_UPDATED,
      targetType: 'development_phase',
      targetId: phaseId,
      beforeData: {
        name: current.name,
        phaseNumber: current.phaseNumber,
        description: current.description,
        specType: current.specType,
        customSpecType: current.customSpecType,
        phaseHighlights: current.phaseHighlights,
      },
      afterData: {
        name: updated.name,
        phaseNumber: updated.phaseNumber,
        description: updated.description,
        status: updated.status,
        specType: updated.specType,
        customSpecType: updated.customSpecType,
        phaseHighlights: updated.phaseHighlights,
      },
      metadata: { developmentId: phaseReference.developmentId },
    });

    return normalizePhasePlan(updated);
  });
}
