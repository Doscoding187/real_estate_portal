export type LeadTransactionType = 'sale' | 'rent' | 'auction' | null;

export type LeadQualificationDisplay = {
  modelLabel: string;
  capacityLabel: string;
  capacityValue: string | null;
};

function parseQualificationData(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string') return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function getNumber(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatRand(value: number): string {
  return `R ${Math.round(value).toLocaleString('en-US')}`;
}

function getFallbackModelLabel(transactionType: LeadTransactionType): string {
  if (transactionType === 'rent') return 'Rental qualification';
  if (transactionType === 'auction') return 'Bidder qualification';
  return 'Sale affordability';
}

function getFallbackCapacityLabel(transactionType: LeadTransactionType): string {
  if (transactionType === 'rent') return 'Estimated rental capacity';
  if (transactionType === 'auction') return 'Estimated bidder capacity';
  return 'Estimated affordability';
}

export function getLeadQualificationDisplay(
  affordabilityData: unknown,
  transactionType: LeadTransactionType,
): LeadQualificationDisplay | null {
  const data = parseQualificationData(affordabilityData);
  if (!Object.keys(data).length) return null;

  const model = String(data.qualificationModel || '').trim();
  const modelLabel =
    model === 'rental_fit'
      ? 'Rental fit'
      : model === 'bidder_readiness'
        ? 'Bidder readiness'
        : model === 'sale_affordability'
          ? 'Sale affordability'
          : getFallbackModelLabel(transactionType);

  const explicitCapacityLabel = String(data.qualificationCapacityLabel || '').trim();
  const capacityLabel = explicitCapacityLabel || getFallbackCapacityLabel(transactionType);
  const capacity =
    getNumber(data.qualificationMonthlyCapacity) ??
    getNumber(data.maxAffordable);

  const monthlySuffix = transactionType === 'rent' && capacity !== null ? ' / month' : '';

  return {
    modelLabel,
    capacityLabel,
    capacityValue: capacity !== null ? `${formatRand(capacity)}${monthlySuffix}` : null,
  };
}
