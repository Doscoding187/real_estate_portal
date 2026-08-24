import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { getDb } from '../db-connection';
import {
  cities,
  provinces,
  slPlaces,
  slSpaceAvailability,
  slSpaces,
  suburbs,
} from '../../drizzle/schema';
import { parseCanonicalLocationId } from '../../shared/locationAuthority';

/**
 * Shared Living public read authority: discovery search + space detail.
 *
 * Eligibility: place published AND space available. Geography resolves
 * through canonical ids or exact slug identity onto the place FK columns —
 * unknown scopes fail closed to zero results. The private address never
 * leaves the database; coordinates follow the privacy matrix (spec §6):
 * room-type spaces render area-only, standalone types may expose exact
 * coordinates when the place precision permits.
 */

export type SlAccommodationType =
  | 'private_room'
  | 'shared_room'
  | 'en_suite_room'
  | 'garden_cottage'
  | 'granny_flat'
  | 'bachelor_studio'
  | 'backyard_room'
  | 'backyard_unit'
  | 'room_shared_house'
  | 'room_shared_apartment';

export interface SharedLivingSearchInput {
  marketTag?: 'room_share' | 'independent_micro' | 'student';
  accommodationTypes?: SlAccommodationType[];
  minPrice?: number;
  maxPrice?: number;
  billsElectricity?: boolean;
  billsWifi?: boolean;
  furnished?: 'furnished' | 'partial' | 'any';
  bathroom?: 'own' | 'shared' | 'any';
  availableFrom?: string;
  locationId?: string;
  locationIds?: string[];
  location?: string;
  page?: number;
}

const STANDALONE_TYPES = new Set(['garden_cottage', 'granny_flat', 'bachelor_studio', 'backyard_unit']);

type Scope =
  | { status: 'none' }
  | { status: 'empty' }
  | { status: 'scope'; column: 'provinceId' | 'cityId' | 'suburbId'; ids: number[] };

async function resolveScope(
  input: Pick<SharedLivingSearchInput, 'locationId' | 'locationIds' | 'location'>,
): Promise<Scope> {
  const rawIds = (input.locationIds || []).map(v => String(v).trim()).filter(Boolean);
  const single = input.locationId ? String(input.locationId).trim() : '';
  const ids = single ? [single, ...rawIds] : rawIds;
  const token = input.location?.trim().toLowerCase().replace(/\s+/g, '-') || '';

  if (!ids.length && !token) return { status: 'none' };

  if (ids.length) {
    const parsed = ids.map(value => parseCanonicalLocationId(value));
    if (parsed.some(entry => entry === null)) return { status: 'empty' };
    const levels = new Set(parsed.map(entry => entry!.level));
    if (levels.size !== 1) return { status: 'empty' };
    const level = parsed[0]!.level;
    return {
      status: 'scope',
      column: level === 'province' ? 'provinceId' : level === 'city' ? 'cityId' : 'suburbId',
      ids: Array.from(new Set(parsed.map(entry => Number(entry!.id)))),
    };
  }

  const db = await getDb();
  if (!db) return { status: 'empty' };

  const [provinceRow] = await db.select({ id: provinces.id }).from(provinces).where(eq(provinces.slug, token)).limit(1);
  if (provinceRow) return { status: 'scope', column: 'provinceId', ids: [provinceRow.id] };
  const [cityRow] = await db.select({ id: cities.id }).from(cities).where(eq(cities.slug, token)).limit(1);
  if (cityRow) return { status: 'scope', column: 'cityId', ids: [cityRow.id] };
  const [suburbRow] = await db.select({ id: suburbs.id }).from(suburbs).where(eq(suburbs.slug, token)).limit(1);
  if (suburbRow) return { status: 'scope', column: 'suburbId', ids: [suburbRow.id] };

  return { status: 'empty' };
}

