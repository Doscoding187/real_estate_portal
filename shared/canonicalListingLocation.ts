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
 * Canonical Listing consumer boundary. One canonical identity; private address,
 * coordinates and provider observations are evidence, never another authority.
 * Create/edit/publication resolve this boundary on their persistence transaction.
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
        // The authored provider column is explicitly Google evidence. Another
        // provider requires its own persisted evidence boundary before admission.
        provider: z.literal('google'),
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

export interface CanonicalListingPlaceChoice {
  canonicalPlaceId: string;
  label: string;
  placeType: string;
  scope: PlaceSearchScope;
  administrativeContext: string | null;
}

/** Read the declared Listing columns; labels and numeric handles are not inputs. */
export function canonicalListingLocationFromRecord(record: Record<string, unknown>): unknown {
  const coordinate = (value: unknown): number | null => {
    if (value == null) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && /^[-+]?\d+(?:\.\d+)?$/.test(value)) return Number(value);
    // A malformed declared decimal must remain invalid, including blanks and
    // booleans; coercing either would manufacture a usable coordinate.
    return Number.NaN;
  };
  const latitude = coordinate(record.latitude);
  const longitude = coordinate(record.longitude);
  return {
    version: CANONICAL_LISTING_LOCATION_VERSION,
    canonicalPlaceId: record.canonicalPlaceId ?? null,
    privateAddress: record.privateAddress ?? null,
    coordinates: latitude === null && longitude === null ? null : { latitude, longitude },
    coordinateSource: record.coordinateSource ?? null,
    locationConfirmationState: record.locationConfirmationState,
    publicLocationPrecision: record.publicLocationPrecision,
    providerObservation: record.placeId
      ? { provider: 'google', providerPlaceId: record.placeId }
      : null,
  };
}

export function validateCanonicalListingRecordLocation(record: Record<string, unknown>): string[] {
  const parsed = canonicalListingLocationSchema.safeParse(
    canonicalListingLocationFromRecord(record),
  );
  if (!parsed.success) return parsed.error.issues.map(issue => issue.message);
  return parsed.data.locationConfirmationState === 'confirmed'
    ? []
    : ['Confirm the current location before publication.'];
}

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

/** Allow-list wizard evidence. Persisted display labels and numeric handles never become identity. */
export function buildCanonicalListingLocationPayload(
  location: import('./listing-types').LocationData | null | undefined,
): CanonicalListingLocation {
  if (location?.canonicalLocationRefusal)
    throw new Error('Choose a replacement for the unavailable selected location.');
  const latitude = location?.latitude ?? null;
  const longitude = location?.longitude ?? null;
  return canonicalListingLocationSchema.parse({
    version: CANONICAL_LISTING_LOCATION_VERSION,
    canonicalPlaceId: location?.canonicalPlace?.canonicalPlaceId ?? null,
    privateAddress: location?.privateAddress ?? null,
    coordinates: latitude === null && longitude === null ? null : { latitude, longitude },
    coordinateSource: location?.coordinateSource ?? null,
    locationConfirmationState: location?.locationConfirmationState ?? 'needs_confirmation',
    publicLocationPrecision: location?.publicLocationPrecision ?? 'approximate',
    providerObservation: location?.providerLocationPlaceId
      ? { provider: location.provider, providerPlaceId: location.providerLocationPlaceId }
      : null,
  });
}
