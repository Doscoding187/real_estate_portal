import { and, asc, desc, eq } from 'drizzle-orm';
import { getDb } from '../db-connection';
import { developerBrandProfiles, developers, developments, unitTypes } from '../../drizzle/schema';
import type {
  DevelopmentDerivedListing,
  DevelopmentDerivedListingSearchResults,
  Property,
  SearchCardResult,
  SortOption,
} from '../../shared/types';

interface DevelopmentDerivedListingFilters {
  province?: string;
  city?: string;
  suburb?: string[];
  locations?: string[];
  propertyType?: Property['propertyType'][];
  listingType?: Property['listingType'];
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
}

interface DevelopmentDerivedListingFilterCounts {
  total: number;
  byType: Record<string, number>;
  byBedrooms: Record<string, number>;
  byLocation: Array<{ name: string; slug: string; count: number }>;
  byPropertyType: Record<string, number>;
  byPriceRange: Array<{ range: string; count: number }>;
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
  const normalized = parseJsonArray(value);
  if (normalized.length > 0) {
    return normalized
      .flatMap(item => {
        if (typeof item === 'string') return [item];
        if (item && typeof item === 'object') {
          return [item.label, item.name, item.title, item.value]
            .filter(candidate => typeof candidate === 'string' && candidate.trim().length > 0)
            .map(candidate => String(candidate));
        }
        return [];
      })
      .map(item => String(item || '').trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }

  return [];
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
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toNumberOrZero(value: unknown): number {
  return toNumberOrNull(value) ?? 0;
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

function slugifyText(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeLocationText(value: string): string {
  return value
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesLocationSlugs(
  row: { city?: unknown; suburb?: unknown; province?: unknown },
  locations?: string[],
): boolean {
  if (!locations?.length) return true;

  const haystacks = [row.suburb, row.city, row.province]
    .map(value => normalizeLocationText(String(value || '')))
    .filter(Boolean);

  return locations.some(location => {
    const normalizedLocation = normalizeLocationText(location);
    if (!normalizedLocation) return false;
    return haystacks.some(haystack => haystack.includes(normalizedLocation));
  });
}

function matchesNormalizedField(value: unknown, expected?: string): boolean {
  if (!expected) return true;
  return normalizeLocationText(String(value || '')) === normalizeLocationText(expected);
}

function matchesNormalizedFieldSet(value: unknown, expectedValues?: string[]): boolean {
  if (!expectedValues?.length) return true;
  const normalizedValue = normalizeLocationText(String(value || ''));
  if (!normalizedValue) return false;

  return expectedValues.some(expected => normalizedValue === normalizeLocationText(expected));
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

function getMediaSignals(unitBaseMedia: unknown, developmentImages: unknown): {
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
      return entry
        .map(item => String(item || '').trim())
        .filter(Boolean);
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
        (b.rankingScore || 0) - (a.rankingScore || 0) ||
        new Date(b.listedDate).getTime() - new Date(a.listedDate).getTime();
  }
}

function buildDevelopmentSearchCardResult(item: DevelopmentDerivedListing): SearchCardResult {
  const identityName = String(
    item.developerBrand?.brandName || item.development?.name || 'Developer',
  ).trim();
  const location = [item.suburb, item.city, item.province].filter(Boolean).join(', ');
  const developerBrandProfileId = Number(item.developerBrand?.id || 0);

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
    city: item.city,
    suburb: item.suburb,
    province: item.province,
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
      name: identityName,
      avatarUrl: item.developerBrand?.logoUrl || null,
      phone: item.developerBrand?.publicContactPhone || null,
      whatsapp: item.developerBrand?.publicContactPhone || null,
      email: item.developerBrand?.publicContactEmail || null,
      developerBrandProfileId:
        Number.isFinite(developerBrandProfileId) && developerBrandProfileId > 0
          ? developerBrandProfileId
          : undefined,
    },
    development: item.development,
    developerBrand: item.developerBrand,
    highlights: Array.isArray(item.highlights) ? item.highlights : [],
    badges: Array.isArray(item.badges) ? item.badges : [],
    imageCount: Array.isArray(item.images) ? item.images.length : 0,
    transactionType: item.transactionType,
    listedDate: item.listedDate instanceof Date ? item.listedDate : new Date(item.listedDate),
    latitude: item.latitude,
    longitude: item.longitude,
    developmentId: item.developmentId,
  };
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
      return { items: [], cards: [], total: 0, page, pageSize, hasMore: false };
    }

    const conditions = [
      eq(developments.isPublished, 1),
      eq(developments.approvalStatus, 'approved'),
      eq(unitTypes.isActive, 1),
    ];

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
        developerId: developments.developerId,
        developerBrandProfileId: developments.developerBrandProfileId,
        developerName: developers.name,
        developerLogo: developers.logo,
        developerPhone: developers.phone,
        brandName: developerBrandProfiles.brandName,
        brandSlug: developerBrandProfiles.slug,
        brandLogoUrl: developerBrandProfiles.logoUrl,
        brandPublicContactEmail: developerBrandProfiles.publicContactEmail,
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
      .leftJoin(developers, eq(developments.developerId, developers.id))
      .leftJoin(
        developerBrandProfiles,
        eq(developments.developerBrandProfileId, developerBrandProfiles.id),
      )
      .where(and(...conditions))
      .orderBy(desc(developments.createdAt), asc(unitTypes.displayOrder));

    const mapped = rows
      .map(row => {
        if (!matchesNormalizedField(row.province, filters.province)) {
          return null;
        }

        if (!matchesNormalizedField(row.city, filters.city)) {
          return null;
        }

        if (!matchesNormalizedFieldSet(row.suburb, filters.suburb)) {
          return null;
        }

        if (!matchesLocationSlugs(row, filters.locations)) {
          return null;
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

        if (filters.minPrice && price < filters.minPrice) return null;
        if (filters.maxPrice && price > filters.maxPrice) return null;

        const bedrooms = toNumberOrNull(row.bedrooms) ?? undefined;
        const bathrooms = toNumberOrNull(row.bathrooms) ?? undefined;
        if (filters.minBedrooms && (bedrooms ?? 0) < filters.minBedrooms) return null;
        if (filters.maxBedrooms && (bedrooms ?? 0) > filters.maxBedrooms) return null;
        if (filters.minBathrooms && (bathrooms ?? 0) < filters.minBathrooms) return null;

        const listedDate = new Date(row.unitCreatedAt || row.developmentCreatedAt || new Date());
        const mediaSignals = getMediaSignals(row.unitBaseMedia, row.developmentImages);
        const stageBadge = deriveStageBadge({
          legacyStatus: row.legacyStatus,
          constructionPhase: row.constructionPhase,
          status: row.developmentStatus,
        });
        const description = deriveListingDescription(row);
        const highlights = deriveListingHighlights(row);
        const title = buildListingTitle(row, propertyType);
        const floorSize = toNumberOrNull(row.unitSize) ?? undefined;
        const erfSize = toNumberOrNull(row.yardSize) ?? undefined;
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
          floorSize,
          erfSize,
          description,
          highlights,
          image: mediaSignals.image,
          images: mediaSignals.image ? [{ url: mediaSignals.image, thumbnailUrl: mediaSignals.image }] : [],
          badges: [stageBadge].filter(Boolean) as string[],
          availableUnits,
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
            id: row.developerBrandProfileId ? Number(row.developerBrandProfileId) : null,
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

  async getFilterCounts(
    filters: DevelopmentDerivedListingFilters,
  ): Promise<DevelopmentDerivedListingFilterCounts> {
    const { items } = await this.searchListings(filters, 'date_desc', 1, 100000);

    const byPropertyType: Record<string, number> = {};
    const byBedrooms: Record<string, number> = {};
    const locationMap = new Map<string, { name: string; slug: string; count: number }>();
    const currentSuburbs = new Set((filters.suburb || []).map(value => value.toLowerCase()));

    items.forEach(item => {
      byPropertyType[item.propertyType] = (byPropertyType[item.propertyType] || 0) + 1;

      if ((item.bedrooms || 0) > 0) {
        const key = String(item.bedrooms);
        byBedrooms[key] = (byBedrooms[key] || 0) + 1;
      }

      const locationName = String(item.suburb || item.city || '').trim();
      const locationSlug = slugifyText(locationName);
      if (locationName && locationSlug && !currentSuburbs.has(locationName.toLowerCase())) {
        const existing = locationMap.get(locationSlug);
        if (existing) {
          existing.count += 1;
        } else {
          locationMap.set(locationSlug, {
            name: locationName,
            slug: locationSlug,
            count: 1,
          });
        }
      }
    });

    const byPriceRange = [
      { range: 'Under R1M', min: 0, max: 1000000 },
      { range: 'R1M - R2M', min: 1000000, max: 2000000 },
      { range: 'R2M - R3M', min: 2000000, max: 3000000 },
      { range: 'R3M - R5M', min: 3000000, max: 5000000 },
      { range: 'Over R5M', min: 5000000, max: Number.MAX_SAFE_INTEGER },
    ].map(({ range, min, max }) => ({
      range,
      count: items.filter(item => item.price >= min && item.price <= max).length,
    }));

    return {
      total: items.length,
      byType: { ...byPropertyType },
      byBedrooms,
      byLocation: Array.from(locationMap.values())
        .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
        .slice(0, 12),
      byPropertyType,
      byPriceRange,
    };
  }
}

export const developmentDerivedListingService = new DevelopmentDerivedListingService();
