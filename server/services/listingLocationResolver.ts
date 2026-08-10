import { and, eq, ne, or, sql } from 'drizzle-orm';
import { getDb } from '../db-connection';
import {
  cities,
  locationProviderMappings,
  provinces,
  suburbs,
} from '../../drizzle/schema';
import {
  coordinatePairSchema,
  LOCATION_CONTRACT_VERSION,
  listingLocationSchema,
  type CoordinatePair,
  type PrivateAddress,
  type LocationCoordinateSource,
  type LocationConfirmationState,
  type PublicLocationPrecision,
} from '../../shared/location-contract';

type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type ProviderMappingRow = typeof locationProviderMappings.$inferSelect;
type ProvinceRow = {
  id: number;
  name: string;
  slug: string | null;
};
type CityRow = {
  id: number;
  name: string;
  provinceId: number;
  slug: string | null;
};
type SuburbRow = {
  id: number;
  name: string;
  cityId: number;
  slug: string | null;
};
type SuburbParentRow = {
  id: number;
  cityId: number;
};

export type ListingLocationResolverInput = {
  address?: string | null;
  latitude: number;
  longitude: number;
  city?: string | null;
  suburb?: string | null;
  province?: string | null;
  postalCode?: string | null;
  placeId?: string | null;
  providerLocationPlaceId?: string | null;
  provider?: string | null;
  provinceId?: number | null;
  cityId?: number | null;
  suburbId?: number | null;
  privateAddress?: PrivateAddress | null;
  addressComponents?: AddressComponent[];
  coordinateSource?: LocationCoordinateSource | null;
  locationConfirmationState?: LocationConfirmationState;
  publicLocationPrecision?: PublicLocationPrecision;
};

export type ResolvedListingLocation = {
  provinceId: number | null;
  cityId: number | null;
  suburbId: number | null;
  privateAddress: PrivateAddress | null;
  coordinatePair: CoordinatePair;
  coordinateSource: LocationCoordinateSource | null;
  locationConfirmationState: LocationConfirmationState;
  publicLocationPrecision: PublicLocationPrecision;
  providerLocationPlaceId: string | null;
};

export class ListingLocationResolutionError extends Error {
  readonly code: 'invalid' | 'ambiguous' | 'unresolved' | 'conflict';

