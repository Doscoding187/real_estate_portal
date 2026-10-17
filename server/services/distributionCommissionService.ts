import { isValidDistributionReferralTermsSnapshot } from './distributionReferralTermsSnapshotService';

type CommissionTriggerStage = 'contract_signed' | 'bond_approved';
type DealStage =
  | 'viewing_scheduled'
  | 'viewing_completed'
  | 'application_submitted'
  | 'contract_signed'
  | 'bond_approved'
  | 'commission_pending'
  | 'commission_paid'
  | 'cancelled';

type EnsureCommissionInput = {
  deal: {
    id: number;
    programId: number;
    developmentId: number;
    agentId: number;
    commissionTriggerStage: CommissionTriggerStage;
    commissionBaseAmount?: number | null;
    affordabilityPurchasePrice?: number | null;
    dealAmount?: number | null;
    referralTermsSnapshotJson?: unknown;
    referralTermsSnapshotDigest?: string | null;
  };
  transitionToStage: DealStage;
  actorUserId: number;
  source: string;
  deps: {
    findExistingEntry: (
      dealId: number,
      triggerStage: CommissionTriggerStage,
    ) => Promise<{ id: number } | null>;
    insertEntry: (payload: {
      dealId: number;
      programId: number;
      developmentId: number;
      agentId: number;
      calculationBaseAmount: number;
      commissionPercent: number | null;
      commissionAmount: number;
      currency: string;
      triggerStage: CommissionTriggerStage;
      entryStatus: 'pending';
      notes: string;
      createdBy: number;
      updatedBy: number;
    }) => Promise<void>;
    setDealCommissionPending: (dealId: number) => Promise<void>;
    insertCommissionCreatedEvent: (input: {
      dealId: number;
      toStage: DealStage;
      actorUserId: number;
      metadata: Record<string, unknown>;
    }) => Promise<void>;
  };
};

const stageRank: Record<DealStage, number> = {
  viewing_scheduled: 1,
  viewing_completed: 2,
  application_submitted: 3,
  contract_signed: 4,
  bond_approved: 5,
  commission_pending: 6,
  commission_paid: 7,
  cancelled: 99,
};

function shouldCreateCommissionEntry(triggerStage: CommissionTriggerStage, nextStage: DealStage) {
  if (nextStage === 'cancelled') return false;
  return stageRank[nextStage] >= stageRank[triggerStage];
}

function resolveCalculationBaseAmount(input: EnsureCommissionInput['deal']) {
  const candidates = [
    input.commissionBaseAmount,
    input.affordabilityPurchasePrice,
    input.dealAmount,
  ];

  for (const value of candidates) {
    const normalized = Number(value ?? 0);
    if (Number.isFinite(normalized) && normalized > 0) {
      return Math.round(normalized);
    }
  }

  return 0;
}

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

function readFrozenPayoutTerms(
  snapshotValue: unknown,
  expectedDigest: string | null | undefined,
) {
  if (!isValidDistributionReferralTermsSnapshot(snapshotValue, expectedDigest)) return null;
  const snapshot = asRecord(snapshotValue);
  const program = snapshot ? asRecord(snapshot.program) : null;
  if (!program) return null;

  const rawModel = String(program.commissionModel || '').trim();
  const commissionModel = rawModel === 'flat_amount' ? 'fixed_amount' : rawModel;
  if (commissionModel !== 'flat_percentage' && commissionModel !== 'fixed_amount') return null;

  const toFiniteNumber = (value: unknown) => {
    if (value === null || typeof value === 'undefined' || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const currencyCode = String(program.currencyCode || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currencyCode)) return null;

  return {
    commissionModel,
    defaultCommissionPercent: toFiniteNumber(program.defaultCommissionPercent),
    defaultCommissionAmount: toFiniteNumber(program.defaultCommissionAmount),
    currencyCode,
  };
}

export async function ensureCommissionEntryForDeal(input: EnsureCommissionInput) {
  const shouldCreate = shouldCreateCommissionEntry(
    input.deal.commissionTriggerStage,
    input.transitionToStage,
  );
  if (!shouldCreate) {
    return { created: false as const, reason: 'stage_not_reached' as const };
  }

  let existing: { id: number } | null = null;
  try {
    existing = await input.deps.findExistingEntry(
      input.deal.id,
      input.deal.commissionTriggerStage,
    );
  } catch (error) {
    // Commission creation is part of the same deal transition transaction.
    // Never advance the deal while silently omitting its financial fact.
    if (error instanceof Error) {
      const wrapped = new Error(
        'Referral payout record could not be persisted; deal transition rolled back.',
      );
      (wrapped as Error & { cause?: unknown }).cause = error;
      throw wrapped;
    }
    throw error;
  }
  if (existing) {
    return { created: false as const, reason: 'already_exists' as const, entryId: existing.id };
  }

  const frozenTerms = readFrozenPayoutTerms(
    input.deal.referralTermsSnapshotJson,
    input.deal.referralTermsSnapshotDigest,
  );
  if (!frozenTerms) {
    throw new Error(
      'Referral payout terms were not captured for this deal; the stage transition was not applied.',
    );
  }
  const model = frozenTerms.commissionModel;
  const defaultPercent = Number(frozenTerms.defaultCommissionPercent ?? 0);
  const defaultAmount = Number(frozenTerms.defaultCommissionAmount ?? 0);
  const calculationBaseAmount = resolveCalculationBaseAmount(input.deal);
  const commissionPercent =
    model === 'fixed_amount' ? null : Number.isFinite(defaultPercent) ? defaultPercent : null;
  const commissionAmount =
    model === 'fixed_amount' || model === 'hybrid'
      ? Math.max(0, defaultAmount)
      : Math.round(Math.max(0, (calculationBaseAmount * Math.max(0, defaultPercent)) / 100));

  try {
    await input.deps.insertEntry({
      dealId: input.deal.id,
      programId: input.deal.programId,
      developmentId: input.deal.developmentId,
      agentId: input.deal.agentId,
      calculationBaseAmount,
      commissionPercent,
      commissionAmount,
      currency: frozenTerms.currencyCode,
      triggerStage: input.deal.commissionTriggerStage,
      entryStatus: 'pending',
      notes: `Auto-generated by ${input.source}.`,
      createdBy: input.actorUserId,
      updatedBy: input.actorUserId,
    });

    await input.deps.setDealCommissionPending(input.deal.id);
    await input.deps.insertCommissionCreatedEvent({
      dealId: input.deal.id,
      toStage: input.transitionToStage,
      actorUserId: input.actorUserId,
      metadata: {
        source: input.source,
        triggerStage: input.deal.commissionTriggerStage,
        model,
        defaultPercent,
        defaultAmount,
        calculationBaseAmount,
      },
    });
  } catch (error) {
    // A missing or incompatible authority must fail the enclosing transition;
    // returning a successful stage change would create a false financial state.
    if (error instanceof Error) {
      const wrapped = new Error(
        'Referral payout record could not be persisted; deal transition rolled back.',
      );
      (wrapped as Error & { cause?: unknown }).cause = error;
      throw wrapped;
    }
    throw error;
  }

  return { created: true as const };
}
