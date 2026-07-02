type WizardSubmitState = {
  action?: string;
  propertyType?: string;
  title?: string;
  description?: string;
  pricing?: Record<string, any>;
  basicInfo?: Record<string, any>;
  propertyDetails?: Record<string, any>;
  additionalInfo?: Record<string, any>;
  location?: Record<string, any>;
  media?: Array<Record<string, any>>;
  mainMediaId?: string | number | null;
};

export type ListingWizardSubmitPayload = {
  action: string;
  propertyType: string;
  title: string;
  description: string;
  pricing: Record<string, any>;
  propertyDetails: Record<string, any>;
  location: Record<string, any>;
  mediaIds: string[];
  mainMediaId?: string;
};

const hasContractValue = (value: unknown) =>
  value !== undefined &&
  value !== null &&
  (typeof value !== 'number' || Number.isFinite(value)) &&
  !(typeof value === 'string' && value.trim() === '');

const fillMissing = (target: Record<string, any>, key: string, value: unknown) => {
  if (hasContractValue(target[key]) || !hasContractValue(value)) return;
  target[key] = value;
};

const normalizePricingForSubmit = (pricing: Record<string, any> = {}) => ({
  ...pricing,
  ...('transferCostEstimate' in pricing
    ? pricing.transferCostEstimate !== null &&
      pricing.transferCostEstimate !== undefined &&
      !isNaN(Number(pricing.transferCostEstimate))
      ? { transferCostEstimate: Number(pricing.transferCostEstimate) }
      : {}
    : {}),
});

const normalizePropertyDetailsForBackendContract = (
  propertyDetails: Record<string, any>,
  pricing: Record<string, any>,
) => {
  const normalized = { ...propertyDetails };

  fillMissing(normalized, 'levies', pricing.levies ?? normalized.leviesHoaOperatingCosts);
  fillMissing(normalized, 'leviesHoaOperatingCosts', normalized.levies ?? pricing.levies);

  const ratesValue = pricing.ratesAndTaxes ?? normalized.ratesAndTaxes ?? normalized.ratesTaxes;
  fillMissing(normalized, 'ratesAndTaxes', ratesValue);
  fillMissing(normalized, 'ratesTaxes', ratesValue);

  const parkingValue = normalized.parkingCount ?? normalized.parkingBays;
  fillMissing(normalized, 'parkingCount', parkingValue);
  fillMissing(normalized, 'parkingBays', parkingValue);

  const securityValue = normalized.security ?? normalized.securityLevel;
  fillMissing(normalized, 'security', securityValue);
  fillMissing(normalized, 'securityLevel', securityValue);

  const flooringValue = normalized.flooring ?? normalized.flooringType;
  fillMissing(normalized, 'flooring', flooringValue);
  fillMissing(normalized, 'flooringType', flooringValue);

  if (
    !hasContractValue(normalized.prepaidElectricity) &&
    String(normalized.electricitySupply || '').toLowerCase() === 'prepaid'
  ) {
    normalized.prepaidElectricity = true;
  }

  if (
    !hasContractValue(normalized.fibreReady) &&
    String(normalized.internetAccess || '').toLowerCase() === 'fibre'
  ) {
    normalized.fibreReady = true;
  }

  return normalized;
};

const buildSemanticPropertyDetails = (state: WizardSubmitState) => {
  const basicInfo = state.basicInfo || {};
  const physicalSpecs = state.propertyDetails || {};
  const enrichment = state.additionalInfo || {};

  /*
   * Keep the backend-compatible payload flat for now, but make the source groups explicit:
   * - basicInfo: core facts, stock/development context, status, internal context
   * - propertyDetails: physical specs captured in Step 3
   * - additionalInfo: buyer checks, utilities, finishes, and semantic Step 4 buckets
   */
  return {
    ...basicInfo,
    ...physicalSpecs,
    ...enrichment,
    ...(Array.isArray(enrichment.lifestyleHighlights)
      ? { propertyHighlights: enrichment.lifestyleHighlights }
      : {}),
  };
};

export const buildListingWizardSubmitPayload = (
  state: WizardSubmitState,
): ListingWizardSubmitPayload => {
  const pricing = normalizePricingForSubmit(state.pricing);
  const semanticPropertyDetails = buildSemanticPropertyDetails(state);
  const propertyDetails = normalizePropertyDetailsForBackendContract(
    semanticPropertyDetails,
    pricing,
  );
  const media = state.media || [];
  const firstMediaId = media.length > 0 ? media[0]?.id?.toString() : undefined;
  const mainMediaId = state.mainMediaId?.toString() || firstMediaId;

  return {
    action: state.action!,
    propertyType: state.propertyType!,
    title: state.title || '',
    description: state.description || '',
    pricing,
    propertyDetails,
    location: state.location!,
    mediaIds: media.map((m: any) => m.id?.toString() || ''),
    mainMediaId,
  };
};
