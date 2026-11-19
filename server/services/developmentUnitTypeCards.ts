import type { SearchCardResult } from '../../shared/types';
import type {
  PublicDevelopmentSearchItem,
  PublicDevelopmentSearchUnit,
} from '../../shared/publicDevelopmentSearch';

/** A unit type row as returned by the search service when unit sizes are requested. */
export type PublicDevelopmentSearchUnitWithSize = PublicDevelopmentSearchUnit & {
  unitSize?: number | null;
  yardSize?: number | null;
  parkingBays?: number | null;
  structuralType?: string | null;
};

/**
 * A development unit type shown as its own result card. It keeps kind
 * 'development' (SearchCardResult cannot take a new kind without a shared/
 * change) and carries a `unitType` sub-object that identifies it.
 */
export type DevelopmentUnitTypeCard = SearchCardResult & {
  unitType: {
    id: string;
    label: string;
    developmentId: number;
    developmentName: string;
    bedrooms: number | null;
    bathrooms: number | null;
    unitSizeM2: number | null;
    /** The unit type's own yard/erf size; null when not recorded. */
    yardSizeM2: number | null;
    /** Parking bays recorded on the unit type; null when not recorded (0 is treated as not recorded). */
    parking: number | null;
    /** The unit row's own structural type (e.g. 'apartment'); null when absent. Not derived from the development. */
    structuralType: string | null;
    priceFrom: number;
    availableUnits: number | null;
  };
};

/** Search filters applied to each unit type by its own public facts (not the development's range). */
export interface DevelopmentUnitTypeFilters {
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  /**
   * A requested property type (apartment, house, townhouse...). A unit type matches only when its
   * own recorded structural type says so; an unrecorded type never matches a type filter.
   */
  propertyType?: string;
}

export interface DevelopmentUnitTypeCardOptions {
  listingType: 'sale' | 'rent';
  requirePhoto?: boolean;
  filters?: DevelopmentUnitTypeFilters;
}

/** Which unit structural types satisfy each public property type filter. */
const STRUCTURAL_TYPES_BY_PROPERTY_TYPE: Record<string, readonly string[]> = {
  apartment: ['apartment', 'penthouse', 'studio'],
  house: ['freestanding-house', 'plot-and-plan'],
  townhouse: ['townhouse', 'simplex', 'duplex'],
  cluster_home: ['townhouse', 'simplex', 'duplex'],
};

function unitMatchesFilters(
  unit: PublicDevelopmentSearchUnitWithSize,
  price: number,
  filters: DevelopmentUnitTypeFilters | undefined,
): boolean {
  if (!filters) return true;
  if (filters.minPrice !== undefined && price < filters.minPrice) return false;
  if (filters.maxPrice !== undefined && price > filters.maxPrice) return false;
  const hasBedFilter = filters.minBedrooms !== undefined || filters.maxBedrooms !== undefined;
  if (hasBedFilter) {
    if (unit.bedrooms === null || unit.bedrooms === undefined) return false;
    if (filters.minBedrooms !== undefined && unit.bedrooms < filters.minBedrooms) return false;
    if (filters.maxBedrooms !== undefined && unit.bedrooms > filters.maxBedrooms) return false;
  }
  if (filters.propertyType && filters.propertyType !== 'plot') {
    const wanted = STRUCTURAL_TYPES_BY_PROPERTY_TYPE[filters.propertyType];
    const own = unit.structuralType ? String(unit.structuralType) : null;
    if (!wanted || !own || !wanted.includes(own)) return false;
  }
  return true;
}

function finitePositive(value: unknown): number | null {
  const parsed = Number(value);
  return value !== null && value !== undefined && Number.isFinite(parsed) && parsed > 0
    ? parsed
    : null;
}

/**
 * One card per available unit type of a development. A unit type is available
 * when the shared projection (the same one the development page reads) states
 * availabilityState 'available'; unpriced unit types and other transaction
 * types yield no card. Unit gallery images are preferred, with the development
 * gallery used only when the unit type has no image. With requirePhoto set, a
 * card needs an image from either gallery.
 * Prices are already transaction-aware in the projection (basePriceFrom for
 * sale, monthlyRentFrom for rent).
 */
