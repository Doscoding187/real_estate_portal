import type { SearchCardResult } from '../../shared/types';
import type {
  PublicDevelopmentSearchItem,
  PublicDevelopmentSearchUnit,
} from '../../shared/publicDevelopmentSearch';

/** A unit type row as returned by the search service when unit sizes are requested. */
export type PublicDevelopmentSearchUnitWithSize = PublicDevelopmentSearchUnit & {
  unitSize?: number | null;
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
    priceFrom: number;
    availableUnits: number | null;
  };
};

export interface DevelopmentUnitTypeCardOptions {
  listingType: 'sale' | 'rent';
  requirePhoto?: boolean;
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
 * availabilityState 'available'; unpriced unit types, other transaction types
 * and, when requirePhoto is set, developments without an image yield no card.
 * Prices are already transaction-aware in the projection (basePriceFrom for
 * sale, monthlyRentFrom for rent).
 */
export function developmentUnitTypeCards(
  item: PublicDevelopmentSearchItem,
  options: DevelopmentUnitTypeCardOptions,
): DevelopmentUnitTypeCard[] {
  const expected = options.listingType === 'rent' ? 'for_rent' : 'for_sale';
  if (item.transactionType !== expected) return [];
  const firstImage = item.images[0] ?? '';
  if (options.requirePhoto && !firstImage) return [];

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
      image: firstImage,
      images: item.images.map(url => ({ url })),
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
      imageCount: item.images.length,
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
        priceFrom: price,
        availableUnits: unit.availableUnits ?? null,
      },
    });
  }
  return cards;
}

export interface MixListingsAndUnitTypesOptions {
  limit: number;
  maxPerDevelopment: number;
  maxUnitTypesWhenListingsAtLeast6: number;
}

/**
 * Mix ordinary listings with development unit-type cards for the Trending rail.
 * - at most maxPerDevelopment unit types per development;
 * - when 6 or more listings exist, at most maxUnitTypesWhenListingsAtLeast6
 *   unit types; with fewer listings the rail may be mostly unit types;
 * - listings keep their given order, unit types keep theirs, and unit types are
 *   spread evenly through the result instead of piling at the end.
 */
export function mixListingsAndUnitTypes<L, U extends { developmentId?: number }>(
  listings: readonly L[],
  unitTypes: readonly U[],
  options: MixListingsAndUnitTypesOptions,
): Array<L | U> {
  const limit = Math.max(0, Math.floor(options.limit));
  const perDevelopment = new Map<number | undefined, number>();
  const eligible: U[] = [];
  for (const unit of unitTypes) {
    const used = perDevelopment.get(unit.developmentId) ?? 0;
    if (used >= options.maxPerDevelopment) continue;
    perDevelopment.set(unit.developmentId, used + 1);
    eligible.push(unit);
  }

  let unitCount: number;
  let listingCount: number;
  if (listings.length >= 6) {
    unitCount = Math.min(eligible.length, options.maxUnitTypesWhenListingsAtLeast6, limit);
    listingCount = Math.min(listings.length, limit - unitCount);
  } else {
    listingCount = Math.min(listings.length, limit);
    unitCount = Math.min(eligible.length, limit - listingCount);
  }

  const total = listingCount + unitCount;
  const mixed: Array<L | U> = [];
  let listingIndex = 0;
  let unitIndex = 0;
  for (let slot = 0; slot < total; slot++) {
    const takeUnit =
      Math.floor(((slot + 1) * unitCount) / total) > Math.floor((slot * unitCount) / total);
    if (takeUnit && unitIndex < unitCount) mixed.push(eligible[unitIndex++]);
    else if (listingIndex < listingCount) mixed.push(listings[listingIndex++]);
    else mixed.push(eligible[unitIndex++]);
  }
  return mixed;
}
