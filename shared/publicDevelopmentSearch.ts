import type { SearchResultSortOption } from './transactionalSearchState';

export const PUBLIC_DEVELOPMENT_SEARCH_AVAILABILITY = ['available', 'sold_out'] as const;
export type PublicDevelopmentSearchAvailability =
  (typeof PUBLIC_DEVELOPMENT_SEARCH_AVAILABILITY)[number];

export type PublicDevelopmentSearchDevelopmentType =
  | 'residential'
  | 'commercial'
  | 'mixed_use'
  | 'land';

export type PublicDevelopmentSearchStatus = 'launching-soon' | 'selling' | 'sold-out';

export type PublicDevelopmentSearchAvailabilityState = 'available' | 'sold_out' | 'not_stated';

export interface PublicDevelopmentSearchUnit {
  id?: string | null;
  label: string;
  bedrooms: number | null;
  bathrooms: number | null;
  priceFrom: number | null;
  priceTo: number | null;
  availableUnits: number | null;
  totalUnits: number | null;
  availabilityState: PublicDevelopmentSearchAvailabilityState;
}

export interface PublicDevelopmentSearchPublisher {
  id: number;
  name: string;
  logoUrl: string | null;
  authorityKind: 'platform_reference' | 'developer_first_party';
  slug?: string | null;
  websiteUrl?: string | null;
  description?: string | null;
  sourceAttribution?: string | null;
  lastVerifiedAt?: string | null;
  foundedYear?: number | null;
  headOfficeLocation?: string | null;
}

export interface PublicDevelopmentSearchItem {
  id: number;
  name: string;
  slug: string | null;
  canonicalRoute: string;
  description: string | null;
  images: string[];
  city: string;
  suburb: string | null;
  province: string;
  developmentType: PublicDevelopmentSearchDevelopmentType;
  transactionType: 'for_sale' | 'for_rent';
  status: PublicDevelopmentSearchStatus;
  nature: 'new' | 'phase' | 'extension' | 'redevelopment';
  completionDate: string | null;
  createdAt: string | null;
  isFeatured: boolean;
  rating: number | null;
  highlights: string[];
  publisher: PublicDevelopmentSearchPublisher;
  priceFrom: number | null;
  priceTo: number | null;
  bedroomRange: { min: number | null; max: number | null };
  unitTypes: PublicDevelopmentSearchUnit[];
  unitTypeCount: number;
  availableUnitTypeCount: number;
  availableUnits: number | null;
  totalUnits: number | null;
  availabilityState: PublicDevelopmentSearchAvailabilityState;
}

export interface PublicDevelopmentDetailUnit extends PublicDevelopmentSearchUnit {
  name: string;
  developmentId: number;
  publicFacts: PublicDevelopmentSearchUnit;
  basePriceFrom: number | string | null;
  basePriceTo: number | string | null;
  monthlyRentFrom: number | string | null;
  monthlyRentTo: number | string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  totalUnits: number | null;
  availableUnits: number | null;
  reservedUnits: number | null;
  [key: string]: unknown;
}

export interface PublicDevelopmentDetail extends PublicDevelopmentSearchItem {
  publicFacts: PublicDevelopmentSearchItem;
  address: string | null;
  showHouseAddress: boolean;
  locationId: number | null;
  latitude: string | null;
  longitude: string | null;
  gpsAccuracy: 'accurate' | 'approximate' | null;
  videos: unknown[];
  floorPlans: unknown[];
  brochures: unknown[];
  amenities: string[];
  estateSpecs: unknown;
  ownershipType: string | null;
  structuralType: string | null;
  floors: number | null;
  marketingRole: 'exclusive' | 'joint' | 'open' | null;
  launchDate: string | null;
  isPublished: number;
  approvalStatus: 'draft' | 'pending' | 'approved' | 'rejected' | null;
  cataloguePublisherId: number;
  /**
   * Number of publicly eligible developments published by this developer
   * organisation (including this one). Null when no governed publisher
   * identity resolves. This is the development → Developer Digital Presence
   * portfolio bridge; compute it only from the public eligibility authority.
   */
  publisherPublishedDevelopmentCount: number | null;
  unitTypes: PublicDevelopmentDetailUnit[];
  salesMetrics: {
    totalUnits: number;
    availableUnits: number;
    reservedUnits: number;
    soldUnits: number;
    soldPct: number | null;
  } | null;
}

/**
 * Raw fields accepted by the one public development fact projection.
 *
 * This type deliberately contains both sale and rental unit authorities. The
 * projection selects the fields that match the development transaction rather
 * than allowing a consumer to choose a legacy price column.
 */
