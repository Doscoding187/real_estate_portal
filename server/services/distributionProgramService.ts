type ProgramActivationInput = {
  commissionModel: 'flat_percentage' | 'tiered_percentage' | 'fixed_amount' | 'hybrid' | null;
  defaultCommissionPercent: number | null;
  defaultCommissionAmount: number | null;
  tierAccessPolicy: 'open' | 'restricted' | 'invite_only' | null;
  payoutMilestone:
    | 'attorney_instruction'
    | 'attorney_signing'
    | 'bond_approval'
    | 'transfer_registration'
    | 'occupation'
    | 'custom'
    | null;
  currencyCode: string | null;
  hasPrimaryManager: boolean;
};

type ProgramEnsureInput = {
  developmentId: number;
  actorUserId: number;
};

type ProgramEnsureDeps = {
  findExistingProgramByDevelopmentId: (developmentId: number) => Promise<{ id: number } | null>;
  createProgram: (payload: {
    developmentId: number;
    isReferralEnabled: number;
    isActive: number;
    commissionModel: 'flat_percentage' | 'tiered_percentage' | 'fixed_amount' | 'hybrid';
    defaultCommissionPercent: number | null;
    defaultCommissionAmount: number | null;
    tierAccessPolicy: 'open' | 'restricted' | 'invite_only';
    payoutMilestone:
      | 'attorney_instruction'
      | 'attorney_signing'
      | 'bond_approval'
      | 'transfer_registration'
      | 'occupation'
      | 'custom';
    payoutMilestoneNotes: string | null;
    currencyCode: string;
    createdBy: number;
    updatedBy: number;
  }) => Promise<{ id: number }>;
};

export function getProgramActivationReadiness(input: ProgramActivationInput) {
  const missingRequirements: string[] = [];

  if (!input.commissionModel) {
    missingRequirements.push('commissionModel');
  }

  if (
    input.commissionModel === 'flat_percentage' ||
    input.commissionModel === 'tiered_percentage'
  ) {
    if (typeof input.defaultCommissionPercent !== 'number' || input.defaultCommissionPercent <= 0) {
      missingRequirements.push('defaultCommissionPercent');
    }
  }

  if (input.commissionModel === 'fixed_amount') {
    if (typeof input.defaultCommissionAmount !== 'number' || input.defaultCommissionAmount <= 0) {
      missingRequirements.push('defaultCommissionAmount');
    }
  }

  if (input.commissionModel === 'hybrid') {
    const hasPercent =
      typeof input.defaultCommissionPercent === 'number' && input.defaultCommissionPercent > 0;
    const hasAmount =
      typeof input.defaultCommissionAmount === 'number' && input.defaultCommissionAmount > 0;
    if (!hasPercent && !hasAmount) {
      missingRequirements.push('defaultCommissionPercent_or_defaultCommissionAmount');
    }
  }

  if (!input.tierAccessPolicy) {
    missingRequirements.push('tierAccessPolicy');
  }

  if (!input.payoutMilestone) {
    missingRequirements.push('payoutMilestone');
  }

  const normalizedCurrency = (input.currencyCode || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
    missingRequirements.push('currencyCode');
  }

  if (!input.hasPrimaryManager) {
    missingRequirements.push('primaryManagerAssignment');
  }

  return {
    canEnable: missingRequirements.length === 0,
    missingRequirements,
  };
}

export async function ensureDistributionProgramForDevelopment(
  input: ProgramEnsureInput,
  deps: ProgramEnsureDeps,
) {
  const existing = await deps.findExistingProgramByDevelopmentId(input.developmentId);
  if (existing) {
    return { created: false as const, programId: existing.id };
  }

  const created = await deps.createProgram({
    developmentId: input.developmentId,
    isReferralEnabled: 0,
    isActive: 1,
    commissionModel: 'flat_percentage',
    defaultCommissionPercent: null,
    defaultCommissionAmount: null,
    tierAccessPolicy: 'restricted',
    payoutMilestone: 'attorney_signing',
    payoutMilestoneNotes: null,
    currencyCode: 'ZAR',
    createdBy: input.actorUserId,
    updatedBy: input.actorUserId,
  });

  return { created: true as const, programId: created.id };
}
