import type { LocationNode } from '@/types/location';
import {
  buildBuySearchUrl,
  buildPropertySearchUrl,
  type PropertySearchInput,
} from './heroJourneySearch';
import {
  getPublicHeroJourney,
  type PublicJourneyReleaseContext,
} from './publicNavigation';
import {
  LAND_CLASSIFICATION_LABELS,
  LAND_PUBLIC_CLASSIFICATIONS,
  isLandPublicClassification,
  type LandPublicClassification,
} from '@shared/land-domain';
import { isCanonicalPlaceId } from '@shared/placeAuthority';
import {
  COMMERCIAL_SEARCH_QUERY_KEYS,
  sanitizeCommercialSearchFilters,
  serializeCommercialSearchParams,
  type CommercialSearchFilters,
} from '@shared/commercialSearchContract';

export type ConsumerIntent = 'buy' | 'rent';
export type ConsumerJourneyKey = 'residential' | 'land' | 'farm' | 'commercial' | 'shared_living';
export type ConsumerJourneyStatus = 'E2E_READY' | 'PUBLIC_SEARCH_READY' | 'TRANSITIONAL' | 'PLANNED' | 'N/A';
export const LAND_PUBLIC_CLASSIFICATION_OPTIONS = LAND_PUBLIC_CLASSIFICATIONS.map(value => ({
  value,
  label: LAND_CLASSIFICATION_LABELS[value],
})) as readonly { value: LandPublicClassification; label: string }[];

export interface ConsumerJourneyDefinition {
  intent: ConsumerIntent;
  key: ConsumerJourneyKey;
  label: string;
  group: 'Homes' | 'Land & Rural' | 'Commercial' | 'Specialist Rental';
  status: ConsumerJourneyStatus;
  enabled: boolean;
  destination: string;
  /** Filters that remain meaningful when this journey is selected. */
  supportedFields: readonly string[];
  /** Filters intentionally removed on handoff from another journey. */
  clearedFields: readonly string[];
}

const RESIDENTIAL_FIELDS = ['location', 'propertyType', 'minPrice', 'maxPrice', 'minBedrooms', 'minBathrooms'] as const;
const LAND_FIELDS = ['location', 'classification', 'minPrice', 'maxPrice', 'minSize', 'maxSize'] as const;
const FARM_FIELDS = ['location', 'listingType', 'minPrice', 'maxPrice', 'minLandSize', 'maxLandSize'] as const;
const COMMERCIAL_FIELDS = ['location', ...COMMERCIAL_SEARCH_QUERY_KEYS] as const;

/**
 * The consumer catalogue is the policy boundary between Buy/Rent intent and
 * specialist destinations. It deliberately does not mirror the source
 * listing property-type vocabulary.
 */
export const CONSUMER_JOURNEYS: readonly ConsumerJourneyDefinition[] = [
  {
    intent: 'buy', key: 'residential', label: 'Homes', group: 'Homes', status: 'E2E_READY', enabled: true,
    destination: '/property-for-sale', supportedFields: RESIDENTIAL_FIELDS,
    clearedFields: ['classification', 'minSize', 'maxSize', 'commercialUseType', 'roomType'],
  },
  {
    intent: 'buy', key: 'land', label: 'Plots & Land', group: 'Land & Rural', status: 'E2E_READY', enabled: true,
    destination: '/plots-and-land', supportedFields: LAND_FIELDS,
    clearedFields: ['propertyType', 'minBedrooms', 'minBathrooms', 'commercialUseType', 'roomType'],
  },
  {
    intent: 'buy', key: 'farm', label: 'Farms & Smallholdings', group: 'Land & Rural', status: 'E2E_READY', enabled: true,
    destination: '/farms-and-smallholdings', supportedFields: FARM_FIELDS,
    clearedFields: ['propertyType', 'minBedrooms', 'minBathrooms', 'classification'],
  },
  {
    intent: 'buy', key: 'commercial', label: 'Commercial Property', group: 'Commercial', status: 'PLANNED', enabled: false,
    destination: '/commercial', supportedFields: COMMERCIAL_FIELDS, clearedFields: RESIDENTIAL_FIELDS,
  },
  {
    intent: 'rent', key: 'residential', label: 'Homes', group: 'Homes', status: 'E2E_READY', enabled: true,
    destination: '/property-to-rent', supportedFields: ['location', 'propertyType', 'minPrice', 'maxPrice'],
    clearedFields: ['classification', 'minSize', 'maxSize', 'minBedrooms', 'minBathrooms', 'commercialUseType', 'roomType'],
  },
  {
    intent: 'rent', key: 'farm', label: 'Farms & Smallholdings', group: 'Specialist Rental', status: 'E2E_READY', enabled: true,
    destination: '/farms-and-smallholdings', supportedFields: FARM_FIELDS,
    clearedFields: ['propertyType', 'minBedrooms', 'minBathrooms', 'classification'],
  },
  {
    intent: 'rent', key: 'commercial', label: 'Commercial Property', group: 'Commercial', status: 'PUBLIC_SEARCH_READY', enabled: true,
    destination: '/commercial', supportedFields: COMMERCIAL_FIELDS,
    clearedFields: ['propertyType', 'minBedrooms', 'minBathrooms', 'minPrice', 'maxPrice'],
  },
  {
    intent: 'rent', key: 'shared_living', label: 'Shared Living', group: 'Specialist Rental', status: 'PUBLIC_SEARCH_READY', enabled: true,
    destination: '/shared-living',
    supportedFields: ['location', 'listingType', 'minPrice', 'maxPrice'],
    clearedFields: RESIDENTIAL_FIELDS,
  },
];

