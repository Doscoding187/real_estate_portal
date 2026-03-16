import { createHash } from 'node:crypto';

export type CommissionLedgerRole = 'referrer' | 'manager' | 'platform' | 'override';

export type CommissionCalculationInput = {
  distributionDealId: number;
  programId: number;
  developmentId: number;
  recipientId: number;
  role: CommissionLedgerRole;
  calculationBaseAmount: number;
  commissionPercent: number | null;
  calculatedAmount: number;
  currency: string;
  triggerStage: 'contract_signed' | 'bond_approved';
  tierDepth: number;
  referrerChain: number[];
  platformRatePercent: number;
};

function normalizeNumber(value: unknown): number {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return 0;
  return Number(num.toFixed(6));
}

function normalizeString(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeIntegerArray(values: unknown): number[] {
  if (!Array.isArray(values)) return [];
  return values
    .map(v => Math.trunc(Number(v)))
    .filter(v => Number.isFinite(v))
    .sort((a, b) => a - b);
}

export function normalizeCommissionCalculationInput(
  input: CommissionCalculationInput,
): CommissionCalculationInput {
  return {
    distributionDealId: Math.trunc(Number(input.distributionDealId)),
    programId: Math.trunc(Number(input.programId)),
    developmentId: Math.trunc(Number(input.developmentId)),
    recipientId: Math.trunc(Number(input.recipientId)),
    role: input.role,
    calculationBaseAmount: Math.trunc(normalizeNumber(input.calculationBaseAmount)),
    commissionPercent:
      input.commissionPercent === null ? null : normalizeNumber(input.commissionPercent),
    calculatedAmount: Math.trunc(normalizeNumber(input.calculatedAmount)),
    currency: normalizeString(input.currency).toUpperCase(),
    triggerStage: input.triggerStage,
    tierDepth: Math.max(1, Math.trunc(normalizeNumber(input.tierDepth))),
    referrerChain: normalizeIntegerArray(input.referrerChain),
    platformRatePercent: normalizeNumber(input.platformRatePercent),
  };
}

export function computeCommissionCalculationHash(input: CommissionCalculationInput): string {
  const normalized = normalizeCommissionCalculationInput(input);
  const hashPayload = JSON.stringify({
    distributionDealId: normalized.distributionDealId,
    programId: normalized.programId,
    developmentId: normalized.developmentId,
    recipientId: normalized.recipientId,
    role: normalized.role,
    calculationBaseAmount: normalized.calculationBaseAmount,
    commissionPercent: normalized.commissionPercent,
    calculatedAmount: normalized.calculatedAmount,
    currency: normalized.currency,
    triggerStage: normalized.triggerStage,
    tierDepth: normalized.tierDepth,
    referrerChain: normalized.referrerChain,
    platformRatePercent: normalized.platformRatePercent,
  });

  return createHash('sha256').update(hashPayload).digest('hex');
}

export function buildReferrerLedgerInput(input: {
  dealId: number;
  programId: number;
  developmentId: number;
  agentId: number;
  calculationBaseAmount: number;
  commissionPercent: number | null;
  commissionAmount: number;
  currency: string;
  triggerStage: 'contract_signed' | 'bond_approved';
}): CommissionCalculationInput {
  return {
    distributionDealId: input.dealId,
    programId: input.programId,
    developmentId: input.developmentId,
    recipientId: input.agentId,
    role: 'referrer',
    calculationBaseAmount: input.calculationBaseAmount,
    commissionPercent: input.commissionPercent,
    calculatedAmount: input.commissionAmount,
    currency: input.currency,
    triggerStage: input.triggerStage,
    tierDepth: 1,
    referrerChain: [input.agentId],
    platformRatePercent: 0,
  };
}
