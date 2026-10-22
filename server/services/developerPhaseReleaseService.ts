import { TRPCError } from '@trpc/server';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { developmentPhases, developments, managerialAuditLogs, unitTypes, users } from '../../drizzle/schema';
import { AuditActions } from '../_core/auditLog';
import { getDb } from '../db-connection';
import { normalizeDateTimeForDb } from './developmentDateUtils';
import { publicDevelopmentEligibilityConditions } from './publicDevelopmentEligibility';

export type PrepareDevelopmentPhaseInput = {
  developmentId: number;
  name: string;
  phaseNumber: number;
  description?: string | null;
  launchDate?: string | null;
  completionDate?: string | null;
  unitTypeIds: string[];
};

type PhaseInventoryUnit = {
  id: string;
  name: string;
  isActive: number | null;
  totalUnits: number;
  availableUnits: number;
  reservedUnits: number | null;
};

type PhaseInventorySummary = {
  unitTypeCount: number;
  totalUnits: number;
  availableUnits: number;
  reservedUnits: number;
  unclassifiedRemainderUnits: number;
  inventoryValid: boolean;
};

function wholeCount(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isSafeInteger(parsed) ? parsed : -1;
}

function summarizeInventory(units: PhaseInventoryUnit[]): PhaseInventorySummary {
  const active = units.filter(unit => Number(unit.isActive ?? 0) === 1);
  const counts = active.map(unit => ({
    total: wholeCount(unit.totalUnits),
    available: wholeCount(unit.availableUnits),
    reserved: wholeCount(unit.reservedUnits),
  }));
  const inventoryValid = counts.every(
    count =>
      count.total >= 0 &&
      count.available >= 0 &&
      count.reserved >= 0 &&
      count.available + count.reserved <= count.total,
  );

  return {
    unitTypeCount: active.length,
    totalUnits: counts.reduce((sum, count) => sum + Math.max(count.total, 0), 0),
    availableUnits: counts.reduce((sum, count) => sum + Math.max(count.available, 0), 0),
    reservedUnits: counts.reduce((sum, count) => sum + Math.max(count.reserved, 0), 0),
    unclassifiedRemainderUnits: counts.reduce(
      (sum, count) => sum + Math.max(count.total - count.available - count.reserved, 0),
      0,
    ),
    inventoryValid,
  };
}

function phaseAssignmentBlockReason(unit: PhaseInventoryUnit): string | null {
  if (Number(unit.isActive ?? 0) !== 1) return 'Inactive unit types cannot be assigned to a phase.';

  const total = wholeCount(unit.totalUnits);
  const available = wholeCount(unit.availableUnits);
  const reserved = wholeCount(unit.reservedUnits);
  if (
    total < 1 ||
    available < 0 ||
    reserved < 0 ||
    available + reserved > total
  ) {
    return 'Inventory counts need to be corrected before this type can be assigned.';
  }
  if (reserved !== 0 || available !== total) {
    return 'Only fully available unit types can be moved into a planned phase. Reserved and unclassified inventory stays in place.';
  }
  return null;
}

function normalizePhaseDate(value: string | null | undefined, label: string): string | null {
  if (value === undefined || value === null || value.trim() === '') return null;
  const normalized = normalizeDateTimeForDb(value);
  if (!normalized) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: `Enter a valid ${label} date.` });
  }
  return normalized;
}

function inventorySnapshot(units: PhaseInventoryUnit[]) {
  const summary = summarizeInventory(units);
  return {
    unitTypeCount: summary.unitTypeCount,
    totalUnits: summary.totalUnits,
    availableUnits: summary.availableUnits,
    reservedUnits: summary.reservedUnits,
    unclassifiedRemainderUnits: summary.unclassifiedRemainderUnits,
  };
}

