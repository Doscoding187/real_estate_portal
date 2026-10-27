import { z } from 'zod';

/** Province route slugs retained for navigation; resolution is owned by Place Authority. */
export const PROVINCE_SLUGS: readonly string[] = [
  'gauteng',
  'western-cape',
  'kwazulu-natal',
  'eastern-cape',
  'free-state',
  'limpopo',
  'mpumalanga',
  'north-west',
  'northern-cape',
];

export const LOCATION_COORDINATE_SOURCES = ['autocomplete', 'map', 'manual_confirmed'] as const;
export type LocationCoordinateSource = (typeof LOCATION_COORDINATE_SOURCES)[number];

export const LOCATION_CONFIRMATION_STATES = ['confirmed', 'needs_confirmation'] as const;
export type LocationConfirmationState = (typeof LOCATION_CONFIRMATION_STATES)[number];

export const PUBLIC_LOCATION_PRECISIONS = ['approximate', 'exact'] as const;
export type PublicLocationPrecision = (typeof PUBLIC_LOCATION_PRECISIONS)[number];

/** Product language mapped explicitly to the historical storage enum. */
export const PUBLIC_LOCATION_POLICIES = ['street', 'full_address'] as const;
export type PublicLocationPolicy = (typeof PUBLIC_LOCATION_POLICIES)[number];

export function publicLocationPolicyToStoredPrecision(
  policy: PublicLocationPolicy,
): PublicLocationPrecision {
  return policy === 'full_address' ? 'exact' : 'approximate';
}

export function storedPrecisionToPublicLocationPolicy(
  precision: PublicLocationPrecision | null | undefined,
): PublicLocationPolicy {
  return precision === 'exact' ? 'full_address' : 'street';
}

export const MANUAL_URBAN_PROPERTY_TYPES = [
  'apartment',
  'house',
  'townhouse',
  'cluster_home',
] as const;

export type ManualUrbanPropertyType = (typeof MANUAL_URBAN_PROPERTY_TYPES)[number];

export function isManualUrbanPropertyType(value: unknown): value is ManualUrbanPropertyType {
  return typeof value === 'string' && (MANUAL_URBAN_PROPERTY_TYPES as readonly string[]).includes(value);
}

export const privateAddressSchema = z
  .object({
    streetNumber: z.string().trim().min(1).max(32).optional(),
    streetName: z.string().trim().min(1).max(255).optional(),
    buildingName: z.string().trim().min(1).max(255).optional(),
    complexOrEstateName: z.string().trim().min(1).max(255).optional(),
    unitNumber: z.string().trim().min(1).max(64).optional(),
    postalCode: z.string().trim().min(1).max(20).optional(),
    farmOrHoldingName: z.string().trim().min(1).max(255).optional(),
    portionReference: z.string().trim().min(1).max(128).optional(),
  })
  .strict();

export type PrivateAddress = z.infer<typeof privateAddressSchema>;

export const coordinatePairSchema = z
  .object({
    latitude: z.number().finite().gte(-90).lte(90),
    longitude: z.number().finite().gte(-180).lte(180),
  })
  .strict()
  .superRefine((coordinates, context) => {
    if (coordinates.latitude === 0 && coordinates.longitude === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'The zero coordinate pair is not a publishable property location.',
        path: ['latitude'],
      });
    }
  });

export type CoordinatePair = z.infer<typeof coordinatePairSchema>;

/**
 * Normalize a stored/public coordinate pair without turning missing values
 * into zero. Public readers use this at their boundary so a partial, invalid,
 * or legacy zero pair cannot become a map marker.
 */
export function normalizeCoordinatePair(
  latitude: unknown,
  longitude: unknown,
): CoordinatePair | null {
  const toNumber = (value: unknown): number | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' && value.trim() === '') return null;

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  const normalizedLatitude = toNumber(latitude);
  const normalizedLongitude = toNumber(longitude);
  if (normalizedLatitude === null || normalizedLongitude === null) return null;

  const result = coordinatePairSchema.safeParse({
    latitude: normalizedLatitude,
    longitude: normalizedLongitude,
  });
  return result.success ? result.data : null;
}
