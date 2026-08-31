import { and, asc, desc, eq, gte, inArray, lte, ne } from 'drizzle-orm';
import { getDb } from '../db-connection';
import {
  agencies,
  agents,
  cities,
  provinces,
  slPlaceHousehold,
  slPlaces,
  slSpaceAvailability,
  slSpaces,
  slVerifications,
  suburbs,
} from '../../drizzle/schema';
import {
  resolveSharedLivingSearchGeography,
  type SharedLivingSearchGeography,
} from '../../shared/sharedLivingSearchContract';
import {
  type SharedLivingAccommodationType,
  type SharedLivingMarketTag,
} from '../../shared/sharedLivingDomain';

/**
 * Shared Living public read authority: its own inventory, eligibility, and
 * geography contract. It never asks the residential Rent search service to
 * infer what Shared Living means.
 */
export interface SharedLivingSearchInput {
  marketTag?: SharedLivingMarketTag;
  accommodationTypes?: SharedLivingAccommodationType[];
  /** Public-facing whole-Rand monthly budgets; storage remains minor units. */
  minPrice?: number;
  maxPrice?: number;
  billsElectricity?: boolean;
  billsWifi?: boolean;
  furnished?: 'furnished' | 'partial' | 'any';
  bathroom?: 'own' | 'shared' | 'any';
  availableFrom?: string;
  locationId?: string;
  locationIds?: string[];
  /** Accepted only to reject the unsupported authority explicitly. */
  searchAreaId?: string;
  page?: number;
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
  /** No consent-backed exact-coordinate setting exists in MVP. */
  coordinates: { latitude: number | null; longitude: number | null } | null;
  description: string | null;
  placeKind: string;
  household: {
    occupantsCount: number | null;
    occupantsType: string;
    smoking: string;
    pets: string;
    visitors: string;
    cleaning: string;
    genderComposition: string | null;
  };
  attribution: {
    kind: 'owner' | 'practitioner';
    label: string;
    name?: string;
    agencyName?: string;
  };
  trust: {
    phoneVerified: boolean;
    relationshipVerified: boolean;
    propertyVerified: boolean;
  };
}

type InternalPublicSharedLivingSpace = PublicSharedLivingSpace & { ownerUserId: number };
type RawRow = Record<string, unknown>;

const PAGE_SIZE = 24;