export async function getPhaseReleaseWorkspace(
  developmentId: number,
  cataloguePublisherId: number,
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable.' });

  const [development] = await db
    .select({
      id: developments.id,
      name: developments.name,
      approvalStatus: developments.approvalStatus,
      isPublished: developments.isPublished,
    })
    .from(developments)
    .where(
      and(
        eq(developments.id, developmentId),
        eq(developments.cataloguePublisherId, cataloguePublisherId),
      ),
    )
    .limit(1);

  if (!development) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found.' });
  }

  const [eligibleDevelopment] = await db
    .select({ id: developments.id })
    .from(developments)
    .where(
      and(
        eq(developments.id, developmentId),
        eq(developments.cataloguePublisherId, cataloguePublisherId),
        publicDevelopmentEligibilityConditions(),
      ),
    )
    .limit(1);
  const parentPublicEligible = Boolean(eligibleDevelopment);

  const [phases, unitRows] = await Promise.all([
    db
      .select({
        id: developmentPhases.id,
        developmentId: developmentPhases.developmentId,
        name: developmentPhases.name,
        phaseNumber: developmentPhases.phaseNumber,
        description: developmentPhases.description,
        status: developmentPhases.status,
        launchDate: developmentPhases.launchDate,
        completionDate: developmentPhases.completionDate,
        createdAt: developmentPhases.createdAt,
        updatedAt: developmentPhases.updatedAt,
      })
      .from(developmentPhases)
      .where(eq(developmentPhases.developmentId, developmentId))
      .orderBy(developmentPhases.phaseNumber, developmentPhases.id),
    db
      .select({
        id: unitTypes.id,
        name: unitTypes.name,
        phaseId: unitTypes.phaseId,
        isActive: unitTypes.isActive,
        totalUnits: unitTypes.totalUnits,
        availableUnits: unitTypes.availableUnits,
        reservedUnits: unitTypes.reservedUnits,
      })
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, developmentId))
      .orderBy(unitTypes.displayOrder, unitTypes.id),
  ]);

  const phaseIds = phases.map(phase => phase.id);
  const releaseEvents = phaseIds.length
    ? await db
        .select({
          phaseId: managerialAuditLogs.targetId,
          releasedAt: managerialAuditLogs.createdAt,
          releasedBy: users.name,
        })
        .from(managerialAuditLogs)
        .leftJoin(users, eq(managerialAuditLogs.actorUserId, users.id))
        .where(
          and(
            eq(managerialAuditLogs.action, AuditActions.DEVELOPER_PHASE_RELEASED),
            eq(managerialAuditLogs.targetType, 'development_phase'),
            inArray(managerialAuditLogs.targetId, phaseIds),
          ),
        )
        .orderBy(desc(managerialAuditLogs.createdAt), desc(managerialAuditLogs.id))
    : [];

  const latestReleaseByPhase = new Map<
    number,
    { releasedAt: string; releasedBy: string | null }
  >();
  for (const event of releaseEvents) {
    if (!latestReleaseByPhase.has(event.phaseId)) {
      latestReleaseByPhase.set(event.phaseId, {
        releasedAt: event.releasedAt,
        releasedBy: event.releasedBy,
      });
    }
  }

  const unitsByPhase = new Map<number, PhaseInventoryUnit[]>();
  const unassignedUnitTypes = unitRows
    .filter(unit => unit.phaseId === null)
    .map(unit => {
      const blockReason = phaseAssignmentBlockReason(unit);
      return {
        id: unit.id,
        name: unit.name,
        isActive: Number(unit.isActive ?? 0) === 1,
        totalUnits: wholeCount(unit.totalUnits),
        availableUnits: wholeCount(unit.availableUnits),
        reservedUnits: wholeCount(unit.reservedUnits),
        unclassifiedRemainderUnits: Math.max(
          wholeCount(unit.totalUnits) - wholeCount(unit.availableUnits) - wholeCount(unit.reservedUnits),
          0,
        ),
        eligibleForPhase: blockReason === null,
        assignmentBlockReason: blockReason,
      };
    });

  for (const unit of unitRows) {
    if (unit.phaseId === null) continue;
    const current = unitsByPhase.get(unit.phaseId) || [];
    current.push(unit);
    unitsByPhase.set(unit.phaseId, current);
  }

  const phaseInventory = phases.map(phase => {
    const units = unitsByPhase.get(phase.id) || [];
    const summary = summarizeInventory(units);
    const released = phase.status === 'selling';
    const releasedAudit = latestReleaseByPhase.get(phase.id) || null;
    const canTransitionToSelling = phase.status === 'planning' || phase.status === 'pre_launch';
    const releaseBlockers: string[] = [];

    if (!parentPublicEligible) {
      releaseBlockers.push('The parent development must be publicly eligible before phase release.');
    }
    if (!summary.inventoryValid) {
      releaseBlockers.push('Phase inventory has invalid counts and needs review.');
    }
    if (summary.unitTypeCount === 0) {
      releaseBlockers.push('Assign at least one active unit type to this phase.');
    }
    if (summary.availableUnits === 0) {
      releaseBlockers.push('At least one unit must be available to market at release.');
    }

    return {
      id: phase.id,
      developmentId: phase.developmentId,
      name: phase.name,
      phaseNumber: phase.phaseNumber,
      description: phase.description,
      status: phase.status,
      launchDate: phase.launchDate,
      completionDate: phase.completionDate,
      createdAt: phase.createdAt,
      updatedAt: phase.updatedAt,
      unitTypes: units.map(unit => ({
        id: unit.id,
        name: unit.name,
        isActive: Number(unit.isActive ?? 0) === 1,
        totalUnits: wholeCount(unit.totalUnits),
        availableUnits: wholeCount(unit.availableUnits),
        reservedUnits: wholeCount(unit.reservedUnits),
        unclassifiedRemainderUnits: Math.max(
          wholeCount(unit.totalUnits) - wholeCount(unit.availableUnits) - wholeCount(unit.reservedUnits),
          0,
        ),
      })),
      inventory: summary,
      marketAvailableUnits:
        released && parentPublicEligible && summary.inventoryValid ? summary.availableUnits : 0,
      isReleaseable:
        canTransitionToSelling &&
        parentPublicEligible &&
        summary.inventoryValid &&
        summary.unitTypeCount > 0 &&
        summary.availableUnits > 0,
      releaseBlockers: canTransitionToSelling ? releaseBlockers : [],
      releasedAt: releasedAudit?.releasedAt ?? null,
      releasedBy: releasedAudit?.releasedBy ?? null,
    };
  });

  const releasedPhaseIds = new Set(
    phaseInventory.filter(phase => phase.status === 'selling').map(phase => phase.id),
  );
  const marketableUnitTypes = unitRows.filter(
    unit =>
      Number(unit.isActive ?? 0) === 1 &&
      (unit.phaseId === null || releasedPhaseIds.has(unit.phaseId)),
  );
  const marketableInventorySummary = summarizeInventory(marketableUnitTypes);

  return {
    development: {
      id: development.id,
      name: development.name,
      approvalStatus: development.approvalStatus,
      isPublished: Number(development.isPublished) === 1,
      parentPublicEligible,
    },
    marketableInventory: {
      availableUnits:
        parentPublicEligible && marketableInventorySummary.inventoryValid
          ? marketableInventorySummary.availableUnits
          : 0,
      unitTypeCount: parentPublicEligible ? marketableInventorySummary.unitTypeCount : 0,
    },
    phases: phaseInventory,
    unassignedUnitTypes,
  };
}

