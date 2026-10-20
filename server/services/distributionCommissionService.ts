import { isValidDistributionReferralTermsSnapshot } from './distributionReferralTermsSnapshotService';

type CommissionTriggerStage = 'contract_signed' | 'bond_approved';
type DealStage =
  | 'referral_received'
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
  referral_received: 1,
  viewing_scheduled: 2,
  viewing_completed: 3,
  application_submitted: 4,
  contract_signed: 5,
  bond_approved: 6,
  commission_pending: 7,
  commission_paid: 8,
  cancelled: 99,
};

function shouldCreateCommissionEntry(triggerStage: CommissionTriggerStage, nextStage: DealStage) {
  if (nextStage === 'cancelled') return false;
  return stageRank[nextStage] >= stageRank[triggerStage];
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

export function readFrozenPayoutTerms(
  snapshotValue: unknown,
  expectedDigest: string | null | undefined,
) {
  if (!isValidDistributionReferralTermsSnapshot(snapshotValue, expectedDigest)) return null;
  const snapshot = asRecord(snapshotValue);
  const program = snapshot ? asRecord(snapshot.program) : null;
  if (!snapshot || !program) return null;

  const toFiniteNumber = (value: unknown) => {
    if (value === null || typeof value === 'undefined' || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const referrerCommissionType: 'flat' | 'percentage' | null =
    program.referrerCommissionType === 'flat' || program.referrerCommissionType === 'percentage'
      ? program.referrerCommissionType
      : null;
  const referrerCommissionValue = toFiniteNumber(program.referrerCommissionValue);
  const referrerCommissionBasis: 'sale_price' | 'base_price' | null =
    program.referrerCommissionBasis === 'sale_price' ||
    program.referrerCommissionBasis === 'base_price'
      ? program.referrerCommissionBasis
      : null;
  const currencyCode = String(program.currencyCode || '')
    .trim()
    .toUpperCase();
  const marketMode =
    snapshot.marketMode === 'sale' || snapshot.marketMode === 'rent' ? snapshot.marketMode : null;
  if (!/^[A-Z]{3}$/.test(currencyCode)) return null;
  if (!referrerCommissionType || referrerCommissionValue === null || referrerCommissionValue <= 0) {
    return null;
  }
  if (
    referrerCommissionType === 'percentage' &&
    (!referrerCommissionBasis || marketMode !== 'sale')
  ) {
    return null;
  }

  return {
    commissionModel: referrerCommissionType === 'flat' ? 'fixed_amount' : 'flat_percentage',
    referrerCommissionType,
    referrerCommissionValue,
    referrerCommissionBasis,
    marketMode,
    currencyCode,
    payoutMilestone: typeof program.payoutMilestone === 'string' ? program.payoutMilestone : null,
    payoutMilestoneNotes:
      typeof program.payoutMilestoneNotes === 'string' ? program.payoutMilestoneNotes : null,
  };
}

function resolveCalculationBaseAmount(
  input: EnsureCommissionInput['deal'],
  basis: 'sale_price' | 'base_price' | null,
) {
  const rawAmount =
    basis === 'sale_price'
      ? input.dealAmount
      : basis === 'base_price'
        ? input.commissionBaseAmount
        : null;
  const amount = Number(rawAmount ?? 0);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
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
    existing = await input.deps.findExistingEntry(input.deal.id, input.deal.commissionTriggerStage);
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
  const payoutValue = frozenTerms.referrerCommissionValue;
  const calculationBaseAmount =
    frozenTerms.referrerCommissionType === 'percentage'
      ? resolveCalculationBaseAmount(input.deal, frozenTerms.referrerCommissionBasis)
      : 0;
  if (frozenTerms.referrerCommissionType === 'percentage' && calculationBaseAmount <= 0) {
    const basisLabel =
      frozenTerms.referrerCommissionBasis === 'base_price' ? 'base price' : 'sale price';
    throw new Error(
      `A recorded ${basisLabel} is required before this percentage referral payout can be created.`,
    );
  }
  const commissionPercent =
    frozenTerms.referrerCommissionType === 'percentage' ? payoutValue : null;
  const commissionAmount =
    frozenTerms.referrerCommissionType === 'flat'
      ? Math.round(payoutValue)
      : Math.round((calculationBaseAmount * payoutValue) / 100);

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
        referrerCommissionType: frozenTerms.referrerCommissionType,
        referrerCommissionValue: payoutValue,
        referrerCommissionBasis: frozenTerms.referrerCommissionBasis,
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
