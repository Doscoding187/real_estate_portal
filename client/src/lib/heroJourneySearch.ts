import { normalizeLocationKey } from './locationUtils';
import { type SearchFilters } from './urlUtils';
import type { LocationNode } from '@/types/location';
import {
  createSearchIntentValidation,
  generateIntentUrl,
  type SearchIntent,
  type SearchIntentValidationCode,
} from './searchIntent';
import { isBuyPropertyType, sanitizeBuySearchFilters } from '../../../shared/buySearchContract';
import { isRentPropertyType, sanitizeRentSearchFilters } from '../../../shared/rentSearchContract';
import {
  HOMES_BUY_SELECTABLE_PROPERTY_TYPES,
  HOMES_RENT_SELECTABLE_PROPERTY_TYPES,
} from '../../../shared/property-taxonomy';
import {
  buildTransactionalGeographyHref,
  createCanonicalSearchLocation,
  journeyForTransactionType,
  type CanonicalSearchLocation,
  type GeographySearchContext,
} from './geographySearchHandoff';
import {
  createMultiLocationSearchScope,
  type SearchAreaSummary,
  type SearchScope,
} from '../../../shared/searchScope';

const BUY_PROPERTY_TYPE_LABELS: Record<
  (typeof HOMES_BUY_SELECTABLE_PROPERTY_TYPES)[number],
  string
> = {
  apartment: 'Apartment',
  house: 'House',
  townhouse: 'Townhouse',
  cluster_home: 'Cluster home',
};

/** Presentation only; the Homes selection vocabulary owns the offered values. */
export const BUY_PROPERTY_TYPE_OPTIONS = HOMES_BUY_SELECTABLE_PROPERTY_TYPES.map(value => ({
  value,
  label: BUY_PROPERTY_TYPE_LABELS[value],
}));

export const RENT_PROPERTY_TYPE_OPTIONS = HOMES_RENT_SELECTABLE_PROPERTY_TYPES.map(value => ({
  value,
  label: value === 'cluster_home' ? 'Cluster home' : value.charAt(0).toUpperCase() + value.slice(1),
}));

export interface PropertySearchInput {
  searchQuery?: string;
  selectedLocations?: readonly LocationNode[];
  searchScope?: SearchScope;
  searchAreaAvailability?: SearchAreaSummary['availability'];
  localityRefinementId?: string;
  searchScopeContext?: GeographySearchContext;
  propertyType?: string;
  listingSource?: string;
  minPrice?: string | number;
  maxPrice?: string | number;
  minBedrooms?: string | number;
  maxBedrooms?: string | number;
  minBathrooms?: string | number;
  maxBathrooms?: string | number;
  minArea?: string | number;
  maxArea?: string | number;
}

export interface DevelopmentsSearchInput {
  selectedLocations?: readonly LocationNode[];
  developmentType?: string;
  developmentStatus?: string;
  minPrice?: string | number;
  maxPrice?: string | number;
}

export type LocationSelectionOutcome =
  | 'added'
  | 'duplicate'
  | 'invalid'
  | 'limit-reached'
  | 'replaced-incompatible';

export interface LocationSelectionResolution {
  locations: LocationNode[];
  outcome: LocationSelectionOutcome;
}

function haveCompatibleCanonicalParents(
  current: LocationNode,
  candidate: LocationNode,
  scopeKind: CanonicalSearchLocation['scope']['kind'],
): boolean {
  if (scopeKind === 'province') return true;

  if (current.parentCanonicalLocationId && candidate.parentCanonicalLocationId) {
    return current.parentCanonicalLocationId === candidate.parentCanonicalLocationId;
  }

  if (scopeKind === 'metro_city') {
    const currentProvince = normalizeLocationKey(current.provinceSlug || '');
    const candidateProvince = normalizeLocationKey(candidate.provinceSlug || '');
    return !currentProvince || !candidateProvince || currentProvince === candidateProvince;
  }

  const currentCity = normalizeLocationKey(current.citySlug || '');
  const candidateCity = normalizeLocationKey(candidate.citySlug || '');
  const currentProvince = normalizeLocationKey(current.provinceSlug || '');
  const candidateProvince = normalizeLocationKey(candidate.provinceSlug || '');
  const citiesMatch = !currentCity || !candidateCity || currentCity === candidateCity;
  const provincesMatch =
    !currentProvince || !candidateProvince || currentProvince === candidateProvince;
  return citiesMatch && provincesMatch;
}

