import { and, asc, desc, eq, gt, inArray, ne, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db-connection';
import {
  cataloguePublishers,
  developerOrganisations,
  developments,
  unitTypes,
} from '../../drizzle/schema';
import { isPlaceId } from '../../drizzle/schema/placeAuthority';
import type {
  DevelopmentDerivedListing,
  DevelopmentDerivedListingSearchResults,
  Property,
  SearchCardResult,
  SortOption,
} from '../../shared/types';
import { publicDevelopmentEligibilityConditions } from './publicDevelopmentEligibility';
import {
  listDevelopmentIdsForCanonicalPlace,
  listDevelopmentPlaceGeography,
} from './developmentPlaceAssignmentService';
import { buildDevelopmentCardHighlights } from '../../shared/listing-highlight-registry';
import { hasHomePropertyPhoto } from '../../shared/homePropertyPhoto';

interface DevelopmentDerivedListingFilters {
  /** Homepage units must have their own representative photos and available stock. */
  requireUnitPhoto?: boolean;
  requireAvailableStock?: boolean;
  canonicalPlaceId: string;
  bounds?: {
    south: number;
    north: number;
    west: number;
    east: number;
  };
  propertyType?: Property['propertyType'][];
  listingType?: Property['listingType'];
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minArea?: number;
  maxArea?: number;
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

function parseJsonStringArray(value: unknown): string[] {
  const labelsFromArray = (items: unknown[]): string[] =>
    items
      .flatMap(item => {
        if (typeof item === 'string') return [item];
        if (item && typeof item === 'object') {
          const candidateObject = item as Record<string, unknown>;
          return [
            candidateObject.label,
            candidateObject.name,
            candidateObject.title,
            candidateObject.value,
          ]
            .filter(candidate => typeof candidate === 'string' && candidate.trim().length > 0)
            .map(candidate => String(candidate));
        }
        return [];
      })
      .map(item => String(item || '').trim())
      .filter(Boolean);

  if (Array.isArray(value)) {
    return labelsFromArray(value);
  }

  if (value && typeof value === 'object') {
    return flattenFeatureCollections(value);
  }

  if (typeof value !== 'string') {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);

    if (Array.isArray(parsed)) {
      return labelsFromArray(parsed);
    }

    if (parsed && typeof parsed === 'object') {
      return flattenFeatureCollections(parsed);
    }

    if (typeof parsed === 'string') {
      try {
        const nested = JSON.parse(parsed);
        if (Array.isArray(nested)) return labelsFromArray(nested);
        if (nested && typeof nested === 'object') return flattenFeatureCollections(nested);
        return [];
      } catch {
        return parsed
          .split(',')
          .map(item => item.trim())
          .filter(Boolean);
      }
    }

    return [];
  } catch {
    return trimmed
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }
}

function parseJsonObject(value: unknown): Record<string, any> {
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
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toNumberOrZero(value: unknown): number {
  return toNumberOrNull(value) ?? 0;
}

function isWithinBounds(
  row: { latitude?: unknown; longitude?: unknown },
  bounds?: DevelopmentDerivedListingFilters['bounds'],
): boolean {
  if (!bounds) return true;

  const latitude = toNumberOrNull(row.latitude);
  const longitude = toNumberOrNull(row.longitude);

  return (
    latitude !== null &&
    longitude !== null &&
    latitude >= bounds.south &&
    latitude <= bounds.north &&
    longitude >= bounds.west &&
    longitude <= bounds.east
  );
}

function toSentenceCaseLabel(value: string): string {
  return value
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function uniqueLabels(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map(value => String(value || '').trim())
        .filter(Boolean)
        .map(toSentenceCaseLabel),
    ),
  );
}

function mapStructuralTypeToPropertyType(
  structuralType: unknown,
  developmentType: unknown,
): Property['propertyType'] {
  const structural = String(structuralType || '').toLowerCase();
  const devType = String(developmentType || '').toLowerCase();

  if (devType === 'land' || structural.includes('plot')) return 'plot';
  if (devType === 'commercial' || structural.includes('office')) return 'commercial';
  if (
    structural.includes('townhouse') ||
    structural.includes('simplex') ||
    structural.includes('duplex')
  ) {
    return 'townhouse';
  }
  if (structural.includes('house')) return 'house';
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

function getUnitPhoto(unitBaseMedia: unknown): string | null {
  const gallery = parseBaseMedia(unitBaseMedia).gallery;
  if (!Array.isArray(gallery)) return null;
  const photo = gallery.find(item => {
    const category = item?.category;
    return (
      (!category || ['photo', 'interior', 'exterior'].includes(category)) &&
      (!item?.type || item.type === 'image') &&
      hasHomePropertyPhoto(item?.url || item?.imageUrl)
    );
  });
  return photo ? String(photo.url || photo.imageUrl).trim() : null;
}

function getMediaSignals(
  unitBaseMedia: unknown,
  developmentImages: unknown,
): {
  image: string | null;
  usesDedicatedUnitImage: boolean;
  unitImageCount: number;
  developmentImageCount: number;
} {
  const baseMedia = parseBaseMedia(unitBaseMedia);
  const unitGallery = (Array.isArray(baseMedia.gallery) ? baseMedia.gallery : []).filter(
    (item: any) => item?.url || item?.imageUrl,
  );
  const developmentGallery = parseJsonArray(developmentImages).filter(
    (item: any) => item?.url || item?.imageUrl,
  );

  return {
    image: getPrimaryImage(unitBaseMedia, developmentImages),
    usesDedicatedUnitImage: unitGallery.length > 0,
    unitImageCount: unitGallery.length,
    developmentImageCount: developmentGallery.length,
  };
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

function deriveListingDescription(row: any): string | undefined {
  const candidates = [
    row.unitDescription,
    row.unitConfigDescription,
    row.developmentDescription,
    row.developmentTagline,
  ]
    .map(value => String(value || '').trim())
    .filter(Boolean);

  return candidates[0] || undefined;
}

function flattenFeatureCollections(value: unknown): string[] {
  const parsed = parseJsonObject(value);

  return Object.values(parsed).flatMap(entry => {
    if (Array.isArray(entry)) {
      return entry.map(item => String(item || '').trim()).filter(Boolean);
    }

    if (entry && typeof entry === 'object') {
      return Object.entries(entry)
        .filter(([, enabled]) => Boolean(enabled))
        .map(([label]) => label);
    }

    return [];
  });
}

function extractBuiltInFeatureLabels(value: unknown): string[] {
  const parsed = parseJsonObject(value);
  const builtInFeatures = parsed.builtInFeatures;
  const electrical = parsed.electrical;
  const finishes = parsed.finishes;

  const labels: string[] = [];

  if (builtInFeatures && typeof builtInFeatures === 'object') {
    labels.push(
      ...Object.entries(builtInFeatures)
        .filter(([, enabled]) => Boolean(enabled))
        .map(([label]) => label),
    );
  }

  if (electrical && typeof electrical === 'object') {
    labels.push(
      ...Object.entries(electrical)
        .filter(([, enabled]) => Boolean(enabled))
        .map(([label]) => label),
    );
  }

  if (finishes && typeof finishes === 'object') {
    labels.push(
      ...Object.entries(finishes)
        .filter(([, enabled]) => Boolean(enabled))
        .map(([label]) => label),
    );
  }

  return labels;
}

function deriveListingHighlights(row: any): string[] {
  const unitSpecific = uniqueLabels([
    ...extractBuiltInFeatureLabels(row.unitSpecifications),
    ...flattenFeatureCollections(row.unitFeatures),
    ...parseJsonStringArray(row.unitAmenities),
    ...parseJsonStringArray(row.unitBaseFeatures),
    ...(row.unitParkingType ? [String(row.unitParkingType)] : []),
    ...(Number(row.unitParkingBays || 0) > 0 ? [`${row.unitParkingBays} Parking Bays`] : []),
    ...(Number(row.unitIsFurnished || 0) === 1 ? ['Furnished'] : []),
    ...(Number(row.unitTransferCostsIncluded || 0) === 1 ? ['Transfer Costs Included'] : []),
  ]);

  if (unitSpecific.length > 0) {
    return unitSpecific.slice(0, 6);
  }

  return uniqueLabels([
    ...parseJsonStringArray(row.developmentHighlights),
    ...flattenFeatureCollections(row.developmentFeatures),
    ...parseJsonStringArray(row.developmentAmenities),
  ]).slice(0, 6);
}

function buildListingTitle(row: any, propertyType: Property['propertyType']): string {
  const bedrooms = Number(row.bedrooms || 0);
  const unitName = String(row.unitName || '').trim();
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
    return unitName;
  }

  if (bedrooms > 0) {
    return `${bedrooms} Bedroom ${propertyLabel} ${action}`.trim();
  }

  return `${propertyLabel} ${action}`.trim();
}

function getRecencyScore(dateValue: Date): number {
  const ageInDays = Math.max(0, (Date.now() - dateValue.getTime()) / (1000 * 60 * 60 * 24));

  if (ageInDays <= 14) return 18;
  if (ageInDays <= 30) return 14;
  if (ageInDays <= 60) return 10;
  if (ageInDays <= 120) return 5;
  return 0;
}

function computeOrganicRankingScore(input: {
  listedDate: Date;
  title: string;
  price: number;
  priceTo?: number | null;
  bedrooms?: number;
  bathrooms?: number;
  floorSize?: number | null;
  availableUnits?: number | null;
  image?: string | null;
  usesDedicatedUnitImage: boolean;
  unitImageCount: number;
  developmentImageCount: number;
}): number {
  let score = 0;

  score += getRecencyScore(input.listedDate);

  if (input.price > 0) score += 12;
  if (typeof input.priceTo === 'number' && input.priceTo >= input.price && input.price > 0) {
    score += 2;
  }

  if (input.usesDedicatedUnitImage) {
    score += 12;
  } else if (input.image) {
    score += 6;
  }

  if (input.unitImageCount >= 4) {
    score += 5;
  } else if (input.unitImageCount >= 2) {
    score += 3;
  } else if (input.unitImageCount >= 1) {
    score += 1;
  } else if (input.developmentImageCount >= 3) {
    score += 1;
  }

  if (input.title.trim().length > 0) score += 3;
  if ((input.bedrooms || 0) > 0) score += 3;
  if ((input.bathrooms || 0) > 0) score += 3;
  if ((input.floorSize || 0) > 0) score += 4;
  if ((input.availableUnits || 0) > 0) score += 2;

  return score;
}

function buildSort(sortOption: SortOption) {
  switch (sortOption) {
    case 'price_asc':
      return (a: DevelopmentDerivedListing, b: DevelopmentDerivedListing) => a.price - b.price;
    case 'price_desc':
      return (a: DevelopmentDerivedListing, b: DevelopmentDerivedListing) => b.price - a.price;
    case 'suburb_asc':
      return (a: DevelopmentDerivedListing, b: DevelopmentDerivedListing) =>
        a.locationLabels.join(', ').localeCompare(b.locationLabels.join(', '));
    case 'suburb_desc':
      return (a: DevelopmentDerivedListing, b: DevelopmentDerivedListing) =>
        b.locationLabels.join(', ').localeCompare(a.locationLabels.join(', '));
    case 'date_asc':
      return (a: DevelopmentDerivedListing, b: DevelopmentDerivedListing) =>
        new Date(a.listedDate).getTime() - new Date(b.listedDate).getTime();
    case 'date_desc':
    default:
      return (a: DevelopmentDerivedListing, b: DevelopmentDerivedListing) =>
        (b.rankingScore || 0) - (a.rankingScore || 0) ||
        new Date(b.listedDate).getTime() - new Date(a.listedDate).getTime();
  }
}

function buildDevelopmentSearchCardResult(item: DevelopmentDerivedListing): SearchCardResult {
  const identityName = String(
    item.developerBrand?.brandName || item.development?.name || 'Developer',
  ).trim();
  const location = item.locationLabels.join(', ');
  const cataloguePublisherId = Number(item.developerBrand?.id || 0);

  return {
    kind: 'development',
    id: item.id,
    href:
      (typeof item.href === 'string' && item.href.trim()) ||
      (item.development?.slug
        ? `/development/${item.development.slug}/unit/${item.unitTypeId}`
        : `/development/${item.developmentId}/unit/${item.unitTypeId}`),
    title: item.title,
    location,
    city: '',
    suburb: '',
    province: '',
    ...(item.canonicalPlaceId ? { canonicalPlaceId: item.canonicalPlaceId } : {}),
    locationLabels: item.locationLabels,
    price: item.price,
    image: String(item.image || item.images?.[0]?.url || '').trim(),
    images: Array.isArray(item.images) ? item.images : [],
    description: item.description || undefined,
    bedrooms: item.bedrooms,
    bathrooms: item.bathrooms,
    area: item.floorSize,
    yardSize: item.erfSize,
    propertyType: item.propertyType,
    listingType: item.listingType,
    listingSource: 'development',
    contactRole: 'developer',
    identity: {
      role: 'developer',
      provenance: 'developer',
      name: identityName,
      avatarUrl: item.developerBrand?.logoUrl || null,
      phone: item.developerBrand?.publicContactPhone || null,
      whatsapp: item.developerBrand?.publicContactPhone || null,
      email: item.developerBrand?.publicContactEmail || null,
      cataloguePublisherId:
        Number.isFinite(cataloguePublisherId) && cataloguePublisherId > 0
          ? cataloguePublisherId
          : undefined,
    },
    development: item.development,
    developerBrand: item.developerBrand,
    highlights: buildDevelopmentCardHighlights(
      Array.isArray(item.highlights) ? item.highlights : [],
    ),
    badges: Array.isArray(item.badges) ? item.badges : [],
    imageCount: Array.isArray(item.images) ? item.images.length : 0,
    transactionType: item.transactionType,
    listedDate: item.listedDate instanceof Date ? item.listedDate : new Date(item.listedDate),
    latitude: item.latitude,
    longitude: item.longitude,
    developmentId: item.developmentId,
    unitTypeId: item.unitTypeId,
    availableUnits: item.availableUnits,
    totalUnits: item.totalUnits,
  };
}

export class DevelopmentDerivedListingService {
  async searchListings(
    filters: DevelopmentDerivedListingFilters,
    sortOption: SortOption = 'date_desc',
    page: number = 1,
    pageSize: number = 12,
  ): Promise<DevelopmentDerivedListingSearchResults> {
    if (!isPlaceId(filters.canonicalPlaceId)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'A canonical Place ID is required.' });
    }

    const db = await getDb();
    if (!db) {
      throw new Error('Database unavailable');
    }

    const conditions = [publicDevelopmentEligibilityConditions(), eq(unitTypes.isActive, 1)];
    const matchingDevelopmentIds = await listDevelopmentIdsForCanonicalPlace(
      filters.canonicalPlaceId,
    );
    conditions.push(
      matchingDevelopmentIds.length ? inArray(developments.id, matchingDevelopmentIds) : sql`1 = 0`,
    );
    if (filters.requireAvailableStock) {
      conditions.push(gt(unitTypes.availableUnits, 0), ne(developments.status, 'sold-out'));
    }

    const targetTransactionType =
      filters.listingType === 'rent'
        ? 'for_rent'
        : filters.listingType === 'sale'
          ? 'for_sale'
          : null;
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
        developmentDescription: developments.description,
        developmentTagline: developments.tagline,
        developmentAmenities: developments.amenities,
        developmentHighlights: developments.highlights,
        developmentFeatures: developments.features,
        latitude: developments.latitude,
        longitude: developments.longitude,
        completionDate: developments.completionDate,
        legacyStatus: developments.legacyStatus,
        constructionPhase: developments.constructionPhase,
        developmentImages: developments.images,
        developmentCreatedAt: developments.createdAt,
        developerId: sql<number | null>`NULL`,
        cataloguePublisherId: developments.cataloguePublisherId,
        developerName: developerOrganisations.name,
        developerLogo: developerOrganisations.logo,
        developerPhone: developerOrganisations.phone,
        brandName: cataloguePublishers.name,
        brandSlug: cataloguePublishers.slug,
        brandLogoUrl: cataloguePublishers.logoUrl,
        brandPublicContactEmail: cataloguePublishers.publicContactEmail,
        unitTypeId: unitTypes.id,
        unitName: unitTypes.name,
        unitDescription: unitTypes.description,
        unitConfigDescription: unitTypes.configDescription,
        unitSpecifications: unitTypes.specifications,
        unitAmenities: unitTypes.amenities,
        unitFeatures: unitTypes.features,
        unitBaseFeatures: unitTypes.baseFeatures,
        unitParkingType: unitTypes.parkingType,
        unitParkingBays: unitTypes.parkingBays,
        unitIsFurnished: unitTypes.isFurnished,
        unitTransferCostsIncluded: unitTypes.transferCostsIncluded,
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
      .leftJoin(cataloguePublishers, eq(developments.cataloguePublisherId, cataloguePublishers.id))
      .leftJoin(
        developerOrganisations,
        eq(cataloguePublishers.developerOrganisationId, developerOrganisations.id),
      )
      .where(and(...conditions))
      .orderBy(desc(developments.createdAt), asc(unitTypes.displayOrder));

    const developmentIds = Array.from(
      new Set<number>(rows.map(row => Number(row.developmentId)).filter(Number.isSafeInteger)),
    );
    const geographyByDevelopment = await listDevelopmentPlaceGeography(developmentIds);

    const mapped = rows
      .map(row => {
        const unitPhoto = filters.requireUnitPhoto ? getUnitPhoto(row.unitBaseMedia) : null;
        if (filters.requireUnitPhoto && !unitPhoto) return null;
        if (
          filters.requireAvailableStock &&
          (!(Number(row.availableUnits) > 0) || row.developmentStatus === 'sold-out')
        )
          return null;
        if (!isWithinBounds(row, filters.bounds)) {
          return null;
        }

        const floorSize = toNumberOrNull(row.unitSize);
        const erfSize = toNumberOrNull(row.yardSize);
        const searchableArea = floorSize ?? erfSize;
        if (filters.minArea !== undefined || filters.maxArea !== undefined) {
          if (searchableArea === null) return null;
          if (filters.minArea !== undefined && searchableArea < filters.minArea) return null;
          if (filters.maxArea !== undefined && searchableArea > filters.maxArea) return null;
        }

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

        if (filters.minPrice !== undefined && price < filters.minPrice) return null;
        if (filters.maxPrice !== undefined && price > filters.maxPrice) return null;

        const bedrooms = toNumberOrNull(row.bedrooms) ?? undefined;
        const bathrooms = toNumberOrNull(row.bathrooms) ?? undefined;
        if (
          filters.minBedrooms !== undefined &&
          (bedrooms === undefined || bedrooms < filters.minBedrooms)
        ) {
          return null;
        }
        if (
          filters.maxBedrooms !== undefined &&
          (bedrooms === undefined || bedrooms > filters.maxBedrooms)
        ) {
          return null;
        }
        if (
          filters.minBathrooms !== undefined &&
          (bathrooms === undefined || bathrooms < filters.minBathrooms)
        ) {
          return null;
        }
        if (
          filters.maxBathrooms !== undefined &&
          (bathrooms === undefined || bathrooms > filters.maxBathrooms)
        ) {
          return null;
        }

        const listedDate = new Date(row.unitCreatedAt || row.developmentCreatedAt || new Date());
        const geography = geographyByDevelopment.get(Number(row.developmentId)) ?? {
          canonicalPlaceId: null,
          locationLabels: [],
        };
        const mediaSignals = getMediaSignals(row.unitBaseMedia, row.developmentImages);
        if (unitPhoto) mediaSignals.image = unitPhoto;
        const stageBadge = deriveStageBadge({
          legacyStatus: row.legacyStatus,
          constructionPhase: row.constructionPhase,
          status: row.developmentStatus,
        });
        const description = deriveListingDescription(row);
        const highlights = deriveListingHighlights(row);
        const title = buildListingTitle(row, propertyType);
        const normalizedFloorSize = floorSize ?? undefined;
        const normalizedErfSize = erfSize ?? undefined;
        const availableUnits = toNumberOrNull(row.availableUnits) ?? undefined;
        const rankingScore = computeOrganicRankingScore({
          listedDate,
          title,
          price,
          priceTo: priceTo ?? undefined,
          bedrooms,
          bathrooms,
          floorSize,
          availableUnits,
          image: mediaSignals.image,
          usesDedicatedUnitImage: mediaSignals.usesDedicatedUnitImage,
          unitImageCount: mediaSignals.unitImageCount,
          developmentImageCount: mediaSignals.developmentImageCount,
        });

        return {
          id: `dev-${row.developmentId}-${row.unitTypeId}`,
          unitTypeId: String(row.unitTypeId),
          developmentId: Number(row.developmentId),
          rankingScore,
          href: row.developmentSlug
            ? `/development/${row.developmentSlug}/unit/${row.unitTypeId}`
            : `/development/${row.developmentId}/unit/${row.unitTypeId}`,
          title,
          price,
          priceTo: priceTo ?? undefined,
          canonicalPlaceId: geography.canonicalPlaceId,
          locationLabels: geography.locationLabels,
          propertyType,
          listingType,
          transactionType: String(row.transactionType || 'for_sale') as
            | 'for_sale'
            | 'for_rent'
            | 'auction',
          listingSource: 'development' as const,
          bedrooms,
          bathrooms,
          floorSize: normalizedFloorSize,
          erfSize: normalizedErfSize,
          parkingCount: toNumberOrNull(row.unitParkingBays) ?? undefined,
          parkingType: typeof row.unitParkingType === 'string' ? row.unitParkingType : undefined,
          description,
          highlights,
          image: mediaSignals.image,
          images: mediaSignals.image
            ? [{ url: mediaSignals.image, thumbnailUrl: mediaSignals.image }]
            : [],
          badges: [stageBadge].filter(Boolean) as string[],
          availableUnits,
          totalUnits: toNumberOrNull(row.totalUnits) ?? undefined,
          completionDate: row.completionDate || null,
          listedDate,
          latitude: toNumberOrNull(row.latitude) ?? undefined,
          longitude: toNumberOrNull(row.longitude) ?? undefined,
          development: {
            id: Number(row.developmentId),
            name: row.developmentName,
            slug: row.developmentSlug || null,
            status: row.developmentStatus || null,
          },
          developerBrand: {
            id: row.cataloguePublisherId ? Number(row.cataloguePublisherId) : null,
            brandName: row.brandName || row.developerName || 'Developer',
            slug: row.brandSlug || null,
            logoUrl: row.brandLogoUrl || row.developerLogo || null,
            publicContactEmail: row.brandPublicContactEmail || null,
            publicContactPhone: row.developerPhone || null,
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
      cards: items.map(buildDevelopmentSearchCardResult),
      total,
      page,
      pageSize,
      hasMore: offset + pageSize < total,
    };
  }
}

export const developmentDerivedListingService = new DevelopmentDerivedListingService();
