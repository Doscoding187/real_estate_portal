import type { inferRouterInputs } from '@trpc/server';
import type { AppRouter } from '../../../server/routers';
import type { ListingWizardState } from '../../../shared/listing-types';

export type ListingWizardSubmitPayload = inferRouterInputs<AppRouter>['listing']['create'];

export type ListingWizardSubmitState = Pick<
  ListingWizardState,
  | 'action'
  | 'propertyType'
  | 'title'
  | 'description'
  | 'pricing'
  | 'propertyDetails'
  | 'additionalInfo'
  | 'location'
  | 'media'
  | 'mainMediaId'
>;

const hasContractValue = (value: unknown) =>
  value !== undefined &&
  value !== null &&
  (typeof value !== 'number' || Number.isFinite(value)) &&
  !(typeof value === 'string' && value.trim() === '');

const fillMissing = (target: Record<string, unknown>, key: string, value: unknown) => {
  if (hasContractValue(target[key]) || !hasContractValue(value)) return;
  target[key] = value;
};

const normalizePricingForSubmit = (
  pricing: ListingWizardSubmitState['pricing'],
): ListingWizardSubmitPayload['pricing'] => {
  const normalized = { ...(pricing || {}) } as ListingWizardSubmitPayload['pricing'];

  if (!pricing || !('transferCostEstimate' in pricing)) {
    return normalized;
  }

  if (
    pricing.transferCostEstimate !== null &&
    pricing.transferCostEstimate !== undefined &&
    !Number.isNaN(Number(pricing.transferCostEstimate))
  ) {
    normalized.transferCostEstimate = Number(pricing.transferCostEstimate);
  }

  return normalized;
};

const normalizePropertyDetailsForPublicContract = (
  propertyDetails: Record<string, unknown>,
  pricing: ListingWizardSubmitPayload['pricing'],
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

const buildSubmittedPropertyDetails = (
  state: ListingWizardSubmitState,
  pricing: ListingWizardSubmitPayload['pricing'],
) => {
  const propertyDetails = {
    ...((state.propertyDetails || {}) as Record<string, unknown>),
    ...((state.additionalInfo || {}) as Record<string, unknown>),
  };

  return normalizePropertyDetailsForPublicContract(propertyDetails, pricing);
};

const getMediaId = (media: ListingWizardSubmitState['media'][number]) => media.id?.toString() || '';

type ListingMediaManifestItem = NonNullable<ListingWizardSubmitPayload['media']>[number];

const buildTypedMediaManifest = (
  media: ListingWizardSubmitState['media'],
): ListingMediaManifestItem[] =>
  media
    .map(item => {
      const manifestItem: ListingMediaManifestItem = {
        id: getMediaId(item),
        mediaType: item.type,
      };

      if (item.fileName !== undefined) manifestItem.fileName = item.fileName;
      if (item.fileSize !== undefined) manifestItem.fileSize = item.fileSize;
      if (item.thumbnailUrl !== undefined) manifestItem.thumbnailUrl = item.thumbnailUrl;
      if (item.previewUrl !== undefined) manifestItem.previewUrl = item.previewUrl;
      if (item.width !== undefined) manifestItem.width = item.width;
      if (item.height !== undefined) manifestItem.height = item.height;
      if (item.duration !== undefined) manifestItem.duration = item.duration;
      if (item.orientation !== undefined) manifestItem.orientation = item.orientation;
      if (item.processingStatus !== undefined) manifestItem.processingStatus = item.processingStatus;

      return manifestItem;
    })
    .filter(item => Boolean(item.id));

export const buildListingWizardSubmitPayload = (
  state: ListingWizardSubmitState,
): ListingWizardSubmitPayload => {
  const pricing = normalizePricingForSubmit(state.pricing);
  const mediaIds = state.media.map(getMediaId);
  const media = buildTypedMediaManifest(state.media);
  const mainMediaId =
    state.mainMediaId?.toString() || (state.media.length > 0 ? getMediaId(state.media[0]) : undefined);

  return {
    action: state.action!,
    propertyType: state.propertyType!,
    title: state.title,
    description: state.description,
    pricing,
    propertyDetails: buildSubmittedPropertyDetails(state, pricing),
    location: state.location!,
    mediaIds,
    mainMediaId,
    media,
  };
};
