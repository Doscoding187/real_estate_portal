import { isCanonicalPlaceId } from './placeAuthority';
import { MULTI_LOCATION_MAX, MULTI_LOCATION_MIN } from './searchScope';

/** Public Land accepts one admitted Place or exact sibling Places. */
export interface LandSearchGeographyInput {
  canonicalPlaceId?: string;
  canonicalPlaceIds?: readonly string[];
}

export interface LandSearchGeographyIssue {
  path: 'canonicalPlaceId' | 'canonicalPlaceIds';
  message: string;
}

export function validateLandSearchGeography(
  input: LandSearchGeographyInput,
): LandSearchGeographyIssue | undefined {
  const canonicalPlaceId = String(input.canonicalPlaceId || '').trim();
  const canonicalPlaceIds = (input.canonicalPlaceIds || [])
    .map(value => String(value).trim())
    .filter(Boolean);

  if (canonicalPlaceId && !isCanonicalPlaceId(canonicalPlaceId)) {
    return {
      path: 'canonicalPlaceId',
      message: 'The Place ID must use an admitted canonical Place identity.',
    };
  }
  if (canonicalPlaceIds.some(placeId => !isCanonicalPlaceId(placeId))) {
    return {
      path: 'canonicalPlaceIds',
      message: 'Every selected Land Place must use an admitted canonical Place identity.',
    };
  }
  if (canonicalPlaceIds.length > MULTI_LOCATION_MAX) {
    return {
      path: 'canonicalPlaceIds',
      message: `A Land multi-Place search cannot contain more than ${MULTI_LOCATION_MAX} Places.`,
    };
  }
  if (canonicalPlaceIds.length > 0 && canonicalPlaceIds.length < MULTI_LOCATION_MIN) {
    return {
      path: 'canonicalPlaceIds',
      message: 'Use canonicalPlaceId for one Land Place or select at least two sibling Places.',
    };
  }
  if (new Set(canonicalPlaceIds).size !== canonicalPlaceIds.length) {
    return {
      path: 'canonicalPlaceIds',
      message: 'A Land multi-Place search cannot repeat a Place.',
    };
  }
  if (canonicalPlaceId && canonicalPlaceIds.length > 0) {
    return {
      path: 'canonicalPlaceIds',
      message: 'A Land request cannot combine one Place with a multi-Place selection.',
    };
  }
  if (!canonicalPlaceId && canonicalPlaceIds.length === 0) {
    return {
      path: 'canonicalPlaceId',
      message: 'Choose an admitted canonical Place.',
    };
  }

  return undefined;
}
