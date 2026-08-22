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

export type ConsumerIntent = 'buy' | 'rent';
export type ConsumerJourneyKey = 'residential' | 'land' | 'farm' | 'commercial' | 'shared_living';
export type ConsumerJourneyStatus = 'E2E_READY' | 'PUBLIC_SEARCH_READY' | 'TRANSITIONAL' | 'PLANNED' | 'N/A';

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
    intent: 'buy', key: 'land', label: 'Plots & Land', group: 'Land & Rural', status: 'PUBLIC_SEARCH_READY', enabled: true,
    destination: '/plots-and-land', supportedFields: LAND_FIELDS,
    clearedFields: ['propertyType', 'minBedrooms', 'minBathrooms', 'commercialUseType', 'roomType'],
  },
  {
    intent: 'buy', key: 'farm', label: 'Farms & Smallholdings', group: 'Land & Rural', status: 'TRANSITIONAL', enabled: true,
    destination: '/property-for-sale', supportedFields: ['location', 'propertyType', 'minPrice', 'maxPrice'],
    clearedFields: ['minBedrooms', 'minBathrooms', 'classification', 'minSize', 'maxSize'],
  },
  {
    intent: 'buy', key: 'commercial', label: 'Commercial Property', group: 'Commercial', status: 'PLANNED', enabled: false,
    destination: '/commercial', supportedFields: ['location'], clearedFields: RESIDENTIAL_FIELDS,
  },
  {
    intent: 'rent', key: 'residential', label: 'Homes', group: 'Homes', status: 'E2E_READY', enabled: true,
    destination: '/property-to-rent', supportedFields: ['location', 'propertyType', 'minPrice', 'maxPrice'],
    clearedFields: ['classification', 'minSize', 'maxSize', 'minBedrooms', 'minBathrooms', 'commercialUseType', 'roomType'],
  },
  {
    intent: 'rent', key: 'farm', label: 'Farms & Smallholdings', group: 'Specialist Rental', status: 'TRANSITIONAL', enabled: true,
    destination: '/property-to-rent', supportedFields: ['location', 'propertyType', 'minPrice', 'maxPrice'],
    clearedFields: ['minBedrooms', 'minBathrooms', 'classification', 'minSize', 'maxSize'],
  },
  {
    intent: 'rent', key: 'commercial', label: 'Commercial Property', group: 'Commercial', status: 'PUBLIC_SEARCH_READY', enabled: true,
    destination: '/commercial', supportedFields: ['location'],
    clearedFields: ['propertyType', 'minBedrooms', 'minBathrooms', 'minPrice', 'maxPrice'],
  },
  {
    intent: 'rent', key: 'shared_living', label: 'Shared Living', group: 'Specialist Rental', status: 'PLANNED', enabled: false,
    destination: '/', supportedFields: ['location'], clearedFields: RESIDENTIAL_FIELDS,
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
};

function specialistLocationQuery(selectedLocations: readonly LocationNode[]) {
  const location = selectedLocations[0];
  // Land's current public API accepts city/province strings only. Do not turn
  // a selected suburb into a city-wide query: that would silently widen the
  // consumer's canonical scope. A future Land canonical-geography contract
  // can make suburb handoff executable without changing this router.
  if (!location || location.type === 'area' || location.type === 'suburb') return undefined;
  const params = new URLSearchParams();
  const canonical = location.canonicalLocationId || location.id;
  if (canonical) params.set('locationId', canonical);
  if (location.provinceSlug) params.set('province', location.provinceSlug);
  if (location.citySlug) params.set('city', location.citySlug);
  return params;
}

export function buildConsumerJourneyUrl(input: ConsumerJourneySearchInput): string {
  const definition = resolveConsumerJourney(input.intent, input.journey);
  if (!definition) return '/';

  if (input.journey === 'residential' || input.journey === 'farm') {
    const propertyType = input.journey === 'farm' ? 'farm' : input.propertyType;
    const args = { ...input, propertyType };
    return input.intent === 'buy' ? buildBuySearchUrl(args) : buildPropertySearchUrl({ ...args, transactionType: 'to-rent' });
  }

  const params = specialistLocationQuery(input.selectedLocations || []);
  if (!params) return `${definition.destination}?searchError=canonical-location-required`;
  if (input.journey === 'land') {
    if (input.landClassification) params.set('classification', input.landClassification);
    if (input.minPrice !== undefined && input.minPrice !== '') params.set('minPrice', String(input.minPrice));
    if (input.maxPrice !== undefined && input.maxPrice !== '') params.set('maxPrice', String(input.maxPrice));
    if (input.minSize !== undefined && input.minSize !== '') params.set('minSize', String(input.minSize));
    if (input.maxSize !== undefined && input.maxSize !== '') params.set('maxSize', String(input.maxSize));
  }
  const selectedLocation = input.selectedLocations?.[0];
  if (input.journey === 'commercial' && selectedLocation?.name) params.set('location', selectedLocation.name);
  return `${definition.destination}?${params.toString()}`;
}