function isReleased(definition: ConsumerJourneyDefinition, releaseContext?: PublicJourneyReleaseContext) {
  if (definition.key === 'land') return getPublicHeroJourney('plot_land', releaseContext).homepageEnabled;
  if (definition.key === 'commercial') return getPublicHeroJourney('commercial', releaseContext).homepageEnabled;
  return true;
}

export function getConsumerJourneys(intent: ConsumerIntent, releaseContext?: PublicJourneyReleaseContext) {
  return CONSUMER_JOURNEYS.filter(definition => definition.intent === intent && definition.enabled && isReleased(definition, releaseContext));
}

export function resolveConsumerJourney(intent: ConsumerIntent, key: ConsumerJourneyKey, releaseContext?: PublicJourneyReleaseContext) {
  const definition = CONSUMER_JOURNEYS.find(item => item.intent === intent && item.key === key);
  return definition && definition.enabled && isReleased(definition, releaseContext) ? definition : undefined;
}

export type ConsumerJourneySearchInput = Omit<PropertySearchInput, 'transactionType'> & {
  intent: ConsumerIntent;
  journey: ConsumerJourneyKey;
  landClassification?: string;
  minSize?: string | number;
  maxSize?: string | number;
  commercialFilters?: Partial<CommercialSearchFilters>;
};

function canonicalPlaceQuery(selectedLocations: readonly LocationNode[], max = 5) {
  if (selectedLocations.length === 0 || selectedLocations.length > max) return undefined;
  const ids = selectedLocations.map(location => location.canonicalLocationId || location.id).filter(Boolean);
  if (
    ids.length !== selectedLocations.length ||
    ids.some(id => !isCanonicalPlaceId(id)) ||
    new Set(ids).size !== ids.length
  ) return undefined;
  if (selectedLocations.some(location => location.type === 'area')) return undefined;
  if (selectedLocations.length > 1) {
    if (new Set(selectedLocations.map(location => location.type)).size !== 1) return undefined;
    const selectedType = selectedLocations[0].type;
    if (selectedType !== 'province') {
      const parents = selectedLocations.map(location => location.parentCanonicalLocationId || '');
      if (parents.some(parent => !parent) || new Set(parents).size !== 1) return undefined;
    }
  }
  const params = new URLSearchParams();
  if (ids.length === 1) params.set('canonicalPlaceId', ids[0]);
  else ids.forEach(id => params.append('canonicalPlaceIds', id));
  return params;
}

function commercialLocationQuery(selectedLocations: readonly LocationNode[]) {
  if (selectedLocations.length !== 1) return undefined;
  return canonicalPlaceQuery(selectedLocations, 1);
}

function farmLocationQuery(selectedLocations: readonly LocationNode[]) {
  return canonicalPlaceQuery(selectedLocations, 1);
}

export function buildConsumerJourneyUrl(input: ConsumerJourneySearchInput): string {
  const definition = resolveConsumerJourney(input.intent, input.journey);
  // Unavailable specialist intent stays on its own destination; it must
  // never silently widen the request into Homes.
  if (!definition) return input.journey === 'land' ? '/plots-and-land' : '/';

  // Consumer routes accept selected Place identities only. A second scope
  // object is rejected so these journeys cannot combine geography authorities.
  if (input.searchScope !== undefined) {
    return `${definition.destination}?searchError=unsupported-location-scope`;
  }

  if (input.journey === 'residential') {
    return input.intent === 'buy' ? buildBuySearchUrl(input) : buildPropertySearchUrl({ ...input, transactionType: 'to-rent' });
  }

  if (input.journey === 'shared_living') {
    const params = canonicalPlaceQuery(input.selectedLocations || []);
    if (!params) return `${definition.destination}?searchError=unsupported-location-scope`;
    return `${definition.destination}?${params.toString()}`;
  }

  if (input.journey === 'farm') {
    const params = farmLocationQuery(input.selectedLocations || []);
    if (!params) return `${definition.destination}?searchError=unsupported-location-scope`;
    params.set('listingType', input.intent === 'rent' ? 'rent' : 'sale');
    if (input.minPrice !== undefined && input.minPrice !== '') params.set('minPrice', String(input.minPrice));
    if (input.maxPrice !== undefined && input.maxPrice !== '') params.set('maxPrice', String(input.maxPrice));
    if (input.minSize !== undefined && input.minSize !== '') params.set('minLandSize', String(input.minSize));
    if (input.maxSize !== undefined && input.maxSize !== '') params.set('maxLandSize', String(input.maxSize));
    return `${definition.destination}?${params.toString()}`;
  }

  const selectedLocations = input.selectedLocations || [];
  const params = input.journey === 'land'
    ? canonicalPlaceQuery(selectedLocations)
    : commercialLocationQuery(selectedLocations);
  if (!params) return `${definition.destination}?searchError=unsupported-location-scope`;
  if (input.journey === 'land') {
    if (isLandPublicClassification(input.landClassification)) params.set('classification', input.landClassification);
    if (input.minPrice !== undefined && input.minPrice !== '') params.set('minPrice', String(input.minPrice));
    if (input.maxPrice !== undefined && input.maxPrice !== '') params.set('maxPrice', String(input.maxPrice));
    if (input.minSize !== undefined && input.minSize !== '') params.set('minSize', String(input.minSize));
    if (input.maxSize !== undefined && input.maxSize !== '') params.set('maxSize', String(input.maxSize));
  }
  if (input.journey === 'commercial') {
    const commercialFilters = sanitizeCommercialSearchFilters(input.commercialFilters || {});
    const commercialParams = serializeCommercialSearchParams(commercialFilters);
    commercialParams.forEach((value, key) => params.set(key, value));
  }
  return `${definition.destination}?${params.toString()}`;
}
