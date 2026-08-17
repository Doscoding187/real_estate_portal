import { CITY_PROVINCE_MAP, normalizeLocationKey } from '@/lib/locationUtils';

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

export function buildDiscoverBrowseHref(listingType: DiscoverListingType, selectedCity: string) {
  const params = new URLSearchParams();

  if (listingType === 'developments') {
    const search = selectedCity.trim();

    if (search) {
      params.set('search', search);
    }

    return withQuery('/new-developments', params);
  }

  appendLocationContext(params, selectedCity);

  return withQuery(listingType === 'rent' ? '/property-to-rent' : '/property-for-sale', params);
}

export function buildDiscoverCardHref(
  propertyLabel: string,
  listingType: DiscoverListingType,
  selectedCity: string,
) {
  if (listingType === 'developments') {
    const params = new URLSearchParams();
    const search = selectedCity.trim();

    if (search) {
      params.set('search', search);
    }

    // These visual card labels are marketing groupings, not persisted
    // development filter values. Preserve location context without
    // manufacturing an unsupported backend filter.
    return withQuery('/new-developments', params);
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
