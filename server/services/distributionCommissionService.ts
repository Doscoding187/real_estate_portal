import {
  buildReferrerLedgerInput,
  computeCommissionCalculationHash,
  normalizeCommissionCalculationInput,
} from './distributionCommissionDeterminismService';

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

type DealCommissionType = 'flat' | 'percentage';
type DealCommissionBasis = 'sale_price' | 'base_price';

type EnsureCommissionInput = {
  deal: {
    id: number;
    programId: number;
    developmentId: number;
    agentId: number;
    commissionTriggerStage: CommissionTriggerStage;
    dealAmount?: number | null;
    platformAmount?: number | null;
    commissionBaseAmount?: number | null;
    referrerCommissionType?: DealCommissionType | null;
    referrerCommissionValue?: number | null;
    referrerCommissionBasis?: DealCommissionBasis | null;
    referrerCommissionAmount?: number | null;
    platformCommissionType?: DealCommissionType | null;
    platformCommissionValue?: number | null;
    platformCommissionBasis?: DealCommissionBasis | null;
    platformCommissionAmount?: number | null;
  };
  transitionToStage: DealStage;
  actorUserId: number;
  source: string;
  deps: {
    findExistingEntry: (
      dealId: number,
      triggerStage: CommissionTriggerStage,
    ) => Promise<{ id: number } | null>;
    getProgramDefaults: (programId: number) => Promise<{
      commissionModel?: 'flat_percentage' | 'tiered_percentage' | 'fixed_amount' | 'hybrid' | null;
      defaultCommissionPercent?: number | null;
      defaultCommissionAmount?: number | null;
      referrerCommissionType?: DealCommissionType | null;
      referrerCommissionValue?: number | null;
      referrerCommissionBasis?: DealCommissionBasis | null;
      platformCommissionType?: DealCommissionType | null;
      platformCommissionValue?: number | null;
      platformCommissionBasis?: DealCommissionBasis | null;
    } | null>;
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
    insertLedgerEntry?: (payload: {
      distributionDealId: number;
      recipientId: number;
      role: 'referrer' | 'manager' | 'platform' | 'override';
      percentage: number | null;
      calculatedAmount: number;
      currency: string;
      calculationHash: string;
      calculationInput: Record<string, unknown>;
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

function toSafeNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return numeric;
}

function toCommissionType(value: unknown): DealCommissionType | null {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'flat' || normalized === 'percentage') {
    return normalized;
  }
  return null;
}

function toCommissionBasis(value: unknown): DealCommissionBasis | null {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'sale_price' || normalized === 'base_price') {
    return normalized;
  }
  return null;
}

function inferTypeFromLegacyModel(
  model: 'flat_percentage' | 'tiered_percentage' | 'fixed_amount' | 'hybrid' | null | undefined,
  defaultPercent: number,
): DealCommissionType {
  if (model === 'flat_percentage' || model === 'tiered_percentage') return 'percentage';
  if (model === 'hybrid' && defaultPercent > 0) return 'percentage';
  return 'flat';
}

function resolveReferrerCommission(
  input: EnsureCommissionInput['deal'],
  defaults: NonNullable<Awaited<ReturnType<EnsureCommissionInput['deps']['getProgramDefaults']>>> | null,
) {
  const snapshotType = toCommissionType(input.referrerCommissionType);
  const snapshotValue = Math.max(0, toSafeNumber(input.referrerCommissionValue));
  const snapshotBasis = toCommissionBasis(input.referrerCommissionBasis);
  const snapshotAmount = Math.max(0, Math.round(toSafeNumber(input.referrerCommissionAmount)));
  const baseAmount = Math.max(
    0,
    Math.round(
      toSafeNumber(
        typeof input.commissionBaseAmount === 'number' ? input.commissionBaseAmount : input.dealAmount,
      ),
    ),
  );

  if (snapshotType) {
    if (snapshotType === 'percentage') {
      const commissionPercent = snapshotValue;
      const computedAmount =
        baseAmount > 0 ? Math.round((baseAmount * Math.max(0, commissionPercent)) / 100) : 0;
      return {
        source: 'deal_snapshot' as const,
        model: 'snapshot',
        defaultPercent: commissionPercent,
        defaultAmount: snapshotAmount,
        commissionPercent,
        commissionAmount: snapshotAmount > 0 ? snapshotAmount : computedAmount,
        calculationBaseAmount: baseAmount,
        commissionType: snapshotType,
        commissionBasis: snapshotBasis || 'sale_price',
      };
    }

    return {
      source: 'deal_snapshot' as const,
      model: 'snapshot',
      defaultPercent: 0,
      defaultAmount: snapshotAmount > 0 ? snapshotAmount : Math.round(snapshotValue),
      commissionPercent: null as number | null,
      commissionAmount: snapshotAmount > 0 ? snapshotAmount : Math.round(snapshotValue),
      calculationBaseAmount: baseAmount,
      commissionType: snapshotType,
      commissionBasis: null as DealCommissionBasis | null,
    };
  }

  const configuredType = toCommissionType(defaults?.referrerCommissionType);
  const configuredValue = Math.max(0, toSafeNumber(defaults?.referrerCommissionValue));
  const configuredBasis = toCommissionBasis(defaults?.referrerCommissionBasis);
  if (configuredType && configuredValue > 0) {
    const commissionPercent = configuredType === 'percentage' ? configuredValue : null;
    const commissionAmount =
      configuredType === 'flat'
        ? Math.round(configuredValue)
        : Math.max(
            0,
            Math.round((Math.max(0, baseAmount) * Math.max(0, commissionPercent || 0)) / 100),
          );
    return {
      source: 'program_config' as const,
      model: 'program_config',
      defaultPercent: configuredType === 'percentage' ? configuredValue : 0,
      defaultAmount: configuredType === 'flat' ? Math.round(configuredValue) : 0,
      commissionPercent,
      commissionAmount,
      calculationBaseAmount: baseAmount,
      commissionType: configuredType,
      commissionBasis: configuredType === 'percentage' ? configuredBasis || 'sale_price' : null,
    };
  }

  const model = defaults?.commissionModel ?? 'flat_percentage';
  const defaultPercent = Math.max(0, toSafeNumber(defaults?.defaultCommissionPercent));
  const defaultAmount = Math.max(0, Math.round(toSafeNumber(defaults?.defaultCommissionAmount)));
  const inferredType = inferTypeFromLegacyModel(model, defaultPercent);
  const hasLegacyCommission = inferredType === 'percentage' ? defaultPercent > 0 : defaultAmount > 0;
  if (hasLegacyCommission) {
    const commissionPercent = inferredType === 'percentage' ? defaultPercent : null;
    const commissionAmount =
      inferredType === 'flat'
        ? defaultAmount
        : Math.max(
            0,
            Math.round((Math.max(0, baseAmount) * Math.max(0, commissionPercent || 0)) / 100),
          );
    return {
      source: 'legacy_defaults' as const,
      model,
      defaultPercent,
      defaultAmount,
      commissionPercent,
      commissionAmount,
      calculationBaseAmount: baseAmount,
      commissionType: inferredType,
      commissionBasis: inferredType === 'percentage' ? configuredBasis || 'sale_price' : null,
    };
  }

  throw new Error(
    `Missing commission configuration for program ${input.programId}. Configure referrer commission before progressing deals.`,
  );
}

export async function ensureCommissionEntryForDeal(input: EnsureCommissionInput) {
  const shouldCreate = shouldCreateCommissionEntry(
    input.deal.commissionTriggerStage,
    input.transitionToStage,
  );
  if (!shouldCreate) {
    return { created: false as const, reason: 'stage_not_reached' as const };
  }

  const existing = await input.deps.findExistingEntry(
    input.deal.id,
    input.deal.commissionTriggerStage,
  );
  if (existing) {
    return { created: false as const, reason: 'already_exists' as const, entryId: existing.id };
  }

  const defaults = await input.deps.getProgramDefaults(input.deal.programId);
  const resolved = resolveReferrerCommission(input.deal, defaults);
  const model = resolved.model;
  const defaultPercent = resolved.defaultPercent;
  const defaultAmount = resolved.defaultAmount;
  const calculationBaseAmount = resolved.calculationBaseAmount;
  const commissionPercent = resolved.commissionPercent;
  const commissionAmount = resolved.commissionAmount;

  await input.deps.insertEntry({
    dealId: input.deal.id,
    programId: input.deal.programId,
    developmentId: input.deal.developmentId,
    agentId: input.deal.agentId,
    calculationBaseAmount,
    commissionPercent,
    commissionAmount,
    currency: 'ZAR',
    triggerStage: input.deal.commissionTriggerStage,
    entryStatus: 'pending',
    notes: `Auto-generated by ${input.source} (${resolved.source}).`,
    createdBy: input.actorUserId,
    updatedBy: input.actorUserId,
  });

  if (input.deps.insertLedgerEntry) {
    const calculationInput = normalizeCommissionCalculationInput(
      buildReferrerLedgerInput({
        dealId: input.deal.id,
        programId: input.deal.programId,
        developmentId: input.deal.developmentId,
        agentId: input.deal.agentId,
        calculationBaseAmount,
        commissionPercent,
        commissionAmount,
        currency: 'ZAR',
        triggerStage: input.deal.commissionTriggerStage,
      }),
    );

    await input.deps.insertLedgerEntry({
      distributionDealId: input.deal.id,
      recipientId: input.deal.agentId,
      role: 'referrer',
      percentage: commissionPercent,
      calculatedAmount: commissionAmount,
      currency: 'ZAR',
      calculationHash: computeCommissionCalculationHash(calculationInput),
      calculationInput: calculationInput as Record<string, unknown>,
    });
  }

  await input.deps.setDealCommissionPending(input.deal.id);
  await input.deps.insertCommissionCreatedEvent({
    dealId: input.deal.id,
    toStage: input.transitionToStage,
    actorUserId: input.actorUserId,
    metadata: {
      source: input.source,
      triggerStage: input.deal.commissionTriggerStage,
      commissionSource: resolved.source,
      commissionType: resolved.commissionType,
      commissionBasis: resolved.commissionBasis,
      model,
      defaultPercent,
      defaultAmount,
    },
  });

  return { created: true as const };
}
