import { buildDevelopmentsSearchUrl } from '@/lib/heroJourneySearch';
import { buildTransactionalGeographyHref } from '@/lib/geographySearchHandoff';
import type { CanonicalPlaceSelection } from '@/components/location/CanonicalPlaceSelector';
import { isCanonicalPlaceId, type PlaceSearchScope } from '@shared/placeAuthority';
import type { LocationNode } from '@/types/location';
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

type CanonicalBrowsePlace = Pick<CanonicalPlaceSelection, 'canonicalPlaceId' | 'scope'>;

function placeFromLocation(location: LocationNode): CanonicalBrowsePlace | null {
  const canonicalPlaceId = location.canonicalPlaceId;
  if (!isCanonicalPlaceId(canonicalPlaceId)) return null;
  const scope: PlaceSearchScope =
    location.type === 'province' ? 'province' : location.type === 'city' ? 'metro_city' : 'locality';
  return { canonicalPlaceId, scope };
}

function buildPlaceBrowseHref(
  listingType: Exclude<DiscoverListingType, 'developments'>,
  place: CanonicalBrowsePlace | null | undefined,
  propertyType?: string,
) {
  const pathname = listingType === 'rent' ? '/property-to-rent' : '/property-for-sale';
  if (place && !isCanonicalPlaceId(place.canonicalPlaceId)) {
    return `${pathname}?searchError=invalid-place-authority`;
  }
  const journey = listingType === 'rent' ? 'rent' : 'buy';
  const scope = place
    ? { kind: place.scope, canonicalPlaceId: place.canonicalPlaceId }
    : undefined;
  const href = buildTransactionalGeographyHref({
      journey,
      scope,
      filters: propertyType ? { propertyType } : undefined,
      resultState: { sort: 'relevance', page: 0 },
    });
  return href || `${pathname}?searchError=invalid-place-authority`;
}

/** Category browse carries only a reviewed Place selection or country-wide intent. */
export function buildDiscoverBrowseHref(
  listingType: DiscoverListingType,
  place?: CanonicalPlaceSelection | null,
) {
  if (listingType === 'developments') {
    return buildDevelopmentsSearchUrl({ canonicalPlaceId: place?.canonicalPlaceId });
  }
  return buildPlaceBrowseHref(listingType, place);
}

/** Card labels classify inventory; only the selected Place supplies geography. */
export function buildDiscoverCardHref(
  propertyLabel: string,
  listingType: DiscoverListingType,
  place?: CanonicalPlaceSelection | null,
) {
  if (listingType === 'developments') {
    return buildDevelopmentsSearchUrl({ canonicalPlaceId: place?.canonicalPlaceId });
  }

  const propertyType =
    DISCOVER_PROPERTY_TYPE_BY_LABEL[propertyLabel as keyof typeof DISCOVER_PROPERTY_TYPE_BY_LABEL];
  return buildPlaceBrowseHref(listingType, place, propertyType);
}

/** Homepage category handoff uses one selected canonical authority. */
export function buildSelectedDiscoverHref(
  listingType: DiscoverListingType,
  selection: HomeAreaSelection,
  filters: HomeSearchFilters,
  propertyLabel?: string,
  canonicalPlaceId?: string,
): string | null {
  if (listingType === 'developments') {
    if (selection.locations.length || !canonicalPlaceId) return null;
    return buildDevelopmentsSearchUrl({
      canonicalPlaceId,
      developmentType: filters.developmentType,
      developmentStatus: filters.developmentStatus,
      minPrice: filters.priceMin,
      maxPrice: filters.priceMax,
    });
  }

  if (selection.locations.length !== 1) return null;
  const propertyType = propertyLabel
    ? DISCOVER_PROPERTY_TYPE_BY_LABEL[propertyLabel as keyof typeof DISCOVER_PROPERTY_TYPE_BY_LABEL]
    : filters.propertyType;
  const place = placeFromLocation(selection.locations[0]);
  return place ? buildPlaceBrowseHref(listingType, place, propertyType) : null;
}
