import { parseCanonicalLocationId } from './locationAuthority';
import { isSearchAreaId, MULTI_LOCATION_MAX, MULTI_LOCATION_MIN } from './searchScope';

/**
 * Public Land accepts exactly one geography authority per request. This keeps
 * the URL, rendered filters, and parcel query boundary describing the same
 * search; a later field must never silently override an earlier one.
 */
export interface LandSearchGeographyInput {
  city?: string;
  province?: string;
  locationId?: string;
  locationIds?: readonly string[];
  searchAreaId?: string;
}

export interface LandSearchGeographyIssue {
  path: 'city' | 'locationId' | 'locationIds' | 'searchAreaId';
  message: string;
}

export function validateLandSearchGeography(
  input: LandSearchGeographyInput,
): LandSearchGeographyIssue | undefined {
  const hasManualGeography = Boolean(input.city || input.province);
  const locationIds = input.locationIds || [];
  const hasLocationIds = locationIds.length > 0;

  if (input.searchAreaId && !isSearchAreaId(input.searchAreaId)) {
    return {
      path: 'searchAreaId',
      message: 'The Search Area ID must use a stable Property Listify identity.',
    };
  }

  if (input.locationId && !parseCanonicalLocationId(input.locationId)) {
    return {
      path: 'locationId',
      message: 'The location ID must use a canonical Property Listify identity.',
    };
  }

  if (locationIds.some(locationId => !parseCanonicalLocationId(locationId))) {
    return {
      path: 'locationIds',
      message: 'Every selected Land location must use a canonical Property Listify identity.',
    };
  }

  if (locationIds.length > MULTI_LOCATION_MAX) {
    return {
      path: 'locationIds',
      message: `A Land multi-location search cannot contain more than ${MULTI_LOCATION_MAX} locations.`,
    };
  }

  if (hasLocationIds && locationIds.length < MULTI_LOCATION_MIN) {
    return {
      path: 'locationIds',
      message: 'Use locationId for one Land location or provide at least two sibling locations.',
    };
  }

  if (new Set(locationIds).size !== locationIds.length) {
    return {
      path: 'locationIds',
      message: 'A Land multi-location search cannot repeat a canonical location.',
    };
  }

  if (input.locationId && hasLocationIds) {
    return {
      path: 'locationIds',
      message:
        'A Land request cannot combine one canonical location with a multi-location selection.',
    };
  }

  if (input.searchAreaId && (input.locationId || hasLocationIds || hasManualGeography)) {
    return {
      path: 'searchAreaId',
      message: 'A Land Search Area cannot be combined with another geography authority.',
    };
  }

  if ((input.locationId || hasLocationIds) && hasManualGeography) {
    return {
      path: input.locationId ? 'locationId' : 'locationIds',
      message: 'A canonical Land location cannot be combined with typed city or province filters.',
    };
  }

  return undefined;
}