/**
 * Keeps the homepage composer inside the public multi-location contract.
 * The server remains authoritative, but the client does not knowingly retain
 * a parent/child or cross-parent selection that cannot form one sibling OR scope.
 */
export function resolveCanonicalLocationSelection(
  selectedLocations: readonly LocationNode[],
  candidate: LocationNode,
  maxLocations = 5,
): LocationSelectionResolution {
  const currentLocations = selectedLocations.filter(location => location.type !== 'area');
  const candidateSelection = addStructuredLocation(candidate);

  if (!candidateSelection) {
    return {
      locations: currentLocations.length > 0 ? [...currentLocations] : [candidate],
      outcome: 'invalid',
    };
  }

  const candidateScope = candidateSelection.scope;
  const candidateIdentity =
    candidateScope.kind === 'search_area'
      ? `search_area:${candidateScope.searchAreaId}`
      : candidateScope.canonicalLocationId;
  const existingSelections = currentLocations.map(location => ({
    location,
    selection: addStructuredLocation(location),
  }));

  if (
    existingSelections.some(({ selection }) => {
      if (!selection) return false;
      const scope = selection.scope;
      const identity =
        scope.kind === 'search_area'
          ? `search_area:${scope.searchAreaId}`
          : scope.canonicalLocationId;
      return identity === candidateIdentity;
    })
  ) {
    return { locations: [...currentLocations], outcome: 'duplicate' };
  }

  const canCombine = existingSelections.every(({ location, selection }) => {
    if (!selection || selection.scope.kind !== candidateScope.kind) return false;
    return haveCompatibleCanonicalParents(location, candidate, candidateScope.kind);
  });

  if (!canCombine && currentLocations.length > 0) {
    return { locations: [candidate], outcome: 'replaced-incompatible' };
  }

  if (currentLocations.length >= maxLocations) {
    return { locations: [...currentLocations], outcome: 'limit-reached' };
  }

  return { locations: [...currentLocations, candidate], outcome: 'added' };
}