function normalizePage(page: unknown): number {
  const value = Math.floor(Number(page ?? 0));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function monthlyBudgetMinor(value: number): number {
  return Math.round(value * 100);
}

function scopeCondition(scope: Extract<SharedLivingSearchGeography, { status: 'canonical' }>) {
  const ids = scope.locationIds.map(locationId => Number(locationId.split(':')[1]));
  const column =
    scope.level === 'province'
      ? slPlaces.provinceId
      : scope.level === 'city'
        ? slPlaces.cityId
        : slPlaces.suburbId;
  return inArray(column, ids);
}

/**
 * A syntactically canonical ID is not enough for an OR search. Resolve each
 * member against the catalogue before querying inventory so unknown IDs and
 * cross-parent selections cannot quietly become a different, broader scope.
 */
async function resolveExecutableSearchGeography(
  input: SharedLivingSearchInput,
): Promise<SharedLivingSearchGeography> {
  const scope = resolveSharedLivingSearchGeography(input);
  if (scope.status !== 'canonical') return scope;

  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const ids = scope.locationIds.map(locationId => Number(locationId.split(':')[1]));

  if (scope.level === 'province') {
    const rows = await db
      .select({ id: provinces.id })
      .from(provinces)
      .where(and(inArray(provinces.id, ids), ne(provinces.status, 'retired')));
    if (rows.length !== ids.length) {
      return {
        status: 'invalid',
        message: 'One or more Shared Living locations are not in the canonical location catalogue.',
      };
    }
    return scope;
  }

  if (scope.level === 'city') {
    const rows = await db
      .select({ id: cities.id, provinceId: cities.provinceId })
      .from(cities)
      .innerJoin(provinces, eq(cities.provinceId, provinces.id))
      .where(
        and(inArray(cities.id, ids), ne(cities.status, 'retired'), ne(provinces.status, 'retired')),
      );
    if (rows.length !== ids.length) {
      return {
        status: 'invalid',
        message: 'One or more Shared Living locations are not in the canonical location catalogue.',
      };
    }
    if (
      scope.locationIds.length > 1 &&
      new Set(rows.map(row => Number(row.provinceId))).size !== 1
    ) {
      return {
        status: 'invalid',
        message: 'Shared Living city selections must be sibling cities in one province.',
      };
    }
    return scope;
  }

  const rows = await db
    .select({ id: suburbs.id, cityId: suburbs.cityId })
    .from(suburbs)
    .innerJoin(cities, eq(suburbs.cityId, cities.id))
    .innerJoin(provinces, eq(cities.provinceId, provinces.id))
    .where(
      and(
        inArray(suburbs.id, ids),
        ne(suburbs.status, 'retired'),
        ne(cities.status, 'retired'),
        ne(provinces.status, 'retired'),
      ),
    );
  if (rows.length !== ids.length) {
    return {
      status: 'invalid',
      message: 'One or more Shared Living locations are not in the canonical location catalogue.',
    };
  }
  if (scope.locationIds.length > 1 && new Set(rows.map(row => Number(row.cityId))).size !== 1) {
    return {
      status: 'invalid',
      message: 'Shared Living suburb selections must be sibling suburbs in one city.',
    };
  }
  return scope;
}

async function selectPublicRows(
  input: SharedLivingSearchInput,
  scope: Extract<SharedLivingSearchGeography, { status: 'none' | 'canonical' }>,
  extraConditions: any[] = [],
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const hasPriceFilter = input.minPrice !== undefined || input.maxPrice !== undefined;
  return db
    .select({
      spaceId: slSpaces.id,
      placeId: slPlaces.id,
      ownerUserId: slPlaces.ownerUserId,
      spaceSlug: slSpaces.slug,
      label: slSpaces.label,
      accommodationType: slSpaces.accommodationType,
      marketTag: slSpaces.marketTag,
      rentableAreaM2: slSpaces.rentableAreaM2,
      furnishedState: slSpaces.furnishedState,
      bathroomAccess: slSpaces.bathroomAccess,
      parkingBays: slSpaces.parkingBays,
      placeKind: slPlaces.placeKind,
      description: slPlaces.description,
      suburbName: suburbs.name,
      cityName: cities.name,
      provinceName: provinces.name,
      rentAmountMinor: slSpaceAvailability.rentAmountMinor,
      rentUnknown: slSpaceAvailability.rentUnknown,
      billsIncludedJson: slSpaceAvailability.billsIncludedJson,
      depositMinor: slSpaceAvailability.depositMinor,
      availableFrom: slSpaceAvailability.availableFrom,
      occupantsCount: slPlaceHousehold.occupantsCount,
      occupantsType: slPlaceHousehold.occupantsType,
      smoking: slPlaceHousehold.smoking,
      pets: slPlaceHousehold.pets,
      visitors: slPlaceHousehold.visitors,
      cleaning: slPlaceHousehold.cleaning,
      genderComposition: slPlaceHousehold.genderComposition,
    })
    .from(slSpaces)
    .innerJoin(slPlaces, eq(slSpaces.placeId, slPlaces.id))
    .innerJoin(slSpaceAvailability, eq(slSpaces.id, slSpaceAvailability.spaceId))
    .leftJoin(suburbs, eq(slPlaces.suburbId, suburbs.id))
    .leftJoin(cities, eq(slPlaces.cityId, cities.id))
    .leftJoin(provinces, eq(slPlaces.provinceId, provinces.id))
    .leftJoin(slPlaceHousehold, eq(slPlaceHousehold.placeId, slPlaces.id))
    .where(
      and(
        eq(slPlaces.status, 'published'),
        eq(slSpaces.status, 'available'),
        ...(scope.status === 'canonical' ? [scopeCondition(scope)] : []),
        ...(input.marketTag ? [eq(slSpaces.marketTag, input.marketTag)] : []),
        ...(input.accommodationTypes?.length
          ? [inArray(slSpaces.accommodationType, input.accommodationTypes)]
          : []),
        ...(hasPriceFilter ? [eq(slSpaceAvailability.rentUnknown, 0)] : []),
        ...(input.minPrice !== undefined
          ? [gte(slSpaceAvailability.rentAmountMinor, monthlyBudgetMinor(input.minPrice))]
          : []),
        ...(input.maxPrice !== undefined
          ? [lte(slSpaceAvailability.rentAmountMinor, monthlyBudgetMinor(input.maxPrice))]
          : []),
        ...extraConditions,
      ),
    )
    .orderBy(desc(slPlaces.createdAt), desc(slSpaces.id));
}

/**
 * Public search filters after the canonical SQL eligibility predicate. These
 * facts are deliberately explicit in the projection, and unknown never
 * silently becomes included or available.
 */
export async function searchSharedLivingSpaces(input: SharedLivingSearchInput = {}) {
  const geography = await resolveExecutableSearchGeography(input);
  const page = normalizePage(input.page);
  if (geography.status === 'invalid' || geography.status === 'unsupported_search_area') {
    return {
      items: [],
      total: 0,
      page,
      pageSize: PAGE_SIZE,
      hasMore: false,
      locationState: geography.status,
      locationMessage: geography.message,
    };
  }

  const rows = await selectPublicRows(input, geography);
  let items = await enrichPublicSpaces(rows.map(projectPublicSpaceInternal));

  items = items.filter(item => {
    if (input.furnished && input.furnished !== 'any' && item.furnishedState !== input.furnished)
      return false;
    if (input.bathroom && input.bathroom !== 'any' && item.bathroomAccess !== input.bathroom)
      return false;
    if (input.billsElectricity && !item.billsIncluded.electricity) return false;
    if (input.billsWifi && !item.billsIncluded.wifi) return false;
    // An unknown availability date is not evidence that the space meets a
    // consumer's requested date. Do not quietly treat it as immediately
    // available when a date filter is active.
    if (
      input.availableFrom &&
      (!item.availableFrom || new Date(item.availableFrom) > new Date(input.availableFrom))
    )
      return false;
    return true;
  });

  const total = items.length;
  const pageItems = items
    .slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
    .map(stripInternalPublicFields);

  return {
    items: pageItems,
    total,
    page,
    pageSize: PAGE_SIZE,
    hasMore: (page + 1) * PAGE_SIZE < total,
    locationState: geography.status,
  };
}

/** Detail resolves by immutable space slug, never by a paginated search page. */
export async function sharedLivingDetailBySlug(
  spaceSlug: string,
): Promise<PublicSharedLivingSpace | null> {
  const rows = await selectPublicRows({}, { status: 'none' }, [eq(slSpaces.slug, spaceSlug)]);
  if (!rows.length) return null;
  const [space] = await enrichPublicSpaces(rows.slice(0, 1).map(projectPublicSpaceInternal));
  return space ? stripInternalPublicFields(space) : null;
}

/** Exposed for focused projection tests; it cannot disclose the private address column. */
export function projectPublicSpace(row: RawRow): PublicSharedLivingSpace {
  return stripInternalPublicFields(projectPublicSpaceInternal(row));
}

function projectPublicSpaceInternal(row: RawRow): InternalPublicSharedLivingSpace {
  const billsIncluded = parseBills(row.billsIncludedJson);
  const locationParts = [row.suburbName, row.cityName, row.provinceName].filter(Boolean);

  return {
    placeId: Number(row.placeId),
    spaceId: Number(row.spaceId),
    ownerUserId: Number(row.ownerUserId || 0),
    slug: String(row.spaceSlug),
    href: `/shared-living/${String(row.spaceSlug)}`,
    parkingBays: row.parkingBays == null ? null : Number(row.parkingBays),
    label: String(row.label),
    accommodationType: String(row.accommodationType),
    marketTag: String(row.marketTag),
    rentableAreaM2: row.rentableAreaM2 == null ? null : Number(row.rentableAreaM2),
    furnishedState: String(row.furnishedState),
    bathroomAccess: String(row.bathroomAccess),
    rentAmountMinor: Number(row.rentUnknown) === 1 ? 0 : Number(row.rentAmountMinor || 0),
    rentUnknown: Number(row.rentUnknown) === 1,
    billsIncluded,
    depositMinor: row.depositMinor == null ? null : Number(row.depositMinor),
    availableFrom: row.availableFrom ? String(row.availableFrom).slice(0, 10) : null,
    locationDisplay: String(locationParts.join(', ') || 'Location on request'),
    // The MVP has no explicit exact-location consent flag, so coordinates stay private.
    coordinates: null,
    description: row.description == null ? null : String(row.description),
    placeKind: String(row.placeKind ?? 'other'),
    household: {
      occupantsCount: row.occupantsCount == null ? null : Number(row.occupantsCount),
      occupantsType: String(row.occupantsType || 'unknown'),
      smoking: String(row.smoking || 'unknown'),
      pets: String(row.pets || 'unknown'),
      visitors: String(row.visitors || 'unknown'),
      cleaning: String(row.cleaning || 'unknown'),
      genderComposition: row.genderComposition == null ? null : String(row.genderComposition),
    },
    attribution: { kind: 'owner', label: 'Listed by owner' },
    trust: { phoneVerified: false, relationshipVerified: false, propertyVerified: false },
  };
}

function parseBills(value: unknown): { electricity: boolean; water: boolean; wifi: boolean } {
  let candidate = value;
  if (typeof candidate === 'string') {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      candidate = null;
    }
  }
  const bills =
    candidate && typeof candidate === 'object' ? (candidate as Record<string, unknown>) : {};
  return {
    electricity: Boolean(bills.electricity),
    water: Boolean(bills.water),
    wifi: Boolean(bills.wifi),
  };
}

