import { buildPropertySearchUrl, buildDevelopmentsSearchUrl } from '@/lib/heroJourneySearch';
import { CITY_PROVINCE_MAP, normalizeLocationKey } from '@/lib/locationUtils';
import type { HomeAreaSelection, HomeSearchFilters } from '@/contexts/HomeSearchContext';

export type DiscoverListingType = 'sale' | 'rent' | 'developments';

export const DISCOVER_PROPERTY_TYPE_BY_LABEL = {
  Houses: 'house',
  Apartments: 'apartment',
  Townhouses: 'townhouse',
  Villas: 'villa',
  'Cluster Homes': 'cluster_home',
  Farms: 'farm',
} as const;

function appendLocationContext(params: URLSearchParams, selectedCity: string) {
  const citySlug = normalizeLocationKey(selectedCity);

  if (!citySlug) {
    return;
  }

  params.set('city', citySlug);

  const provinceSlug = CITY_PROVINCE_MAP[citySlug];
  if (provinceSlug) {
    params.set('province', provinceSlug);
  }
}

function withQuery(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function buildDiscoverBrowseHref(
  listingType: DiscoverListingType,
  selectedCity: string,
  canonicalPlaceId?: string,
) {
  const params = new URLSearchParams();

  if (listingType === 'developments') {
    return buildDevelopmentsSearchUrl({ canonicalPlaceId });
  }

  appendLocationContext(params, selectedCity);

  return withQuery(listingType === 'rent' ? '/property-to-rent' : '/property-for-sale', params);
}

export function buildDiscoverCardHref(
  propertyLabel: string,
  listingType: DiscoverListingType,
  selectedCity: string,
  canonicalPlaceId?: string,
) {
  if (listingType === 'developments') {
    // Card labels are presentation only. The canonical Place selection is
    // the entire geography filter for Development search.
    return buildDevelopmentsSearchUrl({ canonicalPlaceId });
  }

  const params = new URLSearchParams();
  appendLocationContext(params, selectedCity);

  const propertyType =
    DISCOVER_PROPERTY_TYPE_BY_LABEL[propertyLabel as keyof typeof DISCOVER_PROPERTY_TYPE_BY_LABEL];

  if (propertyType) {
    params.set('propertyType', propertyType);
  }

  return withQuery(listingType === 'rent' ? '/property-to-rent' : '/property-for-sale', params);
}

/** Homepage category handoff uses the selected authority, never a display city name. */
export function buildSelectedDiscoverHref(
  listingType: DiscoverListingType,
  selection: HomeAreaSelection,
  filters: HomeSearchFilters,
  propertyLabel?: string,
  canonicalPlaceId?: string,
): string | null {
  if (listingType === 'developments') {
    if (selection.locations.length || selection.searchArea || !canonicalPlaceId) return null;
    return buildDevelopmentsSearchUrl({
      canonicalPlaceId,
      developmentType: filters.developmentType,
      developmentStatus: filters.developmentStatus,
      minPrice: filters.priceMin,
      maxPrice: filters.priceMax,
    });
  }
  if (!selection.locations.length && !selection.searchArea) return null;
  const propertyType = propertyLabel
    ? DISCOVER_PROPERTY_TYPE_BY_LABEL[propertyLabel as keyof typeof DISCOVER_PROPERTY_TYPE_BY_LABEL]
    : filters.propertyType;
  return buildPropertySearchUrl({
    transactionType: listingType === 'rent' ? 'to-rent' : 'for-sale',
    selectedLocations: selection.searchArea ? [] : selection.locations,
    searchScope: selection.searchArea
      ? { kind: 'search_area', searchAreaId: selection.searchArea.searchAreaId }
      : undefined,
    searchAreaAvailability: selection.searchArea?.availability,
    propertyType,
    minPrice: listingType === 'sale' ? filters.priceMin : undefined,
    maxPrice: listingType === 'rent' ? filters.budgetMax : filters.priceMax,
    minBedrooms: listingType === 'sale' ? filters.minBedrooms : undefined,
    minBathrooms: listingType === 'sale' ? filters.minBathrooms : undefined,
  });
}