export async function prepareDevelopmentPhase(
  input: PrepareDevelopmentPhaseInput,
  actorUserId: number,
  cataloguePublisherId: number,
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable.' });

  const name = input.name.trim();
  const description = input.description?.trim() || null;
  const launchDate = normalizePhaseDate(input.launchDate, 'launch');
  const completionDate = normalizePhaseDate(input.completionDate, 'completion');
  if (!name) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Phase name is required.' });
  if (launchDate && completionDate && completionDate < launchDate) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Completion date must be after launch date.' });
  }

  const unitTypeIds = Array.from(new Set(input.unitTypeIds.map(id => id.trim())));
  if (unitTypeIds.length === 0) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Assign at least one unit type to the phase.' });
  }

  return db.transaction(async tx => {
    const [development] = await tx
      .select({ id: developments.id })
      .from(developments)
      .where(
        and(
          eq(developments.id, input.developmentId),
          eq(developments.cataloguePublisherId, cataloguePublisherId),
        ),
      )
      .limit(1)
      .for('update');
    if (!development) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found.' });
    }

    const [duplicate] = await tx
      .select({ id: developmentPhases.id })
      .from(developmentPhases)
      .where(
        and(
          eq(developmentPhases.developmentId, input.developmentId),
          eq(developmentPhases.phaseNumber, input.phaseNumber),
        ),
      )
      .limit(1);
    if (duplicate) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: `Phase ${input.phaseNumber} already exists for this development.`,
      });
    }

    const selectedUnits = await tx
      .select({
        id: unitTypes.id,
        name: unitTypes.name,
        phaseId: unitTypes.phaseId,
        isActive: unitTypes.isActive,
        totalUnits: unitTypes.totalUnits,
        availableUnits: unitTypes.availableUnits,
        reservedUnits: unitTypes.reservedUnits,
      })
      .from(unitTypes)
      .where(and(eq(unitTypes.developmentId, input.developmentId), inArray(unitTypes.id, unitTypeIds)))
      .orderBy(unitTypes.id)
      .for('update');

    if (selectedUnits.length !== unitTypeIds.length) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Every selected unit type must belong to this development.',
      });
    }

    const invalidUnit = selectedUnits.find(unit => unit.phaseId !== null || phaseAssignmentBlockReason(unit));
    if (invalidUnit) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message:
          invalidUnit.phaseId !== null
            ? `${invalidUnit.name} already belongs to a phase.`
            : phaseAssignmentBlockReason(invalidUnit) || 'This unit type cannot be assigned to a phase.',
      });
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [insertResult] = await tx.insert(developmentPhases).values({
      developmentId: input.developmentId,
      name,
      phaseNumber: input.phaseNumber,
      description,
      status: 'planning',
      launchDate,
      completionDate,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const phaseId = Number(insertResult.insertId);
    if (!Number.isSafeInteger(phaseId) || phaseId <= 0) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'The planned phase could not be created.',
      });
    }

    await tx
      .update(unitTypes)
      .set({ phaseId, updatedAt: timestamp })
      .where(
        and(
          eq(unitTypes.developmentId, input.developmentId),
          inArray(unitTypes.id, unitTypeIds),
          isNull(unitTypes.phaseId),
        ),
      );

    const assignedUnits = await tx
      .select({ id: unitTypes.id })
      .from(unitTypes)
      .where(and(eq(unitTypes.developmentId, input.developmentId), eq(unitTypes.phaseId, phaseId)));
    if (assignedUnits.length !== unitTypeIds.length) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'The selected inventory changed while preparing this phase. No changes were saved.',
      });
    }

    return { success: true as const, developmentId: input.developmentId, phaseId };
  });
}