export interface PublicDevelopmentProjectionDevelopment {
  id: number | string;
  name: string;
  slug: string | null;
  description: string | null;
  images: unknown;
  city: string;
  suburb: string | null;
  province: string;
  developmentType: PublicDevelopmentSearchDevelopmentType;
  transactionType: 'for_sale' | 'for_rent' | 'auction';
  status: PublicDevelopmentSearchStatus;
  nature: 'new' | 'phase' | 'extension' | 'redevelopment';
  launchDate?: string | null;
  completionDate: string | null;
  createdAt: string | null;
  isFeatured: unknown;
  rating: unknown;
  highlights: unknown;
  canonicalRoute: string;
  cataloguePublisherId: number | null;
  publisherName: string | null;
  publisherLogoUrl: string | null;
  publisherAuthorityKind: 'platform_reference' | 'developer_first_party' | null;
  publisherSlug?: string | null;
  publisherWebsiteUrl?: string | null;
  publisherDescription?: string | null;
  publisherSourceAttribution?: string | null;
  publisherLastVerifiedAt?: string | null;
  publisherFoundedYear?: number | null;
  publisherHeadOfficeLocation?: string | null;
}

export interface PublicDevelopmentProjectionUnit {
  id: string;
  developmentId?: number | string;
  name: string;
  label?: string | null;
  bedrooms: unknown;
  bathrooms: unknown;
  basePriceFrom?: unknown;
  basePriceTo?: unknown;
  monthlyRentFrom?: unknown;
  monthlyRentTo?: unknown;
  totalUnits?: unknown;
  availableUnits?: unknown;
  reservedUnits?: unknown;
}

function projectionFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function projectionJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === 'string') {
      const parsedAgain = JSON.parse(parsed);
      return Array.isArray(parsedAgain) ? parsedAgain : [];
    }
  } catch {
    return [];
  }

  return [];
}

function projectionImages(value: unknown): string[] {
  return projectionJsonArray(value)
    .map(item => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && 'url' in item) {
        return String((item as { url?: unknown }).url || '');
      }
      return '';
    })
    .map(item => item.trim())
    .filter(Boolean);
}

function projectionHighlights(value: unknown): string[] {
  return projectionJsonArray(value)
    .map(item => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const candidate = item as { label?: unknown; name?: unknown; title?: unknown };
        return String(candidate.label || candidate.name || candidate.title || '');
      }
      return '';
    })
    .map(item => item.trim())
    .filter(Boolean);
}

/**
 * Project one development and its active unit types into public consumer
 * facts. Search summaries and detail reads must both call this function.
 */
