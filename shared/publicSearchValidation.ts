import { isCanonicalPlaceId } from './placeAuthority';
import { BUY_PUBLIC_PROPERTY_TYPES, RENT_PUBLIC_PROPERTY_TYPES } from './property-taxonomy';

export interface PublicSearchInputValidationIssue {
  path: string;
  message: string;
}

interface PublicSearchInputLike {
  canonicalPlaceId?: string;
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
  const rawInput = input as PublicSearchInputLike & Record<string, unknown>;
  for (const key of [
    'province',
    'city',
    'suburb',
    'locations',
    'locationId',
    'factualLocationId',
    'locationIds',
    'searchAreaIds',
    'searchAreaId',
  ]) {
    if (rawInput[key] !== undefined && rawInput[key] !== null) {
      return {
        path: key,
        message: 'Use one canonical Place identity. Search Area and legacy geography inputs are retired.',
      };
    }
  }

  const listingType = input.listingType as unknown;
  if (listingType !== undefined && listingType !== 'sale' && listingType !== 'rent') {
    return {
      path: 'listingType',
      message: 'The public search journey must be Buy or Rent.',
    };
  }

  const supportedPropertyTypes =
    listingType === 'sale'
      ? BUY_PUBLIC_PROPERTY_TYPES
      : listingType === 'rent'
        ? RENT_PUBLIC_PROPERTY_TYPES
        : undefined;
  if (
    supportedPropertyTypes &&
    input.propertyType !== undefined &&
    !(supportedPropertyTypes as readonly string[]).includes(input.propertyType)
  ) {
    return {
      path: 'propertyType',
      message:
        'This property type is not available in the generic Buy/Rent journey. Use its dedicated journey instead.',
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

  if (input.canonicalPlaceId !== undefined) {
    if (!isCanonicalPlaceId(input.canonicalPlaceId))
      return {
        path: 'canonicalPlaceId',
        message: 'Choose a valid canonical Place identity.',
      };
  }

  return undefined;
}