function parseNonNegativeNumber(value: string | number | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function getPriceRangeError(
  minPrice: string | number | undefined,
  maxPrice: string | number | undefined,
): string | undefined {
  const hasMin = String(minPrice ?? '').trim() !== '';
  const hasMax = String(maxPrice ?? '').trim() !== '';
  const min = parseNonNegativeNumber(minPrice);
  const max = parseNonNegativeNumber(maxPrice);

  if ((hasMin && min === undefined) || (hasMax && max === undefined)) {
    return 'Enter valid non-negative prices.';
  }

  if (min !== undefined && max !== undefined && min > max) {
    return 'Minimum price must be less than or equal to maximum price.';
  }

  return undefined;
}

function addSupportedBuyFilters(input: PropertySearchInput, filters: SearchFilters) {
  const propertyType = String(input.propertyType || '')
    .trim()
    .toLowerCase();
  const normalized = sanitizeBuySearchFilters({
    // The compatible vocabulary (not the active composer set) is accepted
    // here: journey re-entry from a historical URL must keep legacy values
    // such as villa readable, and the sanitizer rejects anything outside the
    // contract.
    propertyType: isBuyPropertyType(propertyType) ? propertyType : undefined,
    listingSource: input.listingSource,
    minPrice: input.minPrice,
    maxPrice: input.maxPrice,
    minBedrooms: input.minBedrooms,
    minBathrooms: input.minBathrooms,
  });

  Object.assign(filters, normalized);
}

/**
 * Keep Rent composer output aligned with the canonical public rental contract.
 */
function addSupportedRentFilters(input: PropertySearchInput, filters: SearchFilters) {
  const propertyType = String(input.propertyType || '')
    .trim()
    .toLowerCase();
  const normalized = sanitizeRentSearchFilters({
    propertyType: isRentPropertyType(propertyType) ? propertyType : undefined,
    listingSource: input.listingSource,
    minPrice: input.minPrice,
    maxPrice: input.maxPrice,
    minBedrooms: input.minBedrooms,
    maxBedrooms: input.maxBedrooms,
    minBathrooms: input.minBathrooms,
    maxBathrooms: input.maxBathrooms,
    minArea: input.minArea,
    maxArea: input.maxArea,
  });

  Object.assign(filters, normalized);
}

function addStructuredLocation(location: LocationNode): CanonicalSearchLocation | undefined {
  const slug = normalizeLocationKey(location.slug || location.name);
  if (!slug) return undefined;

  return createCanonicalSearchLocation({ ...location, slug });
}

function buildInvalidSearchUrl(transactionType: unknown, code: SearchIntentValidationCode): string {
  const journey = journeyForTransactionType(transactionType);
  if (!journey) return '/';

  return (
    buildTransactionalGeographyHref({
      journey,
      validation: createSearchIntentValidation(code),
    }) || '/'
  );
}

export function buildPropertySearchUrl({
  transactionType,
  searchQuery = '',
  selectedLocations = [],
  searchScope,
  searchAreaAvailability,
  localityRefinementId,
  searchScopeContext,
  propertyType,
  listingSource,
  minPrice,
  maxPrice,
  minBedrooms,
  maxBedrooms,
  minBathrooms,
  maxBathrooms,
  minArea,
  maxArea,
}: PropertySearchInput & { transactionType: 'for-sale' | 'to-rent' }): string {
  const journey = journeyForTransactionType(transactionType);
  if (!journey) return '/';

  const locations = selectedLocations.filter(location => Boolean(location.slug || location.name));
  const filters: SearchFilters = {};

  const filterInput = {
    propertyType,
    listingSource,
    minPrice,
    maxPrice,
    minBedrooms,
    maxBedrooms,
    minBathrooms,
    maxBathrooms,
    minArea,
    maxArea,
  };
  if (transactionType === 'for-sale') {
    addSupportedBuyFilters(filterInput, filters);
  } else {
    addSupportedRentFilters(filterInput, filters);
  }

  let canonicalSelection: CanonicalSearchLocation | undefined;
  let multiLocationScope: SearchScope | undefined;
  if (locations.length > 0 && searchScope) {
    return buildInvalidSearchUrl(transactionType, 'multiple-locations-unsupported');
  } else if (locations.length > 1) {
    const canonicalSelections = locations.map(addStructuredLocation);
    const validSelections = canonicalSelections.filter(
      (selection): selection is CanonicalSearchLocation => Boolean(selection),
    );
    if (validSelections.length !== canonicalSelections.length) {
      return buildInvalidSearchUrl(transactionType, 'canonical-location-required');
    }

    multiLocationScope = createMultiLocationSearchScope(
      validSelections.map(selection => selection.scope),
    );
    if (!multiLocationScope) {
      return buildInvalidSearchUrl(transactionType, 'multiple-locations-unsupported');
    }
  } else if (locations.length > 0) {
    canonicalSelection = addStructuredLocation(locations[0]) || undefined;
    if (!canonicalSelection)
      return buildInvalidSearchUrl(transactionType, 'canonical-location-required');
  } else if (transactionType === 'for-sale' && searchQuery.trim()) {
    return buildInvalidSearchUrl(transactionType, 'canonical-location-required');
  } else if (searchQuery.trim() && !searchScope) {
    return buildInvalidSearchUrl(transactionType, 'canonical-location-required');
  }

  return (
    buildTransactionalGeographyHref({
      journey,
      scope: searchScope || multiLocationScope || canonicalSelection?.scope,
      searchAreaAvailability,
      localityRefinementId,
      context: searchScopeContext || canonicalSelection?.context,
      factualLocationId: canonicalSelection?.factualLocationId,
      filters,
      resultState: { sort: 'relevance', page: 0 },
    }) || '/'
  );
}

export function buildBuySearchUrl(input: PropertySearchInput): string {
  return buildPropertySearchUrl({ ...input, transactionType: 'for-sale' });
}

export interface ActiveSearchRefinementFilters {
  propertyType?: string;
  listingSource?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minArea?: number;
  maxArea?: number;
}

/**
 * Reads the refinement filters a consumer has already applied on the current
 * results URL so journey re-entry (navbar search, location change) can carry
 * them forward instead of silently discarding active intent. Values are raw;
 * `buildPropertySearchUrl` sanitizes them through the canonical journey
 * contract. Rent-only keys are simply absent from Buy URLs, so a single
 * extractor serves both transactional journeys.
 */
export function extractActiveSearchRefinementFilters(
  search: string,
): ActiveSearchRefinementFilters {
  const params = new URLSearchParams(search);
  const rawValue = (key: string) => {
    const value = params.get(key)?.trim();
    return value ? value : undefined;
  };
  const numericValue = (key: string) => {
    const value = rawValue(key);
    if (value === undefined) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const refinements: ActiveSearchRefinementFilters = {};
  const propertyType = rawValue('propertyType');
  if (propertyType) refinements.propertyType = propertyType;
  const listingSource = rawValue('listingSource');
  if (listingSource) refinements.listingSource = listingSource;
  for (const key of [
    'minPrice',
    'maxPrice',
    'minBedrooms',
    'maxBedrooms',
    'minBathrooms',
    'maxBathrooms',
    'minArea',
    'maxArea',
  ] as const) {
    const value = numericValue(key);
    if (value !== undefined) refinements[key] = value;
  }
  return refinements;
}

/**
 * Canonical homepage handoff for the gated New Developments journey.
 * The journey is intentionally not visible while its activation flag is off,
 * but when the flag is enabled this path carries the same canonical location
 * and URL-owned refinement state consumed by /new-developments.
 */
export function buildDevelopmentsSearchUrl({
  selectedLocations = [],
  developmentType,
  developmentStatus,
  minPrice,
  maxPrice,
}: DevelopmentsSearchInput): string {
  const locations = selectedLocations.filter(location => Boolean(location.slug || location.name));
  const selections = locations.map(addStructuredLocation);
  const validSelections = selections.filter((selection): selection is CanonicalSearchLocation =>
    Boolean(selection),
  );

  if (validSelections.length !== locations.length || validSelections.length === 0) {
    return '/new-developments?searchError=canonical-location-required';
  }

  const geography: SearchIntent['geography'] = { level: 'country' };
  if (validSelections.length === 1) {
    const [selection] = validSelections;
    if (selection.scope.kind === 'province') {
      geography.level = 'province';
    } else if (selection.scope.kind === 'metro_city') {
      geography.level = 'city';
    } else if (selection.scope.kind === 'locality') {
      geography.level = 'suburb';
    } else {
      return '/new-developments?searchError=canonical-location-required';
    }
    geography.locationId = selection.scope.canonicalLocationId;
    Object.assign(geography, selection.context);
  } else {
    const multiLocationScope = createMultiLocationSearchScope(
      validSelections.map(selection => selection.scope),
    );
    if (!multiLocationScope || multiLocationScope.kind !== 'multi_location') {
      return '/new-developments?searchError=canonical-location-required';
    }
    const canonicalIds = multiLocationScope.members
      .filter(member => member.kind !== 'search_area')
      .map(member => member.canonicalLocationId);
    if (canonicalIds.length !== validSelections.length) {
      return '/new-developments?searchError=canonical-location-required';
    }
    geography.level = 'multi_location';
    geography.locationIds = canonicalIds;
  }

  const filters: Record<string, unknown> = {};
  const normalizedType = String(developmentType || '')
    .trim()
    .toLowerCase();
  if (['residential', 'commercial', 'mixed_use', 'land'].includes(normalizedType)) {
    filters.developmentType = normalizedType;
  }

  const normalizedStatus = String(developmentStatus || '')
    .trim()
    .toLowerCase();
  if (['launching-soon', 'selling', 'sold-out'].includes(normalizedStatus)) {
    filters.developmentStatus = normalizedStatus;
  }

  const normalizedMinPrice = parseNonNegativeNumber(minPrice);
  const normalizedMaxPrice = parseNonNegativeNumber(maxPrice);
  if (
    normalizedMinPrice !== undefined &&
    (normalizedMaxPrice === undefined || normalizedMinPrice <= normalizedMaxPrice)
  ) {
    filters.minPrice = normalizedMinPrice;
  }
  if (
    normalizedMaxPrice !== undefined &&
    (normalizedMinPrice === undefined || normalizedMinPrice <= normalizedMaxPrice)
  ) {
    filters.maxPrice = normalizedMaxPrice;
  }

  return generateIntentUrl({
    transactionType: 'developments',
    geography,
    filters,
    resultState: { sort: 'relevance', page: 0 },
    defaults: { propertyCategory: 'residential', sort: 'relevance' },
    routeMode: 'results',
  });
}
