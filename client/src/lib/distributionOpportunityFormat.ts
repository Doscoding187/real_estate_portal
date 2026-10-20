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
  if (
    !mode ||
    mode.availableCount <= 0 ||
    mode.priceFrom <= 0 ||
    mode.priceTo < mode.priceFrom
  ) {
    return 'Unavailable';
  }
  const range =
    mode.priceFrom === mode.priceTo
      ? formatOpportunityCurrency(mode.priceFrom, currencyCode)
      : `${formatOpportunityCurrency(mode.priceFrom, currencyCode)} – ${formatOpportunityCurrency(mode.priceTo, currencyCode)}`;
  return rental ? `${range} / month` : range;
}

export function hasPublishedMode(mode: OpportunityModeProjection | undefined): mode is OpportunityModeProjection {
  return Boolean(
    mode &&
      mode.availableCount > 0 &&
      mode.priceFrom > 0 &&
      mode.priceTo >= mode.priceFrom,
  );
}

export function formatDevelopmentTypeLabel(value: unknown) {
  const text = String(value || '').trim().replace(/_/g, ' ');
  if (!text) return null;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
