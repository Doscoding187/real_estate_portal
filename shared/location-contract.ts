import { z } from 'zod';

/** The versioned location boundary shared by authoring, publication and search. */
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

export type ListingLocationAuthoringPayload = {
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  suburb?: string;
  province: string;
  postalCode?: string;
  placeId?: string;
  locationId?: number;
  providerLocationPlaceId?: string;
  provider?: string;
  provinceId?: number | null;
  cityId?: number | null;
  suburbId?: number | null;
  privateAddress?: PrivateAddress | null;
  coordinateSource?: LocationCoordinateSource | null;
  locationConfirmationState?: LocationConfirmationState;
  publicLocationPrecision?: PublicLocationPrecision;
  addressComponents?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
};

/**
 * Keep the browser-to-server location boundary allow-listed. Legacy Zustand
 * state may contain provider/UI-only keys, but they must not cross submission
 * merely because they happen to be enumerable.
 */
export function buildListingLocationAuthoringPayload(
  location: Partial<ListingLocationAuthoringPayload> | null | undefined,
): ListingLocationAuthoringPayload | undefined {
  if (!location) return undefined;

  return {
    address: typeof location.address === 'string' ? location.address : '',
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    city: typeof location.city === 'string' ? location.city : '',
    suburb: typeof location.suburb === 'string' ? location.suburb : undefined,
    province: typeof location.province === 'string' ? location.province : '',
    postalCode: typeof location.postalCode === 'string' ? location.postalCode : undefined,
    placeId: typeof location.placeId === 'string' ? location.placeId : undefined,
    locationId: Number.isInteger(location.locationId) ? location.locationId : undefined,
    providerLocationPlaceId:
      typeof location.providerLocationPlaceId === 'string'
        ? location.providerLocationPlaceId
        : undefined,
    provider: typeof location.provider === 'string' ? location.provider : undefined,
    provinceId: location.provinceId ?? null,
    cityId: location.cityId ?? null,
    suburbId: location.suburbId ?? null,
    privateAddress: location.privateAddress ?? null,
    coordinateSource: location.coordinateSource ?? null,
    locationConfirmationState: location.locationConfirmationState,
    publicLocationPrecision: location.publicLocationPrecision,
    addressComponents: location.addressComponents,
  };
}

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