export async function releaseDevelopmentPhase(
  input: { developmentId: number; phaseId: number },
  actorUserId: number,
  cataloguePublisherId: number,
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable.' });

  return db.transaction(async tx => {
    const [development] = await tx
      .select({ id: developments.id, name: developments.name })
      .from(developments)
      .where(
        and(
          eq(developments.id, input.developmentId),
          eq(developments.cataloguePublisherId, cataloguePublisherId),
        ),
      )
      .limit(1)
      .for('update');
    if (!development) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found.' });
    }

    const [eligibleDevelopment] = await tx
      .select({ id: developments.id })
      .from(developments)
      .where(
        and(
          eq(developments.id, input.developmentId),
          eq(developments.cataloguePublisherId, cataloguePublisherId),
          publicDevelopmentEligibilityConditions(),
        ),
      )
      .limit(1);
    if (!eligibleDevelopment) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'The parent development must be publicly eligible before a phase can be released.',
      });
    }

    const [phase] = await tx
      .select({
        id: developmentPhases.id,
        name: developmentPhases.name,
        phaseNumber: developmentPhases.phaseNumber,
        status: developmentPhases.status,
      })
      .from(developmentPhases)
      .where(
        and(
          eq(developmentPhases.id, input.phaseId),
          eq(developmentPhases.developmentId, input.developmentId),
        ),
      )
      .limit(1)
      .for('update');
    if (!phase) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Phase not found.' });
    }
    if (phase.status !== 'planning' && phase.status !== 'pre_launch') {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Only a planned or pre-launch phase can be released.',
      });
    }

    const phaseUnits = await tx
      .select({
        id: unitTypes.id,
        name: unitTypes.name,
        isActive: unitTypes.isActive,
        totalUnits: unitTypes.totalUnits,
        availableUnits: unitTypes.availableUnits,
        reservedUnits: unitTypes.reservedUnits,
      })
      .from(unitTypes)
      .where(
        and(
          eq(unitTypes.developmentId, input.developmentId),
          eq(unitTypes.phaseId, input.phaseId),
        ),
      )
      .orderBy(unitTypes.id)
      .for('update');
    const snapshot = inventorySnapshot(phaseUnits);
    const validInventory = summarizeInventory(phaseUnits).inventoryValid;
    if (snapshot.unitTypeCount === 0 || !validInventory || snapshot.availableUnits <= 0) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message:
          'This phase needs valid active inventory and at least one available unit before release.',
      });
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await tx
      .update(developmentPhases)
      .set({ status: 'selling', updatedAt: timestamp })
      .where(
        and(
          eq(developmentPhases.id, input.phaseId),
          eq(developmentPhases.developmentId, input.developmentId),
          eq(developmentPhases.status, phase.status),
        ),
      );
    await tx.insert(managerialAuditLogs).values({
      actorUserId,
      action: AuditActions.DEVELOPER_PHASE_RELEASED,
      targetType: 'development_phase',
      targetId: input.phaseId,
      beforeData: { status: phase.status },
      afterData: { status: 'selling' },
      metadata: {
        developmentId: input.developmentId,
        developmentName: development.name,
        phaseNumber: phase.phaseNumber,
        phaseName: phase.name,
        inventory: snapshot,
        unitTypeIds: phaseUnits.filter(unit => Number(unit.isActive ?? 0) === 1).map(unit => unit.id),
      },
      createdAt: timestamp,
    });

    return {
      success: true as const,
      developmentId: input.developmentId,
      phaseId: input.phaseId,
      status: 'selling' as const,
      releasedAt: timestamp,
      inventory: snapshot,
    };
  });
}
