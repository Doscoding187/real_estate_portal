export type OpportunityModeProjection = {
  availableCount: number;
  priceFrom: number;
  priceTo: number;
  priceBasis: 'purchase_price' | 'monthly_rent';
};

export function formatOpportunityCurrency(value: number | null | undefined, currencyCode = 'ZAR') {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 'Price unavailable';
  return `${currencyCode === 'ZAR' ? 'R' : `${currencyCode} `}${Math.round(amount).toLocaleString('en-ZA')}`;
}

export function formatOpportunityModePrice(
  mode: OpportunityModeProjection | undefined,
  currencyCode = 'ZAR',
  rental = false,
) {
  if (!mode || mode.availableCount <= 0 || mode.priceFrom <= 0 || mode.priceTo < mode.priceFrom) {
    return 'Unavailable';
  }
  const range =
    mode.priceFrom === mode.priceTo
      ? formatOpportunityCurrency(mode.priceFrom, currencyCode)
      : `${formatOpportunityCurrency(mode.priceFrom, currencyCode)} – ${formatOpportunityCurrency(mode.priceTo, currencyCode)}`;
  return rental ? `${range} / month` : range;
}

export function formatCompactOpportunityCurrency(
  value: number | null | undefined,
  currencyCode = 'ZAR',
) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 'Price unavailable';
  const symbol = currencyCode === 'ZAR' ? 'R' : currencyCode;
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const digits = millions >= 10 ? 0 : 1;
    const value = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: digits }).format(
      millions,
    );
    return `${symbol} ${value}M`;
  }
  if (amount >= 1_000) {
    const value = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 0 }).format(
      amount / 1_000,
    );
    return `${symbol} ${value}k`;
  }
  return `${symbol} ${Math.round(amount).toLocaleString('en-ZA')}`;
}

export function formatCompactOpportunityModePrice(
  mode: OpportunityModeProjection | undefined,
  currencyCode = 'ZAR',
  rental = false,
) {
  if (!mode || mode.availableCount <= 0 || mode.priceFrom <= 0 || mode.priceTo < mode.priceFrom) {
    return 'Price unavailable';
  }
  const range =
    mode.priceFrom === mode.priceTo
      ? formatCompactOpportunityCurrency(mode.priceFrom, currencyCode)
      : `${formatCompactOpportunityCurrency(mode.priceFrom, currencyCode)} – ${formatCompactOpportunityCurrency(mode.priceTo, currencyCode)}`;
  return rental ? `${range} / month` : range;
}

export type OpportunityUnitRange = { min: number; max: number };

export function summarizeOpportunityUnitNumbers(
  unitTypes: unknown,
  select: (unitType: Record<string, unknown>) => number | null | undefined,
): OpportunityUnitRange | null {
  if (!Array.isArray(unitTypes)) return null;
  const values = unitTypes
    .map(unitType => (unitType && typeof unitType === 'object' ? select(unitType) : null))
    .filter(value => value !== null && value !== undefined)
    .map(value => Number(value))
    .filter(value => Number.isFinite(value) && value >= 0);
  if (!values.length) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
}

export function formatOpportunityCountRange(
  range: OpportunityUnitRange | null,
  singular: string,
  plural = `${singular}s`,
) {
  if (!range) return null;
  if (range.min === range.max) return `${range.min} ${range.min === 1 ? singular : plural}`;
  return `${range.min} – ${range.max} ${plural}`;
}

export function formatOpportunityMeasureRange(range: OpportunityUnitRange | null) {
  if (!range) return null;
  if (range.min === range.max) return `${range.min} m²`;
  return `${range.min} – ${range.max} m²`;
}

export function hasPublishedMode(
  mode: OpportunityModeProjection | undefined,
): mode is OpportunityModeProjection {
  return Boolean(
    mode && mode.availableCount > 0 && mode.priceFrom > 0 && mode.priceTo >= mode.priceFrom,
  );
}

export function formatDevelopmentTypeLabel(value: unknown) {
  const text = String(value || '')
    .trim()
    .replace(/_/g, ' ');
  if (!text) return null;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