export function projectPublicDevelopmentFacts(
  development: PublicDevelopmentProjectionDevelopment,
  units: readonly PublicDevelopmentProjectionUnit[],
): PublicDevelopmentSearchItem | null {
  if (development.transactionType !== 'for_sale' && development.transactionType !== 'for_rent') {
    return null;
  }

  const publisherName = String(development.publisherName || '').trim();
  if (!development.cataloguePublisherId || !publisherName) return null;
  if (
    development.publisherAuthorityKind !== 'platform_reference' &&
    development.publisherAuthorityKind !== 'developer_first_party'
  ) {
    return null;
  }
  const publisherAuthorityKind = development.publisherAuthorityKind;

  const projectedUnits = units.map(unit => {
    const priceFromValue =
      development.transactionType === 'for_rent' ? unit.monthlyRentFrom : unit.basePriceFrom;
    const priceToValue =
      development.transactionType === 'for_rent' ? unit.monthlyRentTo : unit.basePriceTo;
    const priceFromNumber = projectionFiniteNumber(priceFromValue);
    const priceToNumber = projectionFiniteNumber(priceToValue);
    const priceFrom = priceFromNumber !== null && priceFromNumber > 0 ? priceFromNumber : null;
    const priceTo = priceToNumber !== null && priceToNumber > 0 ? priceToNumber : priceFrom;

    const totalRaw = projectionFiniteNumber(unit.totalUnits);
    const availableRaw = projectionFiniteNumber(unit.availableUnits);
    const reservedRaw = projectionFiniteNumber(unit.reservedUnits);
    const inventoryKnown = totalRaw !== null && availableRaw !== null;
    const totalUnits = totalRaw === null ? null : Math.round(Math.max(0, totalRaw));
    const reservedUnits =
      totalUnits === null ? null : Math.min(Math.round(Math.max(0, reservedRaw ?? 0)), totalUnits);
    const availableUnits =
      availableRaw === null || totalUnits === null
        ? null
        : Math.min(
            Math.round(Math.max(0, availableRaw)),
            Math.max(totalUnits - (reservedUnits ?? 0), 0),
          );

    const bedrooms = projectionFiniteNumber(unit.bedrooms);
    const bathrooms = projectionFiniteNumber(unit.bathrooms);

    return {
      id: unit.id,
      label: String(unit.name || unit.label || '').trim() || 'Unit type',
      bedrooms,
      bathrooms,
      priceFrom,
      priceTo,
      availableUnits,
      totalUnits,
      availabilityState: !inventoryKnown
        ? ('not_stated' as const)
        : availableUnits !== null && availableUnits > 0
          ? ('available' as const)
          : ('sold_out' as const),
      __inventoryKnown: inventoryKnown,
    };
  });

  const publicUnits = projectedUnits.map(({ __inventoryKnown: _inventoryKnown, ...unit }) => unit);
  const pricedUnits = publicUnits.filter(unit => unit.priceFrom !== null && unit.priceFrom > 0);
  const bedroomValues = publicUnits
    .map(unit => unit.bedrooms)
    .filter((value): value is number => value !== null && value >= 0);
  const inventoryKnown =
    projectedUnits.length > 0 && projectedUnits.every(unit => unit.__inventoryKnown);
  const availableUnits = inventoryKnown
    ? projectedUnits.reduce((sum, unit) => sum + (unit.availableUnits ?? 0), 0)
    : null;
  const totalUnits = inventoryKnown
    ? projectedUnits.reduce((sum, unit) => sum + (unit.totalUnits ?? 0), 0)
    : null;
  const availabilityState =
    development.developmentType === 'land' && publicUnits.length === 0
      ? ('not_stated' as const)
      : availableUnits !== null && availableUnits > 0
        ? ('available' as const)
        : inventoryKnown
          ? ('sold_out' as const)
          : ('not_stated' as const);

  return {
    id: Number(development.id),
    name: development.name,
    slug: development.slug,
    canonicalRoute: development.canonicalRoute,
    description: development.description,
    images: projectionImages(development.images),
    city: development.city,
    suburb: development.suburb,
    province: development.province,
    developmentType: development.developmentType,
    transactionType: development.transactionType,
    status: development.status,
    nature: development.nature,
    completionDate: development.completionDate,
    createdAt: development.createdAt,
    isFeatured: Number(development.isFeatured || 0) === 1,
    rating: projectionFiniteNumber(development.rating),
    highlights: projectionHighlights(development.highlights),
    publisher: {
      id: Number(development.cataloguePublisherId),
      name: publisherName,
      logoUrl: development.publisherLogoUrl?.trim() || null,
      authorityKind: publisherAuthorityKind,
      slug: development.publisherSlug?.trim() || null,
      websiteUrl: development.publisherWebsiteUrl?.trim() || null,
      description: development.publisherDescription?.trim() || null,
      sourceAttribution: development.publisherSourceAttribution?.trim() || null,
      lastVerifiedAt: development.publisherLastVerifiedAt || null,
      foundedYear: development.publisherFoundedYear ?? null,
      headOfficeLocation: development.publisherHeadOfficeLocation?.trim() || null,
    },
    priceFrom: pricedUnits.length ? Math.min(...pricedUnits.map(unit => unit.priceFrom!)) : null,
    priceTo: pricedUnits.length
      ? Math.max(...pricedUnits.map(unit => unit.priceTo ?? unit.priceFrom!))
      : null,
    bedroomRange: {
      min: bedroomValues.length ? Math.min(...bedroomValues) : null,
      max: bedroomValues.length ? Math.max(...bedroomValues) : null,
    },
    unitTypes: publicUnits,
    unitTypeCount: publicUnits.length,
    availableUnitTypeCount: publicUnits.filter(
      unit => unit.availableUnits !== null && unit.availableUnits > 0,
    ).length,
    availableUnits: publicUnits.length && inventoryKnown ? availableUnits : null,
    totalUnits: publicUnits.length && inventoryKnown ? totalUnits : null,
    availabilityState,
  };
}

export interface PublicDevelopmentSearchFilters {
  developmentType?: PublicDevelopmentSearchDevelopmentType;
  developmentStatus?: PublicDevelopmentSearchStatus;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  availability?: PublicDevelopmentSearchAvailability;
}

function hasFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function matchesBedroomFilter(
  item: PublicDevelopmentSearchItem,
  minBedrooms?: number,
  maxBedrooms?: number,
): boolean {
  if (minBedrooms === undefined && maxBedrooms === undefined) return true;

  return item.unitTypes.some(unit => {
    if (!hasFiniteNumber(unit.bedrooms)) return false;
    if (minBedrooms !== undefined && unit.bedrooms < minBedrooms) return false;
    if (maxBedrooms !== undefined && unit.bedrooms > maxBedrooms) return false;
    return true;
  });
}

export function matchesPublicDevelopmentSearchFilters(
  item: PublicDevelopmentSearchItem,
  filters: PublicDevelopmentSearchFilters,
): boolean {
  if (filters.developmentType && item.developmentType !== filters.developmentType) return false;
  if (filters.developmentStatus && item.status !== filters.developmentStatus) return false;

  if (filters.minPrice !== undefined) {
    if (item.priceFrom === null || item.priceFrom < filters.minPrice) return false;
  }
  if (filters.maxPrice !== undefined) {
    if (item.priceFrom === null || item.priceFrom > filters.maxPrice) return false;
  }

  if (!matchesBedroomFilter(item, filters.minBedrooms, filters.maxBedrooms)) return false;

  if (filters.availability && item.availabilityState !== filters.availability) return false;

  return true;
}

export function filterPublicDevelopmentSearchItems(
  items: readonly PublicDevelopmentSearchItem[],
  filters: PublicDevelopmentSearchFilters,
): PublicDevelopmentSearchItem[] {
  return items.filter(item => matchesPublicDevelopmentSearchFilters(item, filters));
}

/**
 * Developments without a published unit price can never satisfy a price
 * filter. They are excluded like any non-match, but hiding them silently
 * would misrepresent the catalogue: this count lets the consumer journey say
 * "N developments without published pricing are hidden by your price filter."
 */
export function countUnpricedHiddenByPriceFilter(
  items: readonly PublicDevelopmentSearchItem[],
  filters: PublicDevelopmentSearchFilters,
): number {
  if (filters.minPrice === undefined && filters.maxPrice === undefined) return 0;
  return items.filter(item => {
    if (item.priceFrom !== null) return false;
    // Only count items that would otherwise still be in the running: every
    // other active filter must already be satisfied.
    const withoutPrice: PublicDevelopmentSearchFilters = { ...filters };
    delete withoutPrice.minPrice;
    delete withoutPrice.maxPrice;
    return matchesPublicDevelopmentSearchFilters(item, withoutPrice);
  }).length;
}

function compareNullableNumbers(
  left: number | null,
  right: number | null,
  direction: 'asc' | 'desc',
): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return direction === 'asc' ? left - right : right - left;
}

function timestamp(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareStableId(left: PublicDevelopmentSearchItem, right: PublicDevelopmentSearchItem) {
  return right.id - left.id;
}

export function sortPublicDevelopmentSearchItems(
  items: readonly PublicDevelopmentSearchItem[],
  sortOption: SearchResultSortOption,
): PublicDevelopmentSearchItem[] {
  return [...items].sort((left, right) => {
    if (sortOption === 'price_asc') {
      return (
        compareNullableNumbers(left.priceFrom, right.priceFrom, 'asc') ||
        compareStableId(left, right)
      );
    }

    if (sortOption === 'price_desc') {
      return (
        compareNullableNumbers(left.priceFrom, right.priceFrom, 'desc') ||
        compareStableId(left, right)
      );
    }

    if (sortOption === 'date_asc') {
      return timestamp(left.createdAt) - timestamp(right.createdAt) || compareStableId(left, right);
    }

    if (sortOption === 'date_desc') {
      return timestamp(right.createdAt) - timestamp(left.createdAt) || compareStableId(left, right);
    }

    return (
      Number(right.isFeatured) - Number(left.isFeatured) ||
      Number(right.availabilityState === 'available') -
        Number(left.availabilityState === 'available') ||
      timestamp(right.createdAt) - timestamp(left.createdAt) ||
      compareStableId(left, right)
    );
  });
}

export function paginatePublicDevelopmentSearchItems(
  items: readonly PublicDevelopmentSearchItem[],
  page: number,
  pageSize: number,
) {
  const total = items.length;
  const safePage = Math.max(0, Math.floor(page));
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const start = safePage * safePageSize;

  return {
    items: items.slice(start, start + safePageSize),
    total,
    page: safePage,
    pageSize: safePageSize,
    hasMore: start + safePageSize < total,
  };
}