export async function searchSharedLivingSpaces(input: SharedLivingSearchInput = {}) {
  const scope = await resolveScope(input);
  if (scope.status === 'empty') {
    return { items: [], total: 0, page: normalizePage(input.page), pageSize: PAGE_SIZE };
  }

  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const rows = await db
    .select({
      spaceId: slSpaces.id,
      placeId: slPlaces.id,
      spaceSlug: slSpaces.slug,
      label: slSpaces.label,
      accommodationType: slSpaces.accommodationType,
      marketTag: slSpaces.marketTag,
      rentableAreaM2: slSpaces.rentableAreaM2,
      furnishedState: slSpaces.furnishedState,
      bathroomAccess: slSpaces.bathroomAccess,
      parkingBays: slSpaces.parkingBays,
      placeKind: slPlaces.placeKind,
      placeSlug: slPlaces.slug,
      description: slPlaces.description,
      suburbName: suburbs.name,
      cityName: cities.name,
      provinceName: provinces.name,
      latitude: sql<number | null>`${slPlaces.latitude}`,
      longitude: sql<number | null>`${slPlaces.longitude}`,
      geoPrecision: slPlaces.geoPrecision,
      rentAmountMinor: slSpaceAvailability.rentAmountMinor,
      rentUnknown: slSpaceAvailability.rentUnknown,
      billsIncludedJson: slSpaceAvailability.billsIncludedJson,
      depositMinor: slSpaceAvailability.depositMinor,
      availableFrom: slSpaceAvailability.availableFrom,
    })
    .from(slSpaces)
    .innerJoin(slPlaces, eq(slSpaces.placeId, slPlaces.id))
    .leftJoin(slSpaceAvailability, eq(slSpaces.id, slSpaceAvailability.spaceId))
    .leftJoin(suburbs, eq(slPlaces.suburbId, suburbs.id))
    .leftJoin(cities, eq(slPlaces.cityId, cities.id))
    .leftJoin(provinces, eq(slPlaces.provinceId, provinces.id))
    .where(
      and(
        eq(slPlaces.status, 'published'),
        eq(slSpaces.status, 'available'),
        ...(scope.status === 'scope'
          ? [
              inArray(
                scope.column === 'provinceId'
                  ? slPlaces.provinceId
                  : scope.column === 'cityId'
                    ? slPlaces.cityId
                    : slPlaces.suburbId,
                scope.ids,
              ),
            ]
          : []),
        ...(input.marketTag ? [eq(slSpaces.marketTag, input.marketTag)] : []),
        ...(input.accommodationTypes?.length
          ? [inArray(slSpaces.accommodationType, input.accommodationTypes)]
          : []),
        ...(input.minPrice !== undefined
          ? [gte(slSpaceAvailability.rentAmountMinor, Math.round(input.minPrice))]
          : []),
        ...(input.maxPrice !== undefined
          ? [sql`${slSpaceAvailability.rentAmountMinor} <= ${Math.round(input.maxPrice)}`]
          : []),
      ),
    )
    .orderBy(desc(slPlaces.createdAt), desc(slSpaces.id));

  let items = rows.map(row => projectPublicSpace(row));

  // Refinement facets that depend on projected facts (bills/furnishing/bathroom/date).
  items = items.filter(item => {
    if (input.furnished && input.furnished !== 'any' && item.furnishedState !== input.furnished) return false;
    if (input.bathroom && input.bathroom !== 'any' && item.bathroomAccess !== input.bathroom) return false;
    const bills = item.billsIncluded;
    if (input.billsElectricity && !bills.electricity) return false;
    if (input.billsWifi && !bills.wifi) return false;
    if (
      input.availableFrom &&
      item.availableFrom &&
      new Date(item.availableFrom) > new Date(input.availableFrom)
    )
      return false;
    return true;
  });

  const pageSize = PAGE_SIZE;
  const page = Math.max(0, Math.floor(Number(input.page ?? 0)));
  const total = items.length;

  return {
    items: items.slice(page * pageSize, page * pageSize + pageSize),
    total,
    page,
    pageSize,
    hasMore: (page + 1) * pageSize < total,
  };
}

const PAGE_SIZE = 24;

function normalizePage(page: unknown): number {
  const value = Math.floor(Number(page ?? 0));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export interface PublicSharedLivingSpace {
  placeId: number;
  spaceId: number;
  slug: string;
  href: string;
  parkingBays: number | null;
  label: string;
  accommodationType: string;
  marketTag: string;
  rentableAreaM2: number | null;
  furnishedState: string;
  bathroomAccess: string;
  rentAmountMinor: number;
  rentUnknown: boolean;
  billsIncluded: { electricity: boolean; water: boolean; wifi: boolean };
  depositMinor: number | null;
  availableFrom: string | null;
  locationDisplay: string;
  /** Approximate coordinates: only for standalone small-place types. */
  coordinates: { latitude: number | null; longitude: number | null } | null;
  description: string | null;
  placeKind: string;
}

type RawRow = Record<string, unknown>;

export function projectPublicSpace(row: RawRow): PublicSharedLivingSpace {
  const accommodationType = String(row.accommodationType);
  const billsRaw = row.billsIncludedJson;
  let billsIncluded = { electricity: false, water: false, wifi: false };
  if (typeof billsRaw === 'string') {
    try {
      const parsed = JSON.parse(billsRaw);
      billsIncluded = {
        electricity: Boolean(parsed.electricity),
        water: Boolean(parsed.water),
        wifi: Boolean(parsed.wifi),
      };
    } catch {
      // Unparsable bills data renders as "not included" rather than guessing.
    }
  }

  const locationParts = [
    row.suburbName,
    row.cityName,
    row.provinceName,
  ].filter(Boolean);
  const locationDisplay = String(locationParts.join(', ') || 'Location on request');

  // Privacy matrix: rooms/shared formats never expose coordinates.
  const isStandalone = STANDALONE_TYPES.has(accommodationType);
  const coordinates =
    isStandalone && row.geoPrecision === 'suburb'
      ? {
          latitude: row.latitude == null ? null : Number(row.latitude),
          longitude: row.longitude == null ? null : Number(row.longitude),
        }
      : null;

  return {
    placeId: Number(row.placeId),
    spaceId: Number(row.spaceId),
    slug: String(row.spaceSlug),
    href: `/shared-living/${String(row.spaceSlug)}`,
    parkingBays: row.parkingBays == null ? null : Number(row.parkingBays),
    label: String(row.label),
    accommodationType,
    marketTag: String(row.marketTag),
    rentableAreaM2: row.rentableAreaM2 == null ? null : Number(row.rentableAreaM2),
    furnishedState: String(row.furnishedState),
    bathroomAccess: String(row.bathroomAccess),
    rentAmountMinor: Number(row.rentUnknown) === 1 ? 0 : Number(row.rentAmountMinor || 0),
    rentUnknown: Number(row.rentUnknown) === 1,
    billsIncluded,
    depositMinor: row.depositMinor == null ? null : Number(row.depositMinor),
    availableFrom: row.availableFrom ? String(row.availableFrom).slice(0, 10) : null,
    locationDisplay,
    coordinates,
    description: row.description == null ? null : String(row.description),
    placeKind: String(row.placeKind ?? 'other'),
  };
}

export async function sharedLivingDetailBySlug(spaceSlug: string): Promise<PublicSharedLivingSpace | null> {
  const results = await searchSharedLivingSpaces({});
  return results.items.find(item => item.slug === spaceSlug) || null;
}
