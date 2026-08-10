import type { inferRouterInputs } from '@trpc/server';
import type { AppRouter } from '../../../server/routers';
import type { ListingWizardState } from '../../../shared/listing-types';
import { buildCanonicalCorePropertyDetails } from '../../../shared/core-property-information';
import { listingActionToIntent } from '../../../shared/listing-types';
import {
  buildFeaturesContextFromWizardState,
  LEGACY_STEP4_PROPERTY_DETAIL_KEYS,
} from '../../../shared/features-context';
import { buildPricingContract } from '../../../shared/pricing-contract';
import { buildListingLocationAuthoringPayload } from '../../../shared/location-contract';

export type ListingWizardSubmitPayload = inferRouterInputs<AppRouter>['listing']['create'];

export type ListingWizardSubmitState = Pick<
  ListingWizardState,
  | 'action'
  | 'propertyType'
  | 'title'
  | 'description'
  | 'basicInfo'
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
  action: ListingWizardSubmitState['action'],
  pricing: ListingWizardSubmitPayload['pricing'],
) => {
  const normalized = { ...propertyDetails };

  const pricingContract = buildPricingContract(
    action,
    pricing as Record<string, unknown>,
    normalized,
    { preferEmbedded: false },
  );
  if (pricingContract) normalized.pricingContract = pricingContract;

  // New authoring has one governed pricing authority. These legacy aliases
  // remain readable by compatibility code but are not written alongside it.
  for (const key of ['levies', 'leviesHoaOperatingCosts', 'ratesAndTaxes', 'ratesTaxes']) {
    delete normalized[key];
  }

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
  // Step 3 has one typed authority. Do not serialize the historical
  // `basicInfo` object or arbitrary Step 3 state; only the approved core facts
  // and the separately-owned Additional Information contract cross the API
  // boundary. Legacy flat aliases are generated from the typed core object.
  const historicalDetails = {
    ...((state.propertyDetails || {}) as Record<string, unknown>),
  };
  for (const key of [
    'propertyCategory',
    'developerName',
    'developmentName',
    'selectedDeveloperId',
    'selectedDevelopmentId',
    'landSizeUnit',
    'landSizeHa',
    'landSizeM2OrHa',
    'badges',
    ...LEGACY_STEP4_PROPERTY_DETAIL_KEYS,
  ]) {
    delete historicalDetails[key];
  }

  const propertyDetails = {
    ...historicalDetails,
    featuresContext: buildFeaturesContextFromWizardState(
      state.additionalInfo,
      state.propertyDetails,
      listingActionToIntent(state.action),
      state.propertyType,
    ),
    ...buildCanonicalCorePropertyDetails(state.propertyType, state.propertyDetails, state.basicInfo),
  };

  return normalizePropertyDetailsForPublicContract(propertyDetails, state.action, pricing);
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
    location: buildListingLocationAuthoringPayload(state.location)!,
    mediaIds,
    mainMediaId,
    media,
  };
};
