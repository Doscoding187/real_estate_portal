import { TRPCError } from '@trpc/server';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { distributionDealEvents, distributionDeals, users } from '../../drizzle/schema';
import { isValidDistributionReferralTermsSnapshot } from './distributionReferralTermsSnapshotService';

export const DISTRIBUTION_REFERRAL_WORKFLOW_STEP_STATUSES = [
  'in_progress',
  'waiting',
  'completed',
  'not_applicable',
] as const;

export type DistributionReferralWorkflowStepStatus =
  (typeof DISTRIBUTION_REFERRAL_WORKFLOW_STEP_STATUSES)[number];

export type DistributionReferralWorkflowStep = {
  stepKey: string;
  stepLabel: string;
  stepType: string | null;
  stepOrder: number;
  isBlocking: boolean;
  partnerInstructions: string | null;
  ownerRole: string | null;
};

export type DistributionReferralWorkflowStepProgress = {
  stepKey: string;
  status: DistributionReferralWorkflowStepStatus | 'not_started';
  partnerUpdate: string | null;
  updatedAt: string | null;
  updatedByRole: string | null;
};

export type DistributionReferralWorkflowProgressResult = {
  verified: boolean;
  steps: DistributionReferralWorkflowStep[];
  progress: DistributionReferralWorkflowStepProgress[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asBoolean(value: unknown): boolean | null {
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;
  return null;
}

function normalizeWorkflowSteps(
  input: unknown,
  source: 'intake_policy' | 'program_workflow',
): DistributionReferralWorkflowStep[] | null {
  if (typeof input === 'undefined' || input === null) return [];
  if (!Array.isArray(input) || input.length > 30) return null;

  const steps: DistributionReferralWorkflowStep[] = [];
  for (const [index, value] of input.entries()) {
    const row = asRecord(value);
    if (!row) return null;

    const rawStepKey = source === 'intake_policy' ? row.key : row.stepKey;
    const rawStepLabel = source === 'intake_policy' ? row.title : row.stepLabel;
    if (typeof rawStepKey !== 'string' || typeof rawStepLabel !== 'string') return null;
    const stepKey = rawStepKey.trim();
    const stepLabel = rawStepLabel.trim();
    if (stepKey.length < 2 || stepKey.length > 80 || stepLabel.length < 2 || stepLabel.length > 180) {
      return null;
    }

    const rawIsBlocking = asBoolean(row.isBlocking);
    if (rawIsBlocking === null) return null;

    let stepOrder = index + 1;
    let stepType: string | null = null;
    let partnerInstructions: string | null = null;
    let ownerRole: string | null = null;
    if (source === 'program_workflow') {
      const order = Number(row.stepOrder);
      if (!Number.isSafeInteger(order) || order < 1) return null;
      if (typeof row.stepType !== 'string' || !row.stepType.trim()) return null;
      stepOrder = order;
      stepType = row.stepType.trim();
    } else {
      if (typeof row.partnerInstructions !== 'string' || typeof row.ownerRole !== 'string') {
        return null;
      }
      partnerInstructions = row.partnerInstructions.trim();
      ownerRole = row.ownerRole.trim();
      if (
        partnerInstructions.length < 3 ||
        partnerInstructions.length > 4_000 ||
        ownerRole.length < 2 ||
        ownerRole.length > 120
      ) {
        return null;
      }
    }

    steps.push({
      stepKey,
      stepLabel,
      stepType,
      stepOrder,
      isBlocking: rawIsBlocking,
      partnerInstructions,
      ownerRole,
    });
  }
  return steps;
}

export function readConfiguredReferralWorkflowSteps(
  snapshotValue: unknown,
  expectedDigest: string | null | undefined,
): DistributionReferralWorkflowStep[] | null {
  if (!isValidDistributionReferralTermsSnapshot(snapshotValue, expectedDigest)) return null;
  const snapshot = asRecord(snapshotValue);
  if (!snapshot) return null;

  const rawIntakePolicy = snapshot.intakePolicy;
  const intakePolicy = rawIntakePolicy == null ? null : asRecord(rawIntakePolicy);
  if (rawIntakePolicy != null && !intakePolicy) return null;
  const rawIntakeConfiguration = intakePolicy?.configuration;
  const intakeConfiguration = rawIntakeConfiguration == null
    ? null
    : asRecord(rawIntakeConfiguration);
  if (rawIntakeConfiguration != null && !intakeConfiguration) return null;
  const intakeSteps = normalizeWorkflowSteps(
    intakeConfiguration?.workflowSteps,
    'intake_policy',
  );
  if (!intakeSteps) return null;

  const rawWorkflow = snapshot.workflow;
  const workflow = rawWorkflow == null ? null : asRecord(rawWorkflow);
  if (rawWorkflow != null && !workflow) return null;
  const programSteps = normalizeWorkflowSteps(workflow?.steps, 'program_workflow');
  if (!programSteps) return null;

  const steps = intakeSteps.length ? intakeSteps : programSteps;

  const keys = new Set<string>();
  const orders = new Set<number>();
  for (const step of steps) {
    if (keys.has(step.stepKey) || orders.has(step.stepOrder)) return null;
    keys.add(step.stepKey);
    orders.add(step.stepOrder);
  }
  return steps.sort((left, right) => left.stepOrder - right.stepOrder);
}

function isWorkflowStepStatus(value: unknown): value is DistributionReferralWorkflowStepStatus {
  return DISTRIBUTION_REFERRAL_WORKFLOW_STEP_STATUSES.includes(
    value as DistributionReferralWorkflowStepStatus,
  );
}

export function deriveReferralWorkflowStepProgress(input: {
  steps: DistributionReferralWorkflowStep[];
  events: Array<Record<string, unknown>>;
  termsSnapshotDigest: string | null | undefined;
}): DistributionReferralWorkflowStepProgress[] {
  const stepKeys = new Set(input.steps.map(step => step.stepKey));
  const latestByStepKey = new Map<string, DistributionReferralWorkflowStepProgress>();

  for (const event of input.events) {
    const metadata = asRecord(event.metadata);
    if (
      !metadata ||
      metadata.source !== 'manager.updateReferralWorkflowStep' ||
      metadata.termsSnapshotDigest !== input.termsSnapshotDigest
    ) {
      continue;
    }
    const stepKey = String(metadata.stepKey || '').trim();
    if (!stepKeys.has(stepKey) || latestByStepKey.has(stepKey) || !isWorkflowStepStatus(metadata.status)) {
      continue;
    }
    const partnerUpdate = String(metadata.partnerUpdate || '').trim();
    latestByStepKey.set(stepKey, {
      stepKey,
      status: metadata.status,
      partnerUpdate: partnerUpdate || null,
      updatedAt: event.eventAt || event.at ? String(event.eventAt || event.at) : null,
      updatedByRole: event.actorRole || event.byRole ? String(event.actorRole || event.byRole) : null,
    });
  }

  return input.steps.map(step => latestByStepKey.get(step.stepKey) || {
    stepKey: step.stepKey,
    status: 'not_started',
    partnerUpdate: null,
    updatedAt: null,
    updatedByRole: null,
  });
}

export async function getReferralWorkflowProgress(db: any, dealId: number) {
  const [deal] = await db
    .select({
      referralTermsSnapshotJson: distributionDeals.referralTermsSnapshotJson,
      referralTermsSnapshotDigest: distributionDeals.referralTermsSnapshotDigest,
    })
    .from(distributionDeals)
    .where(eq(distributionDeals.id, dealId))
    .limit(1);
  if (!deal) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Distribution deal not found.' });
  }

  const steps = readConfiguredReferralWorkflowSteps(
    deal.referralTermsSnapshotJson,
    deal.referralTermsSnapshotDigest,
  );
  if (!steps) {
    return { verified: false, steps: [], progress: [] };
  }

  const events = await db
    .select({
      id: distributionDealEvents.id,
      eventAt: distributionDealEvents.eventAt,
      metadata: distributionDealEvents.metadata,
      actorRole: users.role,
    })
    .from(distributionDealEvents)
    .leftJoin(users, eq(distributionDealEvents.actorUserId, users.id))
    .where(
      and(
        eq(distributionDealEvents.dealId, dealId),
        eq(distributionDealEvents.eventType, 'note'),
      ),
    )
    .orderBy(desc(distributionDealEvents.eventAt), desc(distributionDealEvents.id))
    .limit(500);

  if (events.length >= 500) {
    return { verified: false, steps: [], progress: [] };
  }

  return {
    verified: true,
    steps,
    progress: deriveReferralWorkflowStepProgress({
      steps,
      events,
      termsSnapshotDigest: deal.referralTermsSnapshotDigest,
    }),
  };
}

export async function getReferralWorkflowProgressForDeals(
  db: any,
  deals: Array<{
    dealId: number;
    referralTermsSnapshotJson: unknown;
    referralTermsSnapshotDigest: string | null | undefined;
  }>,
): Promise<Map<number, DistributionReferralWorkflowProgressResult>> {
  const results = new Map<number, DistributionReferralWorkflowProgressResult>();
  const dealIds = deals.map(deal => deal.dealId).filter(id => Number.isSafeInteger(id) && id > 0);
  if (!dealIds.length) return results;

  const stepsByDealId = new Map<number, DistributionReferralWorkflowStep[]>();
  for (const deal of deals) {
    const steps = readConfiguredReferralWorkflowSteps(
      deal.referralTermsSnapshotJson,
      deal.referralTermsSnapshotDigest,
    );
    if (steps) stepsByDealId.set(deal.dealId, steps);
    else results.set(deal.dealId, { verified: false, steps: [], progress: [] });
  }

  const verifiableDealIds = [...stepsByDealId.keys()];
  if (!verifiableDealIds.length) return results;

  const eventLimit = 10000;
  const events = await db
    .select({
      dealId: distributionDealEvents.dealId,
      eventAt: distributionDealEvents.eventAt,
      metadata: distributionDealEvents.metadata,
      actorRole: users.role,
    })
    .from(distributionDealEvents)
    .leftJoin(users, eq(distributionDealEvents.actorUserId, users.id))
    .where(
      and(
        inArray(distributionDealEvents.dealId, verifiableDealIds),
        eq(distributionDealEvents.eventType, 'note'),
      ),
    )
    .orderBy(desc(distributionDealEvents.eventAt), desc(distributionDealEvents.id))
    .limit(eventLimit);

  if (events.length >= eventLimit) {
    for (const dealId of verifiableDealIds) {
      results.set(dealId, { verified: false, steps: [], progress: [] });
    }
    return results;
  }

  const eventsByDealId = new Map<number, Array<Record<string, unknown>>>();
  for (const event of events) {
    const dealId = Number(event.dealId);
    const dealEvents = eventsByDealId.get(dealId) || [];
    dealEvents.push(event);
    eventsByDealId.set(dealId, dealEvents);
  }

  for (const deal of deals) {
    const steps = stepsByDealId.get(deal.dealId);
    if (!steps) continue;
    results.set(deal.dealId, {
      verified: true,
      steps,
      progress: deriveReferralWorkflowStepProgress({
        steps,
        events: eventsByDealId.get(deal.dealId) || [],
        termsSnapshotDigest: deal.referralTermsSnapshotDigest,
      }),
    });
  }
  return results;
}

export async function recordReferralWorkflowStepProgress(
  db: any,
  input: {
    dealId: number;
    actorUserId: number;
    stepKey: string;
    status: DistributionReferralWorkflowStepStatus;
    partnerUpdate?: string | null;
  },
) {
  const [deal] = await db
    .select({
      currentStage: distributionDeals.currentStage,
      referralTermsSnapshotJson: distributionDeals.referralTermsSnapshotJson,
      referralTermsSnapshotDigest: distributionDeals.referralTermsSnapshotDigest,
    })
    .from(distributionDeals)
    .where(eq(distributionDeals.id, input.dealId))
    .limit(1);
  if (!deal) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Distribution deal not found.' });
  }

  const steps = readConfiguredReferralWorkflowSteps(
    deal.referralTermsSnapshotJson,
    deal.referralTermsSnapshotDigest,
  );
  if (!steps) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'The saved opportunity process could not be verified for this referral.',
    });
  }
  const step = steps.find(candidate => candidate.stepKey === input.stepKey);
  if (!step) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'This process step is not part of the saved referral terms.',
    });
  }
  if (input.status === 'not_applicable' && step.isBlocking) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'A required process step cannot be marked as not needed.',
    });
  }

  const partnerUpdate = String(input.partnerUpdate || '').trim();
  if (partnerUpdate.length > 500) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Keep the update to 500 characters or fewer.',
    });
  }
  if (['waiting', 'not_applicable'].includes(input.status) && !partnerUpdate) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Add a short update for the referrer before saving this status.',
    });
  }

  const currentProgress = await getReferralWorkflowProgress(db, input.dealId);
  if (!currentProgress.verified) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'The referral process history is too large to verify safely. Contact an administrator.',
    });
  }
  const currentStepProgress = currentProgress.progress.find(item => item.stepKey === input.stepKey);
  if (
    currentStepProgress?.status === input.status &&
    currentStepProgress.partnerUpdate === (partnerUpdate || null)
  ) {
    return currentProgress;
  }

  await db
    .update(distributionDeals)
    .set({ updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(distributionDeals.id, input.dealId));

  await db.insert(distributionDealEvents).values({
    dealId: input.dealId,
    fromStage: deal.currentStage,
    toStage: deal.currentStage,
    eventType: 'note',
    actorUserId: input.actorUserId,
    metadata: {
      source: 'manager.updateReferralWorkflowStep',
      stepKey: step.stepKey,
      status: input.status,
      partnerUpdate: partnerUpdate || null,
      termsSnapshotDigest: deal.referralTermsSnapshotDigest,
    } as any,
    notes: null,
  });

  return await getReferralWorkflowProgress(db, input.dealId);
}
