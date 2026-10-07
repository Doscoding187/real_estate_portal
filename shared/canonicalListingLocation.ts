import { z } from 'zod';
import { PLACE_ID_REGEX, type PlaceSearchScope } from './placeAuthority';
import {
  coordinatePairSchema,
  isManualUrbanPropertyType,
  LOCATION_CONFIRMATION_STATES,
  LOCATION_COORDINATE_SOURCES,
  privateAddressSchema,
  PUBLIC_LOCATION_PRECISIONS,
} from './location-contract';

/**
 * Prepared Listing consumer boundary. One canonical identity; private address,
 * coordinates and provider observations are evidence, never another authority.
 * The product cutover must use this boundary atomically with persisted references.
 */
export const CANONICAL_LISTING_LOCATION_VERSION = 2 as const;
export const canonicalListingLocationSchema = z
  .object({
    version: z.literal(CANONICAL_LISTING_LOCATION_VERSION),
    canonicalPlaceId: z.string().regex(PLACE_ID_REGEX).nullable(),
    privateAddress: privateAddressSchema.nullable(),
    coordinates: coordinatePairSchema.nullable(),
    coordinateSource: z.enum(LOCATION_COORDINATE_SOURCES).nullable(),
    locationConfirmationState: z.enum(LOCATION_CONFIRMATION_STATES),
    publicLocationPrecision: z.enum(PUBLIC_LOCATION_PRECISIONS),
    providerObservation: z
      .object({
        provider: z.string().trim().min(1).max(32),
        providerPlaceId: z.string().trim().min(1).max(255),
      })
      .strict()
      .nullable(),
  })
  .strict()
  .superRefine((location, context) => {
    const issue = (path: string, message: string) =>
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [path],
        message,
      });
    if (location.coordinates && !location.coordinateSource) {
      issue('coordinateSource', 'Coordinates require source evidence.');
    }
    if (
      !location.coordinates &&
      location.coordinateSource &&
      location.coordinateSource !== 'manual_confirmed'
    ) {
      issue('coordinateSource', 'A location without coordinates must use manual confirmation.');
    }
    if (location.locationConfirmationState !== 'confirmed') return;
    if (!location.canonicalPlaceId) issue('canonicalPlaceId', 'Select an approved location.');
    if (
      !location.coordinates &&
      !(
        location.privateAddress?.streetName ||
        location.privateAddress?.farmOrHoldingName ||
        location.privateAddress?.portionReference
      )
    )
      issue('privateAddress', 'Enter a street or rural location reference.');
  });

export type CanonicalListingLocation = z.infer<typeof canonicalListingLocationSchema>;

/** No city ancestor is required for a directly selected locality. */
export function canonicalListingLocationEvidenceIssues(
  location: CanonicalListingLocation,
  scope: PlaceSearchScope,
  propertyType: string,
): string[] {
  if (isManualUrbanPropertyType(propertyType)) {
    const issues =
      scope === 'province' ? ['Select a city, town or locality for this property.'] : [];
    if (!location.coordinates) {
      if (scope !== 'locality')
        issues.push('Select a suburb or locality for a manual street location.');
      if (!location.privateAddress?.streetName) issues.push('Enter the street name.');
    }
    return issues;
  }
  if (
    propertyType === 'farm' &&
    !location.coordinates &&
    !(
      location.privateAddress?.farmOrHoldingName ||
      location.privateAddress?.streetName ||
      location.privateAddress?.portionReference
    )
  )
    return ['Enter a farm, holding, road or portion reference.'];
  return [];
}
