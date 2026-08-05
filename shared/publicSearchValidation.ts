import { parseCanonicalLocationId } from './locationAuthority';

export interface PublicSearchInputValidationIssue {
  path: string;
  message: string;
}

interface PublicSearchInputLike {
  province?: string;
  city?: string;
  suburb?: string[];
  locations?: string[];
  locationId?: string;
  listingType?: 'sale' | 'rent';
  minPrice?: number;
  maxPrice?: number;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
}

/**
 * Validates cross-field invariants that individual scalar schemas cannot
 * express. This is journey-neutral; Buy-specific filters remain in the Buy
 * adapter and future journeys can add their own refinements.
 */
export function validatePublicSearchInput(
  input: PublicSearchInputLike,
): PublicSearchInputValidationIssue | undefined {
  if (
    input.minPrice !== undefined &&
    input.maxPrice !== undefined &&
    input.minPrice > input.maxPrice
  ) {
    return {
      path: 'minPrice',
      message: 'Minimum price must be less than or equal to maximum price.',
    };
  }

  const bounds = [input.minLat, input.maxLat, input.minLng, input.maxLng];
  const suppliedBounds = bounds.filter(value => value !== undefined).length;
  if (suppliedBounds > 0 && suppliedBounds < bounds.length) {
    return {
      path: 'minLat',
      message: 'Map bounds must include south, north, west, and east values together.',
    };
  }

  if (suppliedBounds === bounds.length) {
    const [minLat, maxLat, minLng, maxLng] = bounds as number[];
    if (
      minLat < -90 ||
      maxLat > 90 ||
      minLng < -180 ||
      maxLng > 180 ||
      minLat > maxLat ||
      minLng > maxLng
    ) {
      return {
        path: 'minLat',
        message: 'Map bounds must be complete and ordered within geographic limits.',
      };
    }
  }

  const canonicalLocation = input.locationId
    ? parseCanonicalLocationId(input.locationId)
    : undefined;
  if (input.locationId && !canonicalLocation) {
    return {
      path: 'locationId',
      message: 'The location ID must use a canonical Property Listify identity.',
    };
  }

  const deepestQueryLevel = input.suburb?.length
    ? 'suburb'
    : input.city
      ? 'city'
      : input.province
        ? 'province'
        : undefined;
  if (canonicalLocation && deepestQueryLevel && canonicalLocation.level !== deepestQueryLevel) {
    return {
      path: 'locationId',
      message: 'The location ID level must match the deepest submitted geography.',
    };
  }

  // S2A is deliberately a single-location slice. Reject ambiguous sale
  // requests at the public boundary rather than allowing the service to use
  // only the first value.
  if (
    input.listingType === 'sale' &&
    ((input.suburb?.length || 0) > 1 || (input.locations?.length || 0) > 0)
  ) {
    return {
      path: 'suburb',
      message: 'Buy search currently accepts one canonical location only.',
    };
  }

  return undefined;
}
