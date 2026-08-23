import { isFactualGeographyId } from './factualRuntimeGeographyBridge';
import { parseCanonicalLocationId } from './locationAuthority';
import { RENT_PUBLIC_PROPERTY_TYPES } from './property-taxonomy';
import { isSearchAreaId, MULTI_LOCATION_MAX, MULTI_LOCATION_MIN } from './searchScope';

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
  factualLocationId?: string;
  locationIds?: string[];
  searchAreaId?: string;
  searchAreaIds?: string[];
  listingType?: 'sale' | 'rent';
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minArea?: number;
  maxArea?: number;
  minFloorSize?: number;
  maxFloorSize?: number;
  minErfSize?: number;
  maxErfSize?: number;
  minLandSize?: number;
  maxLandSize?: number;
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
  const listingType = input.listingType as unknown;
  if (listingType !== undefined && listingType !== 'sale' && listingType !== 'rent') {
    return {
      path: 'listingType',
      message: 'The public search journey must be Buy or Rent.',
    };
  }

  if (
    listingType === 'rent' &&
    input.propertyType !== undefined &&
    !(RENT_PUBLIC_PROPERTY_TYPES as readonly string[]).includes(input.propertyType)
  ) {
    return {
      path: 'propertyType',
      message: 'This rental property type is not available in the Rent journey.',
    };
  }

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

  const sizeRanges: Array<[string, number | undefined, number | undefined]> = [
    ['minArea', input.minArea, input.maxArea],
    ['minFloorSize', input.minFloorSize, input.maxFloorSize],
    ['minErfSize', input.minErfSize, input.maxErfSize],
    ['minLandSize', input.minLandSize, input.maxLandSize],
  ];
  for (const [path, minimum, maximum] of sizeRanges) {
    if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
      return {
        path,
        message: 'Minimum size must be less than or equal to maximum size.',
      };
    }
  }

  const occupancyRanges: Array<[string, number | undefined, number | undefined]> = [
    ['minBedrooms', input.minBedrooms, input.maxBedrooms],
    ['minBathrooms', input.minBathrooms, input.maxBathrooms],
  ];
  for (const [path, minimum, maximum] of occupancyRanges) {
    if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
      return {
        path,
        message: 'Minimum value must be less than or equal to maximum value.',
      };
    }
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

  if (input.factualLocationId && !isFactualGeographyId(input.factualLocationId)) {
    return {
      path: 'factualLocationId',
      message: 'The factual location ID must use a stable Property Listify identity.',
    };
  }

  if (input.searchAreaId && !isSearchAreaId(input.searchAreaId)) {
    return {
      path: 'searchAreaId',
      message: 'The Search Area ID must use a stable Property Listify identity.',
    };
  }

  if (input.searchAreaIds?.some(searchAreaId => !isSearchAreaId(searchAreaId))) {
    return {
      path: 'searchAreaIds',
      message: 'Every Search Area ID must use a stable Property Listify identity.',
    };
  }

  if (input.locationIds?.some(locationId => !parseCanonicalLocationId(locationId))) {
    return {
      path: 'locationIds',
      message: 'Every selected location must use a canonical Property Listify identity.',
    };
  }

  if ((input.locationIds?.length || 0) > MULTI_LOCATION_MAX) {
    return {
      path: 'locationIds',
      message: `A multi-location search cannot contain more than ${MULTI_LOCATION_MAX} locations.`,
    };
  }

  if ((input.searchAreaIds?.length || 0) > MULTI_LOCATION_MAX) {
    return {
      path: 'searchAreaIds',
      message: `A multi-location search cannot contain more than ${MULTI_LOCATION_MAX} Search Areas.`,
    };
  }

  if (input.locationIds?.length && input.searchAreaIds?.length) {
    return {
      path: 'locationIds',
      message: 'A multi-location search cannot mix canonical locations and Search Areas.',
    };
  }

  if (input.locationIds !== undefined && input.locationIds.length < MULTI_LOCATION_MIN) {
    return {
      path: 'locationIds',
      message: `A multi-location search requires at least ${MULTI_LOCATION_MIN} selected locations.`,
    };
  }

  if (input.searchAreaIds !== undefined && input.searchAreaIds.length < MULTI_LOCATION_MIN) {
    return {
      path: 'searchAreaIds',
      message: `A multi-location search requires at least ${MULTI_LOCATION_MIN} selected Search Areas.`,
    };
  }

  const multiLocationIds = input.locationIds || [];
  const parsedMultiLocationIds = multiLocationIds
    .map(locationId => parseCanonicalLocationId(locationId))
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
  if (
    parsedMultiLocationIds.length > 1 &&
    new Set(parsedMultiLocationIds.map(location => location.level)).size !== 1
  ) {
    return {
      path: 'locationIds',
      message: 'Multi-location selections must use one geographic level.',
    };
  }

  if ((input.locationIds?.length || 0) > 0 || (input.searchAreaIds?.length || 0) > 0) {
    if (
      input.locationId ||
      input.searchAreaId ||
      input.province ||
      input.city ||
      input.suburb?.length ||
      input.locations?.length
    ) {
      return {
        path: 'locationIds',
        message:
          'Multi-location searches cannot combine selected locations with another geography authority.',
      };
    }
  }

  if (input.locationId && !canonicalLocation) {
    return {
      path: 'locationId',
      message: 'The location ID must use a canonical Property Listify identity.',
    };
  }

  if (
    input.searchAreaId &&
    (input.province ||
      input.city ||
      input.suburb?.length ||
      input.locations?.length ||
      input.locationIds?.length ||
      input.searchAreaIds?.length)
  ) {
    return {
      path: 'searchAreaId',
      message: 'Search Area requests cannot combine a Search Area with broad geography fields.',
    };
  }

  if (
    input.factualLocationId &&
    (input.searchAreaId ||
      input.searchAreaIds?.length ||
      input.locationIds?.length ||
      input.locations?.length)
  ) {
    return {
      path: 'factualLocationId',
      message: 'A factual location identity cannot be combined with an OR geography selection.',
    };
  }

  if (input.searchAreaId && canonicalLocation && canonicalLocation.level !== 'suburb') {
    return {
      path: 'locationId',
      message: 'A Search Area may only be refined by a canonical locality.',
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
