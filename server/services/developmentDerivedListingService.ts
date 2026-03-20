import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { getDb } from '../db-connection';
import { developerBrandProfiles, developers, developments, unitTypes } from '../../drizzle/schema';
import type {
  DevelopmentDerivedListing,
  DevelopmentDerivedListingSearchResults,
  Property,
  SortOption,
} from '../../shared/types';

interface DevelopmentDerivedListingFilters {
  province?: string;
  city?: string;
  suburb?: string[];
  propertyType?: Property['propertyType'][];
  listingType?: Property['listingType'];
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
}

function parseJsonArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value !== 'string') return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === 'string') {
      const parsedTwice = JSON.parse(parsed);
      return Array.isArray(parsedTwice) ? parsedTwice : [];
    }
  } catch {
    return [];
  }

  return [];
}

function parseBaseMedia(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value !== 'string') return {};

  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'string') {
      const parsedTwice = JSON.parse(parsed);
      return parsedTwice && typeof parsedTwice === 'object' && !Array.isArray(parsedTwice)
        ? parsedTwice
        : {};
    }
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, any>)
      : {};
  } catch {
    return {};
  }
}

function toNumberOrNull(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toNumberOrZero(value: unknown): number {
  return toNumberOrNull(value) ?? 0;
}

function mapStructuralTypeToPropertyType(
  structuralType: unknown,
  developmentType: unknown,
): Property['propertyType'] {
  const structural = String(structuralType || '').toLowerCase();
  const devType = String(developmentType || '').toLowerCase();

  if (devType === 'land' || structural.includes('plot')) return 'plot';
  if (devType === 'commercial' || structural.includes('office')) return 'commercial';
  if (structural.includes('house')) return 'house';
  if (structural.includes('townhouse') || structural.includes('simplex') || structural.includes('duplex')) {
    return 'townhouse';
  }
  return 'apartment';
}

function mapTransactionTypeToListingType(transactionType: unknown): Property['listingType'] {
  const transaction = String(transactionType || '').toLowerCase();
  return transaction === 'for_rent' ? 'rent' : 'sale';
}

function getPrimaryImage(unitBaseMedia: unknown, developmentImages: unknown): string | null {
  const baseMedia = parseBaseMedia(unitBaseMedia);
  const gallery = Array.isArray(baseMedia.gallery) ? baseMedia.gallery : [];
  const unitPrimary = gallery.find((item: any) => item?.url || item?.imageUrl);
  if (unitPrimary?.url || unitPrimary?.imageUrl) {
    return String(unitPrimary.url || unitPrimary.imageUrl);
  }

  const parsedDevelopmentImages = parseJsonArray(developmentImages);
  const devPrimary = parsedDevelopmentImages.find((item: any) => item?.url || item?.imageUrl);
  if (devPrimary?.url || devPrimary?.imageUrl) {
    return String(devPrimary.url || devPrimary.imageUrl);
  }

  return null;
}

function deriveStageBadge(row: any): string | null {
  const legacyStatus = String(row.legacyStatus || '').toLowerCase();
  const constructionPhase = String(row.constructionPhase || '').toLowerCase();
  const status = String(row.status || '').toLowerCase();

  if (
    legacyStatus === 'pre_launch' ||
    legacyStatus === 'launching-soon' ||
    legacyStatus === 'coming_soon' ||
    status === 'launching-soon'
  ) {
    return 'Off-plan';
  }

  if (legacyStatus === 'under_construction' || constructionPhase === 'under_construction') {
    return 'Under Construction';
  }

  if (
    legacyStatus === 'completed' ||
    legacyStatus === 'phase-completed' ||
    constructionPhase === 'completed' ||
    constructionPhase === 'phase_completed'
  ) {
    return 'Recently Completed';
  }

  if (legacyStatus === 'ready' || legacyStatus === 'ready-to-move') {
    return 'Ready to Move In';
  }

  return null;
}

function buildListingTitle(row: any, propertyType: Property['propertyType']): string {
  const bedrooms = Number(row.bedrooms || 0);
  const unitName = String(row.unitName || '').trim();
  const suburb = String(row.suburb || row.city || '').trim();
  const listingType = mapTransactionTypeToListingType(row.transactionType);
  const action = listingType === 'rent' ? 'to Rent' : 'for Sale';
  const propertyLabel =
    propertyType === 'plot'
      ? 'Plot'
      : propertyType === 'commercial'
        ? 'Commercial Space'
        : propertyType === 'townhouse'
          ? 'Townhouse'
          : propertyType === 'house'
            ? 'House'
            : 'Apartment';

  if (unitName) {
    return `${unitName} ${action} in ${suburb}`.trim();
  }

  if (bedrooms > 0) {
    return `${bedrooms} Bedroom ${propertyLabel} ${action} in ${suburb}`.trim();
  }

  return `${propertyLabel} ${action} in ${suburb}`.trim();
}

function buildSort(sortOption: SortOption) {
  switch (sortOption) {
    case 'price_asc':
      return (a: DevelopmentDerivedListing, b: DevelopmentDerivedListing) => a.price - b.price;
    case 'price_desc':
      return (a: DevelopmentDerivedListing, b: DevelopmentDerivedListing) => b.price - a.price;
    case 'suburb_asc':
      return (a: DevelopmentDerivedListing, b: DevelopmentDerivedListing) =>
        a.suburb.localeCompare(b.suburb);
    case 'suburb_desc':
      return (a: DevelopmentDerivedListing, b: DevelopmentDerivedListing) =>
        b.suburb.localeCompare(a.suburb);
    case 'date_asc':
      return (a: DevelopmentDerivedListing, b: DevelopmentDerivedListing) =>
        new Date(a.listedDate).getTime() - new Date(b.listedDate).getTime();
    case 'date_desc':
    default:
      return (a: DevelopmentDerivedListing, b: DevelopmentDerivedListing) =>
        new Date(b.listedDate).getTime() - new Date(a.listedDate).getTime();
  }
}

export class DevelopmentDerivedListingService {
  async searchListings(
    filters: DevelopmentDerivedListingFilters,
    sortOption: SortOption = 'date_desc',
    page: number = 1,
    pageSize: number = 12,
  ): Promise<DevelopmentDerivedListingSearchResults> {
    const db = await getDb();
    if (!db) {
      return { items: [], total: 0, page, pageSize, hasMore: false };
    }

    const conditions = [
      eq(developments.isPublished, 1),
      eq(developments.approvalStatus, 'approved'),
      eq(unitTypes.isActive, 1),
    ];

    if (filters.province) conditions.push(eq(developments.province, filters.province));
    if (filters.city) conditions.push(eq(developments.city, filters.city));
    if (filters.suburb?.length) conditions.push(inArray(developments.suburb, filters.suburb));

    const targetTransactionType =
      filters.listingType === 'rent' ? 'for_rent' : filters.listingType === 'sale' ? 'for_sale' : null;
    if (targetTransactionType) {
      conditions.push(eq(developments.transactionType, targetTransactionType as any));
    }

    const rows = await db
      .select({
        developmentId: developments.id,
        developmentName: developments.name,
        developmentSlug: developments.slug,
        developmentStatus: developments.status,
        developmentType: developments.developmentType,
        transactionType: developments.transactionType,
        city: developments.city,
        suburb: developments.suburb,
        province: developments.province,
        completionDate: developments.completionDate,
        legacyStatus: developments.legacyStatus,
        constructionPhase: developments.constructionPhase,
        developmentImages: developments.images,
        developmentCreatedAt: developments.createdAt,
        developerId: developments.developerId,
        developerBrandProfileId: developments.developerBrandProfileId,
        developerName: developers.name,
        developerLogo: developers.logo,
        brandName: developerBrandProfiles.brandName,
        brandSlug: developerBrandProfiles.slug,
        brandLogoUrl: developerBrandProfiles.logoUrl,
        brandPublicContactEmail: developerBrandProfiles.publicContactEmail,
        unitTypeId: unitTypes.id,
        unitName: unitTypes.name,
        structuralType: unitTypes.structuralType,
        bedrooms: unitTypes.bedrooms,
        bathrooms: unitTypes.bathrooms,
        unitSize: unitTypes.unitSize,
        yardSize: unitTypes.yardSize,
        priceFrom: unitTypes.priceFrom,
        priceTo: unitTypes.priceTo,
        basePriceFrom: unitTypes.basePriceFrom,
        basePriceTo: unitTypes.basePriceTo,
        monthlyRentFrom: unitTypes.monthlyRentFrom,
        monthlyRentTo: unitTypes.monthlyRentTo,
        startingBid: unitTypes.startingBid,
        auctionStatus: unitTypes.auctionStatus,
        availableUnits: unitTypes.availableUnits,
        totalUnits: unitTypes.totalUnits,
        unitBaseMedia: unitTypes.baseMedia,
        unitCreatedAt: unitTypes.createdAt,
      })
      .from(unitTypes)
      .innerJoin(developments, eq(unitTypes.developmentId, developments.id))
      .leftJoin(developers, eq(developments.developerId, developers.id))
      .leftJoin(
        developerBrandProfiles,
        eq(developments.developerBrandProfileId, developerBrandProfiles.id),
      )
      .where(and(...conditions))
      .orderBy(desc(developments.createdAt), asc(unitTypes.displayOrder));

    const mapped = rows
      .map(row => {
        const propertyType = mapStructuralTypeToPropertyType(
          row.structuralType,
          row.developmentType,
        );
        if (filters.propertyType?.length && !filters.propertyType.includes(propertyType)) {
          return null;
        }

        const listingType = mapTransactionTypeToListingType(row.transactionType);
        const price =
          listingType === 'rent'
            ? toNumberOrZero(row.monthlyRentFrom)
            : row.transactionType === 'auction'
              ? toNumberOrZero(row.startingBid)
              : toNumberOrZero(row.priceFrom ?? row.basePriceFrom);
        const priceTo =
          listingType === 'rent'
            ? toNumberOrNull(row.monthlyRentTo)
            : row.transactionType === 'auction'
              ? null
              : toNumberOrNull(row.priceTo ?? row.basePriceTo);

        if (filters.minPrice && price < filters.minPrice) return null;
        if (filters.maxPrice && price > filters.maxPrice) return null;

        const bedrooms = toNumberOrNull(row.bedrooms) ?? undefined;
        const bathrooms = toNumberOrNull(row.bathrooms) ?? undefined;
        if (filters.minBedrooms && (bedrooms ?? 0) < filters.minBedrooms) return null;
        if (filters.maxBedrooms && (bedrooms ?? 0) > filters.maxBedrooms) return null;
        if (filters.minBathrooms && (bathrooms ?? 0) < filters.minBathrooms) return null;

        const image = getPrimaryImage(row.unitBaseMedia, row.developmentImages);
        const stageBadge = deriveStageBadge({
          legacyStatus: row.legacyStatus,
          constructionPhase: row.constructionPhase,
          status: row.developmentStatus,
        });
        const title = buildListingTitle(row, propertyType);

        return {
          id: `dev-${row.developmentId}-${row.unitTypeId}`,
          unitTypeId: String(row.unitTypeId),
          developmentId: Number(row.developmentId),
          title,
          price,
          priceTo: priceTo ?? undefined,
          city: row.city,
          suburb: row.suburb || row.city,
          province: row.province,
          propertyType,
          listingType,
          transactionType: String(row.transactionType || 'for_sale') as
            | 'for_sale'
            | 'for_rent'
            | 'auction',
          listingSource: 'development' as const,
          bedrooms,
          bathrooms,
          floorSize: toNumberOrNull(row.unitSize) ?? undefined,
          erfSize: toNumberOrNull(row.yardSize) ?? undefined,
          image,
          images: image ? [{ url: image, thumbnailUrl: image }] : [],
          badges: [stageBadge, `Part of ${row.developmentName}`].filter(Boolean) as string[],
          availableUnits: toNumberOrNull(row.availableUnits) ?? undefined,
          completionDate: row.completionDate || null,
          listedDate: new Date(row.unitCreatedAt || row.developmentCreatedAt || new Date()),
          development: {
            id: Number(row.developmentId),
            name: row.developmentName,
            slug: row.developmentSlug || null,
            status: row.developmentStatus || null,
          },
          developerBrand: {
            id: row.developerBrandProfileId ? Number(row.developerBrandProfileId) : null,
            brandName: row.brandName || row.developerName || 'Developer',
            slug: row.brandSlug || null,
            logoUrl: row.brandLogoUrl || row.developerLogo || null,
            publicContactEmail: row.brandPublicContactEmail || null,
          },
        } satisfies DevelopmentDerivedListing;
      })
      .filter((item): item is DevelopmentDerivedListing => item !== null);

    mapped.sort(buildSort(sortOption));

    const total = mapped.length;
    const offset = Math.max(0, (page - 1) * pageSize);
    const items = mapped.slice(offset, offset + pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      hasMore: offset + pageSize < total,
    };
  }
}

export const developmentDerivedListingService = new DevelopmentDerivedListingService();
