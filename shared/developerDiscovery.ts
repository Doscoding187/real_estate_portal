import { isCanonicalPlaceId } from './placeAuthority';

export function readDeveloperPlace(search: string) {
  const params = new URLSearchParams(search);
  const placeIds = params.getAll('canonicalPlaceId').map(value => value.trim());
  const canonicalPlaceId =
    placeIds.length === 1 && isCanonicalPlaceId(placeIds[0]) ? placeIds[0] : undefined;
  return {
    canonicalPlaceId,
    invalid:
      params.has('province') ||
      params.has('city') ||
      params.has('suburb') ||
      params.has('locationId') ||
      params.has('locationIds') ||
      params.has('searchAreaId') ||
      params.has('searchAreaIds') ||
      params.has('locations') ||
      placeIds.length > 1 ||
      (placeIds.length === 1 && !canonicalPlaceId),
  };
}

export function developerDiscoveryHref(
  path: string,
  canonicalPlaceId?: string,
  projects = false,
) {
  const query =
    canonicalPlaceId && isCanonicalPlaceId(canonicalPlaceId)
      ? `?${new URLSearchParams({ canonicalPlaceId }).toString()}`
      : '';
  return `${path}${query}${projects ? '#developments' : ''}`;
}