async function enrichPublicSpaces(
  spaces: InternalPublicSharedLivingSpace[],
): Promise<InternalPublicSharedLivingSpace[]> {
  if (!spaces.length) return spaces;
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const placeIds = Array.from(new Set(spaces.map(space => space.placeId).filter(Boolean)));
  const ownerUserIds = Array.from(new Set(spaces.map(space => space.ownerUserId).filter(Boolean)));
  const [ownerPhoneRows, placeVerificationRows, practitionerRows] = await Promise.all([
    ownerUserIds.length
      ? db
          .select({ subjectId: slVerifications.subjectId })
          .from(slVerifications)
          .where(
            and(
              eq(slVerifications.subjectType, 'user'),
              eq(slVerifications.rung, 'phone'),
              eq(slVerifications.status, 'verified'),
              inArray(slVerifications.subjectId, ownerUserIds),
            ),
          )
      : Promise.resolve([]),
    placeIds.length
      ? db
          .select({ subjectId: slVerifications.subjectId, rung: slVerifications.rung })
          .from(slVerifications)
          .where(
            and(
              eq(slVerifications.subjectType, 'listing'),
              eq(slVerifications.status, 'verified'),
              inArray(slVerifications.subjectId, placeIds),
            ),
          )
      : Promise.resolve([]),
    ownerUserIds.length
      ? db
          .select({
            userId: agents.userId,
            displayName: agents.displayName,
            firstName: agents.firstName,
            lastName: agents.lastName,
            agencyName: agencies.name,
          })
          .from(agents)
          .leftJoin(agencies, eq(agents.agencyId, agencies.id))
          .where(and(eq(agents.status, 'approved'), inArray(agents.userId, ownerUserIds)))
          .orderBy(asc(agents.id))
      : Promise.resolve([]),
  ]);

  const phoneVerifiedOwners = new Set(ownerPhoneRows.map(row => Number(row.subjectId)));
  const verifiedRungsByPlace = new Map<number, Set<string>>();
  placeVerificationRows.forEach(row => {
    const placeId = Number(row.subjectId);
    const rungs = verifiedRungsByPlace.get(placeId) || new Set<string>();
    rungs.add(String(row.rung));
    verifiedRungsByPlace.set(placeId, rungs);
  });
  const practitionerByOwner = new Map<number, (typeof practitionerRows)[number]>();
  practitionerRows.forEach(row => {
    const userId = Number(row.userId || 0);
    if (userId && !practitionerByOwner.has(userId)) practitionerByOwner.set(userId, row);
  });

  return spaces.map(space => {
    const verifiedRungs = verifiedRungsByPlace.get(space.placeId) || new Set<string>();
    const relationshipVerified = verifiedRungs.has('relationship');
    const practitioner = practitionerByOwner.get(space.ownerUserId);
    const practitionerName = practitioner
      ? String(
          practitioner.displayName ||
            [practitioner.firstName, practitioner.lastName].filter(Boolean).join(' ') ||
            'Property practitioner',
        )
      : null;

    return {
      ...space,
      attribution:
        practitioner && practitionerName && relationshipVerified
          ? {
              kind: 'practitioner' as const,
              label: 'Listed by Property Practitioner',
              name: practitionerName,
              ...(practitioner.agencyName ? { agencyName: String(practitioner.agencyName) } : {}),
            }
          : { kind: 'owner' as const, label: 'Listed by owner' },
      trust: {
        phoneVerified: phoneVerifiedOwners.has(space.ownerUserId),
        relationshipVerified,
        propertyVerified: verifiedRungs.has('property'),
      },
    };
  });
}

function stripInternalPublicFields(
  space: InternalPublicSharedLivingSpace,
): PublicSharedLivingSpace {
  const { ownerUserId: _ownerUserId, ...publicSpace } = space;
  return publicSpace;
}
