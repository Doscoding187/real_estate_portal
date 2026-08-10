import { z } from 'zod';

/**
 * PLE-6B prepares the typed location boundary without making the current
 * wizard or runtime depend on the pending database migration.
 */
export const LOCATION_CONTRACT_VERSION = 1 as const;

export const LOCATION_LEVELS = ['province', 'city', 'suburb'] as const;
export type LocationLevel = (typeof LOCATION_LEVELS)[number];

export const LOCATION_STATUSES = ['verified', 'provisional', 'retired'] as const;
export type LocationStatus = (typeof LOCATION_STATUSES)[number];

export const LOCATION_ORIGINS = ['internal', 'provider', 'manual'] as const;
export type LocationOrigin = (typeof LOCATION_ORIGINS)[number];

export const LOCATION_COORDINATE_SOURCES = ['autocomplete', 'map', 'manual_confirmed'] as const;
export type LocationCoordinateSource = (typeof LOCATION_COORDINATE_SOURCES)[number];

export const LOCATION_CONFIRMATION_STATES = ['confirmed', 'needs_confirmation'] as const;
export type LocationConfirmationState = (typeof LOCATION_CONFIRMATION_STATES)[number];

export const PUBLIC_LOCATION_PRECISIONS = ['approximate', 'exact'] as const;
export type PublicLocationPrecision = (typeof PUBLIC_LOCATION_PRECISIONS)[number];

export const canonicalDiscoveryLocationSchema = z
  .object({
    provinceId: z.number().int().positive(),
    cityId: z.number().int().positive(),
    suburbId: z.number().int().positive().nullable(),
  })
  .strict();

export type CanonicalDiscoveryLocation = z.infer<typeof canonicalDiscoveryLocationSchema>;

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

const coordinatePairSchema = z
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

export const listingLocationSchema = z
  .object({
    version: z.literal(LOCATION_CONTRACT_VERSION),
    discovery: canonicalDiscoveryLocationSchema,
    privateAddress: privateAddressSchema.nullable(),
    coordinates: coordinatePairSchema.nullable(),
    coordinateSource: z.enum(LOCATION_COORDINATE_SOURCES).nullable(),
    locationConfirmationState: z.enum(LOCATION_CONFIRMATION_STATES),
    publicLocationPrecision: z.enum(PUBLIC_LOCATION_PRECISIONS),
    providerPlaceId: z.string().trim().min(1).max(255).nullable(),
  })
  .strict()
  .superRefine((location, context) => {
    if (location.locationConfirmationState !== 'confirmed') return;

    if (!location.coordinates) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A confirmed location requires valid coordinates.',
        path: ['coordinates'],
      });
    }

    if (!location.coordinateSource) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A confirmed location requires coordinate source evidence.',
        path: ['coordinateSource'],
      });
    }
  });

export type ListingLocation = z.infer<typeof listingLocationSchema>;

export const locationProviderMappingSchema = z
  .object({
    provider: z.string().trim().min(1).max(32),
    providerPlaceId: z.string().trim().min(1).max(255),
    providerLabel: z.string().trim().min(1).max(255),
    normalizedAlias: z.string().trim().min(1).max(255),
    provinceId: z.number().int().positive().nullable(),
    cityId: z.number().int().positive().nullable(),
    suburbId: z.number().int().positive().nullable(),
  })
  .strict()
  .superRefine((mapping, context) => {
    const targetCount = [mapping.provinceId, mapping.cityId, mapping.suburbId].filter(
      value => value !== null,
    ).length;

    if (targetCount !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A provider mapping must target exactly one geography level.',
        path: ['provinceId'],
      });
    }
  });

export type LocationProviderMapping = z.infer<typeof locationProviderMappingSchema>;

export function isPublishableListingLocation(input: unknown): input is ListingLocation {
  const result = listingLocationSchema.safeParse(input);
  return result.success && result.data.locationConfirmationState === 'confirmed';
}