  constructor(
    message: string,
    code: ListingLocationResolutionError['code'] = 'invalid',
  ) {
    super(message);
    this.name = 'ListingLocationResolutionError';
    this.code = code;
  }
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalized(value: unknown): string {
  return clean(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function slugify(value: string): string {
  return normalized(value).replace(/\s+/g, '-');
}

export function validLocalityCandidate(value: string): boolean {
  if (value.length < 2 || value.length > 200) return false;
  if (/[\n\r,]/.test(value) || /^\d+\s/.test(value)) return false;
  return !(
    /\b(?:restaurant|steers|mall|shopping|centre|center|school|hospital|building|unit|street|road|avenue|drive)\b/i.test(
      value,
    )
  );
}

function componentValue(components: AddressComponent[] | undefined, types: string[]) {
  const component = components?.find(item => types.some(type => item.types.includes(type)));
  return clean(component?.long_name);
}

function derivePrivateAddress(input: ListingLocationResolverInput): PrivateAddress | null {
  if (input.privateAddress) return input.privateAddress;

  const streetNumber = componentValue(input.addressComponents, ['street_number']);
  const streetName = componentValue(input.addressComponents, ['route']) || clean(input.address);
  const buildingName = componentValue(input.addressComponents, ['premise']);
  const unitNumber = componentValue(input.addressComponents, ['subpremise']);
  const postalCode = componentValue(input.addressComponents, ['postal_code']) || clean(input.postalCode);
  const address = {
    ...(streetNumber ? { streetNumber } : {}),
    ...(streetName ? { streetName } : {}),
    ...(buildingName ? { buildingName } : {}),
    ...(unitNumber ? { unitNumber } : {}),
    ...(postalCode ? { postalCode } : {}),
  };

  return Object.keys(address).length > 0 ? address : null;
}

async function one<T>(query: Promise<T[]>, label: string): Promise<T | null> {
  const rows = await query;
  if (rows.length > 1) {
    throw new ListingLocationResolutionError(`The selected ${label} is ambiguous.`, 'ambiguous');
  }
  return rows[0] ?? null;
}

async function resolveProviderMapping(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  input: ListingLocationResolverInput,
): Promise<ProviderMappingRow | null> {
  const providerPlaceId = clean(input.providerLocationPlaceId);
  if (!providerPlaceId) return null;
  const provider = clean(input.provider) || 'google';
  return one<ProviderMappingRow>(
    db
      .select()
      .from(locationProviderMappings)
      .where(
        and(
          eq(locationProviderMappings.provider, provider),
          eq(locationProviderMappings.providerPlaceId, providerPlaceId),
        ),
      )
      .limit(2),
    'provider location mapping',
  );
}

export async function resolveCanonicalListingLocation(
  input: ListingLocationResolverInput,
): Promise<ResolvedListingLocation> {
  const db = await getDb();
  if (!db) throw new ListingLocationResolutionError('Database not available.');

  const coordinateResult = coordinatePairSchema.safeParse({
    latitude: input.latitude,
    longitude: input.longitude,
  });
  if (!coordinateResult.success) {
    throw new ListingLocationResolutionError(
      coordinateResult.error.issues[0]?.message || 'Enter a valid property map location.',
    );
  }

  let provinceId = Number.isInteger(input.provinceId) && Number(input.provinceId) > 0
    ? Number(input.provinceId)
    : null;
  let cityId = Number.isInteger(input.cityId) && Number(input.cityId) > 0
    ? Number(input.cityId)
    : null;
  let suburbId = Number.isInteger(input.suburbId) && Number(input.suburbId) > 0
    ? Number(input.suburbId)
    : null;

  const providerMapping = await resolveProviderMapping(db, input);
  if (providerMapping) {
    const targets = [
      providerMapping.provinceId,
      providerMapping.cityId,
      providerMapping.suburbId,
    ].filter(value => value !== null && value !== undefined);
    if (targets.length !== 1) {
      throw new ListingLocationResolutionError(
        'The provider location mapping has an invalid geography target.',
        'conflict',
      );
    }
    if (providerMapping.provinceId) provinceId = Number(providerMapping.provinceId);
    if (providerMapping.cityId) cityId = Number(providerMapping.cityId);
    if (providerMapping.suburbId) suburbId = Number(providerMapping.suburbId);
  }

  const provinceName = clean(input.province);
  const cityName = clean(input.city);
  const suburbName = clean(input.suburb);

  const province = provinceId
    ? await one<ProvinceRow>(
        db
          .select({ id: provinces.id, name: provinces.name, slug: provinces.slug })
          .from(provinces)
          .where(and(eq(provinces.id, provinceId), ne(provinces.status, 'retired')))
          .limit(2),
        'province',
      )
    : provinceName
      ? await one<ProvinceRow>(
          db
            .select({ id: provinces.id, name: provinces.name, slug: provinces.slug })
            .from(provinces)
            .where(
              and(
                ne(provinces.status, 'retired'),
                or(
                  sql`LOWER(${provinces.name}) = LOWER(${provinceName})`,
                  sql`LOWER(${provinces.slug}) = LOWER(${slugify(provinceName)})`,
                ),
              ),
            )
            .limit(2),
          'province',
        )
      : null;

  if (province) {
    if (provinceName && normalized(province.name) !== normalized(provinceName)) {
      throw new ListingLocationResolutionError('Province does not match the canonical selection.', 'conflict');
    }
    provinceId = province.id;
  }

  const city = cityId
    ? await one<CityRow>(
        db
          .select({ id: cities.id, name: cities.name, provinceId: cities.provinceId, slug: cities.slug })
          .from(cities)
          .where(and(eq(cities.id, cityId), ne(cities.status, 'retired')))
          .limit(2),
        'city',
      )
    : cityName && provinceId
      ? await one<CityRow>(
          db
            .select({ id: cities.id, name: cities.name, provinceId: cities.provinceId, slug: cities.slug })
            .from(cities)
            .where(
              and(
                eq(cities.provinceId, provinceId),
                ne(cities.status, 'retired'),
                or(
                  sql`LOWER(${cities.name}) = LOWER(${cityName})`,
                  sql`LOWER(${cities.slug}) = LOWER(${slugify(cityName)})`,
                ),
              ),
            )
            .limit(2),
          'city',
        )
      : null;

  if (city) {
    if (!provinceId || city.provinceId !== provinceId) {
      throw new ListingLocationResolutionError('City does not belong to the selected province.', 'conflict');
    }
    if (cityName && normalized(city.name) !== normalized(cityName)) {
      throw new ListingLocationResolutionError('City does not match the canonical selection.', 'conflict');
    }
    cityId = city.id;
  }

  if (suburbId && !cityId) {
    const suburb = await one<SuburbParentRow>(
      db
        .select({ id: suburbs.id, cityId: suburbs.cityId })
        .from(suburbs)
        .where(and(eq(suburbs.id, suburbId), ne(suburbs.status, 'retired')))
        .limit(2),
      'suburb',
    );
    if (suburb) cityId = suburb.cityId;
  }

  let suburb = suburbId
    ? await one<SuburbRow>(
        db
          .select({ id: suburbs.id, name: suburbs.name, cityId: suburbs.cityId, slug: suburbs.slug })
          .from(suburbs)
          .where(and(eq(suburbs.id, suburbId), ne(suburbs.status, 'retired')))
          .limit(2),
        'suburb',
      )
    : suburbName && cityId
      ? await one<SuburbRow>(
          db
            .select({ id: suburbs.id, name: suburbs.name, cityId: suburbs.cityId, slug: suburbs.slug })
            .from(suburbs)
            .where(
              and(
                eq(suburbs.cityId, cityId),
                ne(suburbs.status, 'retired'),
                or(
                  sql`LOWER(${suburbs.name}) = LOWER(${suburbName})`,
                  sql`LOWER(${suburbs.slug}) = LOWER(${slugify(suburbName)})`,
                ),
              ),
            )
            .limit(2),
          'suburb',
        )
      : null;

  const providerEvidenceIsStreetAddress = input.addressComponents?.some(component =>
    component.types.some(type => type === 'street_number' || type === 'route'),
  );

  if (
    !suburb &&
    suburbName &&
    cityId &&
    clean(input.providerLocationPlaceId) &&
    !providerEvidenceIsStreetAddress
  ) {
    if (!validLocalityCandidate(suburbName)) {
      throw new ListingLocationResolutionError(
        'The provider result is not a valid geographic locality.',
        'unresolved',
      );
    }
    const suburbSlug = slugify(suburbName);
    const conflictingSlug = await one<SuburbRow>(
      db
        .select({ id: suburbs.id, name: suburbs.name, cityId: suburbs.cityId })
        .from(suburbs)
        .where(and(eq(suburbs.cityId, cityId), eq(suburbs.slug, suburbSlug)))
        .limit(2),
      'suburb',
    );
    if (conflictingSlug && normalized(conflictingSlug.name) !== normalized(suburbName)) {
      throw new ListingLocationResolutionError(
        'A different canonical locality already uses this provider locality slug.',
        'conflict',
      );
    }
    if (!conflictingSlug) {
      const [created] = await db
        .insert(suburbs)
        .values({
          cityId,
          name: suburbName,
          slug: suburbSlug,
          postalCode: clean(input.postalCode) || null,
          latitude: String(input.latitude),
          longitude: String(input.longitude),
          status: 'provisional',
          origin: 'provider',
        })
        .execute();
      suburbId = Number((created as any).insertId);
      suburb = { id: suburbId, name: suburbName, cityId, slug: suburbSlug };
    } else {
      suburb = conflictingSlug;
      suburbId = conflictingSlug.id;
    }
  }

  if (suburb) {
    if (!cityId || suburb.cityId !== cityId) {
      throw new ListingLocationResolutionError('Suburb does not belong to the selected city.', 'conflict');
    }
    if (suburbName && normalized(suburb.name) !== normalized(suburbName)) {
      throw new ListingLocationResolutionError('Suburb does not match the canonical selection.', 'conflict');
    }
    suburbId = suburb.id;
  }

  const providerPlaceId = clean(input.providerLocationPlaceId);
  if (providerPlaceId && provinceId && !providerMapping) {
    const provider = clean(input.provider) || 'google';
    const target = suburbId ? { suburbId } : cityId ? { cityId } : { provinceId };
    const [existing] = await db
      .select()
      .from(locationProviderMappings)
      .where(
        and(
          eq(locationProviderMappings.provider, provider),
          eq(locationProviderMappings.providerPlaceId, providerPlaceId),
        ),
      )
      .limit(1);
    if (existing) {
      const existingTarget = existing.suburbId || existing.cityId || existing.provinceId;
      const nextTarget = target.suburbId || target.cityId || target.provinceId;
      if (Number(existingTarget) !== Number(nextTarget)) {
        throw new ListingLocationResolutionError(
          'Provider identity is already mapped to a different canonical locality.',
          'conflict',
        );
      }
    } else {
      await db.insert(locationProviderMappings).values({
        provider,
        providerPlaceId,
        providerLabel: suburbName || cityName || provinceName || providerPlaceId,
        normalizedAlias: normalized(suburbName || cityName || provinceName || providerPlaceId),
        ...target,
      });
    }
  }

  const confirmationState = input.locationConfirmationState || 'needs_confirmation';
  const coordinateSource =
    input.coordinateSource ||
    (confirmationState === 'confirmed'
      ? providerPlaceId || clean(input.placeId)
        ? 'autocomplete'
        : 'manual_confirmed'
      : null);

  return {
    provinceId,
    cityId,
    suburbId,
    privateAddress: derivePrivateAddress(input),
    coordinatePair: coordinateResult.data,
    coordinateSource,
    locationConfirmationState: confirmationState,
    publicLocationPrecision: input.publicLocationPrecision || 'approximate',
    providerLocationPlaceId: providerPlaceId || null,
  };
}

export function validatePublishableListingLocation(input: ResolvedListingLocation): string[] {
  const result = listingLocationSchema.safeParse({
    version: 1,
    discovery: {
      provinceId: input.provinceId,
      cityId: input.cityId,
      suburbId: input.suburbId,
    },
    privateAddress: input.privateAddress,
    coordinates: input.coordinatePair,
    coordinateSource: input.coordinateSource,
    locationConfirmationState: input.locationConfirmationState,
    publicLocationPrecision: input.publicLocationPrecision,
    providerPlaceId: input.providerLocationPlaceId,
  });
  return result.success ? [] : result.error.issues.map(issue => issue.message);
}

export function validateListingRecordLocation(record: Record<string, unknown>): string[] {
  const hasCanonicalLocationColumns = [
    'provinceId',
    'cityId',
    'suburbId',
    'locationConfirmationState',
    'publicLocationPrecision',
  ].some(key => record[key] !== undefined);
  if (!hasCanonicalLocationColumns) {
    const latitude = Number(record.latitude);
    const longitude = Number(record.longitude);
    if (record.address && Number.isFinite(latitude) && Number.isFinite(longitude)) return [];
  }

  let privateAddress: PrivateAddress | null = null;
  if (record.privateAddress && typeof record.privateAddress === 'string') {
    try {
      privateAddress = JSON.parse(record.privateAddress) as PrivateAddress;
    } catch {
      privateAddress = null;
    }
  } else if (record.privateAddress && typeof record.privateAddress === 'object') {
    privateAddress = record.privateAddress as PrivateAddress;
  }

  const result = listingLocationSchema.safeParse({
    version: LOCATION_CONTRACT_VERSION,
    discovery: {
      provinceId: Number(record.provinceId),
      cityId: Number(record.cityId),
      suburbId: record.suburbId == null ? null : Number(record.suburbId),
    },
    privateAddress,
    coordinates: {
      latitude: Number(record.latitude),
      longitude: Number(record.longitude),
    },
    coordinateSource: record.coordinateSource ?? null,
    locationConfirmationState: record.locationConfirmationState,
    publicLocationPrecision: record.publicLocationPrecision || 'approximate',
    providerPlaceId: null,
  });

  if (!result.success) return result.error.issues.map(issue => issue.message);
  return result.data.locationConfirmationState === 'confirmed'
    ? []
    : ['Confirm the property location before publishing.'];
}