export function developmentUnitTypeCards(
  item: PublicDevelopmentSearchItem,
  options: DevelopmentUnitTypeCardOptions,
): DevelopmentUnitTypeCard[] {
  const expected = options.listingType === 'rent' ? 'for_rent' : 'for_sale';
  if (item.transactionType !== expected) return [];

  const location = item.locationLabels.join(', ');
  const publisherRole =
    item.publisher.authorityKind === 'platform_reference' ? 'platform' : 'developer';
  const publisherProvenance =
    item.publisher.authorityKind === 'platform_reference' ? 'platform_curated' : 'developer';
  const cards: DevelopmentUnitTypeCard[] = [];

  for (const unit of item.unitTypes as PublicDevelopmentSearchUnitWithSize[]) {
    if (unit.availabilityState !== 'available') continue;
    const price = finitePositive(unit.priceFrom);
    if (price === null || !unit.id) continue;
    const unitImages = (unit.images ?? [])
      .filter((url): url is string => typeof url === 'string' && Boolean(url.trim()))
      .map(url => url.trim());
    const cardImages = unitImages.length ? unitImages : item.images;
    if (options.requirePhoto && cardImages.length === 0) continue;
    if (!unitMatchesFilters(unit, price, options.filters)) continue;
    const unitSize = finitePositive(unit.unitSize);
    const title =
      unit.bedrooms !== null && unit.bedrooms !== undefined
        ? `${unit.bedrooms}-bed ${unit.label}`
        : unit.label;

    cards.push({
      kind: 'development',
      id: `${item.id}:${unit.id}`,
      href: `${item.canonicalRoute}/unit/${encodeURIComponent(String(unit.id))}`,
      title,
      location,
      city: '',
      suburb: '',
      province: '',
      ...(item.canonicalPlaceId ? { canonicalPlaceId: item.canonicalPlaceId } : {}),
      locationLabels: item.locationLabels,
      price,
      image: cardImages[0] ?? '',
      images: cardImages.map(url => ({ url })),
      bedrooms: unit.bedrooms ?? undefined,
      bathrooms: unit.bathrooms ?? undefined,
      ...(unitSize !== null ? { area: unitSize, internalAreaM2: unitSize } : {}),
      propertyType:
        item.developmentType === 'land'
          ? 'plot'
          : item.developmentType === 'commercial'
            ? 'commercial'
            : 'house',
      listingType: options.listingType,
      listingSource: 'development',
      contactRole: publisherRole,
      identity: {
        role: publisherRole,
        provenance: publisherProvenance,
        name: item.publisher.name,
        organizationName: item.publisher.name,
        organizationLogoUrl: item.publisher.logoUrl,
        cataloguePublisherId: item.publisher.id,
      },
      development: { id: item.id, name: item.name, slug: item.slug },
      developerBrand: {
        id: item.publisher.id,
        brandName: item.publisher.name,
        slug: item.publisher.slug,
        logoUrl: item.publisher.logoUrl ?? undefined,
      },
      highlights: [],
      badges: [item.status],
      imageCount: cardImages.length,
      transactionType: item.transactionType,
      listedDate: item.createdAt ? new Date(item.createdAt) : new Date(0),
      developmentId: item.id,
      unitTypeId: String(unit.id),
      availableUnits: unit.availableUnits ?? undefined,
      totalUnits: unit.totalUnits ?? undefined,
      unitType: {
        id: String(unit.id),
        label: unit.label,
        developmentId: item.id,
        developmentName: item.name,
        bedrooms: unit.bedrooms ?? null,
        bathrooms: unit.bathrooms ?? null,
        unitSizeM2: unitSize,
        yardSizeM2: finitePositive(unit.yardSize),
        parking: finitePositive(unit.parkingBays),
        structuralType: unit.structuralType ? String(unit.structuralType) : null,
        priceFrom: price,
        availableUnits: unit.availableUnits ?? null,
      },
    });
  }
  return cards;
}

export interface MixListingsAndUnitTypesOptions {
  limit: number;
}

/**
 * Mix ordinary listings with development unit-type cards for the Trending rail.
 * The rail limit is the only card cap. When both sources have more results than
 * fit, allocate slots in proportion to the eligible source counts, while
 * retaining each source's order and spreading unit types through the result.
 */
export function mixListingsAndUnitTypes<L, U>(
  listings: readonly L[],
  unitTypes: readonly U[],
  options: MixListingsAndUnitTypesOptions,
): Array<L | U> {
  const limit = Math.max(0, Math.floor(options.limit));
  const eligibleCount = listings.length + unitTypes.length;
  let unitCount = Math.min(unitTypes.length, limit);
  let listingCount = Math.min(listings.length, limit - unitCount);

  if (eligibleCount > limit && listings.length > 0 && unitTypes.length > 0 && limit > 1) {
    unitCount = Math.max(
      1,
      Math.min(limit - 1, unitTypes.length, Math.round((limit * unitTypes.length) / eligibleCount)),
    );
    listingCount = Math.min(listings.length, limit - unitCount);
    if (listingCount < limit - unitCount) {
      unitCount = Math.min(unitTypes.length, limit - listingCount);
    }
  }

  const total = listingCount + unitCount;
  const mixed: Array<L | U> = [];
  let listingIndex = 0;
  let unitIndex = 0;
  for (let slot = 0; slot < total; slot++) {
    const takeUnit =
      Math.floor(((slot + 1) * unitCount) / total) > Math.floor((slot * unitCount) / total);
    if (takeUnit && unitIndex < unitCount) mixed.push(unitTypes[unitIndex++]);
    else if (listingIndex < listingCount) mixed.push(listings[listingIndex++]);
    else mixed.push(unitTypes[unitIndex++]);
  }
  return mixed;
}
