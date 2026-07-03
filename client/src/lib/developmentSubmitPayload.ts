import {
  buildDevelopmentFinancialPayload,
  normalizeDevelopmentTransactionType,
  stripUnitPricingForTransaction,
} from './developmentTransactionPayload';
import {
  buildCanonicalDevelopmentDataSnapshot,
  getCanonicalDevelopmentConfiguration,
  getCanonicalDevelopmentUnitTypes,
} from '../../../shared/developmentCanonicalSelectors';
import {
  CANONICAL_PARTIAL_UPDATE_MODE,
  CANONICAL_UPDATE_MODE_FIELD,
  isDevelopmentInventoryOwningStepId,
  PARTIAL_UPDATE_ALWAYS_ALLOWED_PAYLOAD_FIELDS,
  PARTIAL_UPDATE_STEP_OWNED_PAYLOAD_FIELDS,
} from '../../../shared/developmentPayloadOwnership';

export type SubmitParkingType = 'none' | 'open' | 'covered' | 'carport' | 'garage';

export type SubmitUnitType = {
  id?: string;
  name: string;
  description?: string;
  bedrooms: number;
  bathrooms: number;
  unitSize?: number;
  yardSize?: number;
  basePriceFrom?: number;
  basePriceTo?: number;
  extras?: Array<{ price: number; [key: string]: any }>;
  monthlyRentFrom?: number;
  monthlyRentTo?: number;
  leaseTerm?: string;
  isFurnished?: boolean;
  depositRequired?: number;
  startingBid?: number;
  reservePrice?: number;
  auctionStartDate?: string;
  auctionEndDate?: string;
  auctionStatus?: 'scheduled' | 'active' | 'sold' | 'passed_in' | 'withdrawn';
  features?: Record<string, string[]>;
  parkingType?: SubmitParkingType;
  parkingBays?: number;
  totalUnits?: number;
  availableUnits?: number;
  reservedUnits?: number;
  isActive?: boolean;
  structuralType?: string;
  unitCategory?: 'house' | 'apartment';
  unitSubType?: string;
  specifications?: Record<string, any>;
  baseMedia?: any;
  displayOrder?: number;
};

export type DevelopmentSubmitPayloadInput = {
  wizardData: Record<string, any>;
  amenities: string[];
  canonicalSnapshot?: Record<string, any>;
  residentialConfig?: Record<string, any>;
  landConfig?: Record<string, any>;
  commercialConfig?: Record<string, any>;
  mixedUseConfig?: Record<string, any>;
  specifications?: Record<string, any>;
  fallbackOwnershipType?: unknown;
};

export type DevelopmentUpdatePayloadInput = Omit<
  DevelopmentSubmitPayloadInput,
  'wizardData' | 'canonicalSnapshot'
> & {
  canonicalSnapshot: Record<string, any>;
  wizardData?: Record<string, any>;
};

export type DevelopmentEditSaveIntent = 'partial_step' | 'publish';

export type DevelopmentPartialUpdatePayloadOptions = {
  previousCanonicalSnapshot?: Record<string, any>;
};

export type DevelopmentEditProgressPayloadOptions = DevelopmentPartialUpdatePayloadOptions & {
  previousCanonicalSnapshot: Record<string, any>;
};

export type DevelopmentEditSavePayloadOptions = DevelopmentPartialUpdatePayloadOptions & {
  intent?: DevelopmentEditSaveIntent;
};

const PARTIAL_ALWAYS_ALLOWED_PAYLOAD_FIELDS: ReadonlySet<string> = new Set(
  PARTIAL_UPDATE_ALWAYS_ALLOWED_PAYLOAD_FIELDS,
);
const PARTIAL_STEP_OWNED_PAYLOAD_FIELDS = Object.fromEntries(
  Object.entries(PARTIAL_UPDATE_STEP_OWNED_PAYLOAD_FIELDS).map(([stepId, fields]) => [
    stepId,
    new Set(fields),
  ]),
) as Record<string, ReadonlySet<string>>;

export function isDevelopmentInventoryOwningStep(stepId: unknown): boolean {
  return isDevelopmentInventoryOwningStepId(stepId);
}

export function buildDevelopmentWizardDataFromCanonicalSnapshot(
  canonicalSnapshot: Record<string, any>,
) {
  const developmentData = buildCanonicalDevelopmentDataSnapshot(canonicalSnapshot);

  return {
    ...developmentData,
    workflowId: canonicalSnapshot.workflowId,
    currentStepId: canonicalSnapshot.currentStepId,
    completedSteps: canonicalSnapshot.completedSteps,
    stepData: canonicalSnapshot.stepData,
    unitTypes: canonicalSnapshot.unitTypes,
  };
}

export function normalizeAmenitiesPayload(value: unknown): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {
      // Treat non-JSON strings as a single amenity label.
    }
    return [trimmed];
  }
  if (typeof value === 'object') {
    const standard = Array.isArray((value as any).standard) ? (value as any).standard : [];
    const additional = Array.isArray((value as any).additional) ? (value as any).additional : [];
    const merged = [...standard, ...additional].filter(Boolean).map(String);
    return merged.length ? merged : undefined;
  }
  return undefined;
}

function normalizeStringListPayload(value: unknown): string[] | undefined {
  return normalizeAmenitiesPayload(value);
}

function uniqueStringList(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function extractSubmitImages(
  wizardData: Record<string, any>,
): { url: string; category?: string }[] {
  const images: { url: string; category?: string }[] = [];
  const heroUrl =
    typeof wizardData.heroImage === 'string'
      ? wizardData.heroImage
      : (wizardData.heroImage?.url ?? wizardData.media?.heroImage?.url);
  if (heroUrl) images.push({ url: heroUrl, category: 'hero' });

  const photos = wizardData.media?.photos ?? [];
  photos.forEach((photo: { url: string; category?: string }) => {
    if (photo?.url && photo.url !== heroUrl) {
      images.push({ url: photo.url, category: photo.category });
    }
  });

  return images;
}

export function extractSubmitVideoUrls(wizardData: Record<string, any>): string[] {
  const videos = wizardData.media?.videos ?? [];
  return videos
    .map((video: string | { url: string }) => (typeof video === 'string' ? video : video.url))
    .filter(Boolean) as string[];
}

export function extractSubmitFloorPlanUrls(wizardData: Record<string, any>): string[] {
  const floorPlans = wizardData.media?.floorPlans ?? [];
  return floorPlans
    .map((floorPlan: string | { url: string }) =>
      typeof floorPlan === 'string' ? floorPlan : floorPlan.url,
    )
    .filter(Boolean) as string[];
}

export function extractSubmitDocumentUrls(wizardData: Record<string, any>): string[] {
  const documents = wizardData.media?.documents ?? wizardData.media?.brochures ?? [];
  return documents
    .map((document: string | { url: string }) =>
      typeof document === 'string' ? document : document.url,
    )
    .filter(Boolean) as string[];
}

function hasSubmitMediaSource(wizardData: Record<string, any>): boolean {
  if (wizardData.heroImage !== undefined) return true;
  if (!wizardData.media || typeof wizardData.media !== 'object') return false;

  return ['heroImage', 'photos', 'images', 'videos', 'floorPlans', 'documents', 'brochures'].some(
    key => wizardData.media[key] !== undefined,
  );
}

export function normalizeSubmitOwnershipType(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const first = value.find(item => typeof item === 'string' && item.trim().length > 0);
    return first as string | undefined;
  }
  if (typeof value === 'string' && value.trim().length > 0) return value;
  return undefined;
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function normalizeParkingType(raw: unknown): SubmitParkingType {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase();
  const allowed: SubmitParkingType[] = ['none', 'open', 'covered', 'carport', 'garage'];
  if (allowed.includes(value as SubmitParkingType)) return value as SubmitParkingType;
  if (value === '' || value === 'null' || value === 'undefined') return 'none';
  if (value === '1' || value === '2' || value === 'street') return 'open';
  return 'none';
}

function toInt(value: unknown, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
}

function toNumber(value: unknown, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDateString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return undefined;
}

function computeExtrasTotal(extras: unknown): number {
  if (!Array.isArray(extras)) return 0;
  return extras.reduce((sum, extra) => {
    const price = toNumber(extra?.price, 0);
    return sum + (price > 0 ? price : 0);
  }, 0);
}

function computeUnitTotalFrom(unit: Record<string, any>): number {
  const base = toNumber(unit?.priceFrom ?? unit?.basePriceFrom, 0);
  const total = base + computeExtrasTotal(unit?.extras);
  return Number.isFinite(total) ? total : 0;
}

function computeUnitTotalTo(unit: Record<string, any>): number {
  const from = computeUnitTotalFrom(unit);
  const baseTo = toNumber(unit?.priceTo ?? unit?.basePriceTo, 0);
  const total = baseTo > 0 ? baseTo + computeExtrasTotal(unit?.extras) : from;
  return Number.isFinite(total) ? Math.max(total, from) : from;
}

function getUnitRentFrom(unit: Record<string, any>): number {
  return toNumber(unit?.monthlyRentFrom ?? unit?.monthlyRent ?? 0, 0);
}

function getUnitRentTo(unit: Record<string, any>): number {
  const rentTo = toNumber(unit?.monthlyRentTo ?? 0, 0);
  const rentFrom = getUnitRentFrom(unit);
  return rentTo > 0 ? rentTo : rentFrom;
}

export function resolveSubmitTransactionType(wizardData: Record<string, any>): unknown {
  return (
    getCanonicalDevelopmentConfiguration(wizardData).transactionType ?? wizardData.transactionType
  );
}

export function resolveSubmitUnitTypes(wizardData: Record<string, any>): any[] {
  return (getCanonicalDevelopmentUnitTypes(wizardData) ?? []) as any[];
}

export function normalizeSubmitUnitTypes(
  rawUnits: any[],
  transactionType: unknown,
): SubmitUnitType[] {
  if (!Array.isArray(rawUnits)) return [];

  return rawUnits.map((unit: any) => {
    const basePriceFrom = toNumber(unit?.priceFrom ?? unit?.basePriceFrom, 0);
    const basePriceTo = toNumber(unit?.priceTo ?? unit?.basePriceTo, 0);
    const monthlyRentFrom = toNumber(unit?.monthlyRentFrom ?? unit?.monthlyRent ?? 0, 0);
    const monthlyRentTo = toNumber(unit?.monthlyRentTo ?? 0, 0);
    const startingBid = toNumber(unit?.startingBid ?? 0, 0);
    const reservePrice = toNumber(unit?.reservePrice ?? 0, 0);
    const auctionStartDate = normalizeDateString(unit?.auctionStartDate);
    const auctionEndDate = normalizeDateString(unit?.auctionEndDate);
    const auctionStatus = typeof unit?.auctionStatus === 'string' ? unit.auctionStatus : undefined;
    const hasParkingType =
      unit?.parkingType !== undefined ||
      unit?.parking_type !== undefined ||
      unit?.parking !== undefined;
    const hasParkingBays = unit?.parkingBays !== undefined || unit?.parking_bays !== undefined;
    const parkingType = normalizeParkingType(
      unit?.parkingType ?? unit?.parking_type ?? unit?.parking,
    );
    const parkingBays = Math.max(0, toInt(unit?.parkingBays ?? unit?.parking_bays, 0));
    const unitSizeSource = unit?.unitSize ?? unit?.floorSize ?? unit?.unit_size ?? unit?.size;
    const unitSize = unitSizeSource != null ? toInt(unitSizeSource, 0) : undefined;
    const yardSizeSource = unit?.yardSize ?? unit?.erfSize ?? unit?.yard_size ?? unit?.landSize;
    const yardSize = yardSizeSource != null ? toInt(yardSizeSource, 0) : undefined;
    const specifications =
      unit?.specifications && typeof unit.specifications === 'object'
        ? unit.specifications
        : undefined;
    const classification = specifications?.classification ?? {};
    const unitCategory =
      unit?.unitCategory === 'house' || unit?.unitCategory === 'apartment'
        ? unit.unitCategory
        : classification?.category === 'house' || classification?.category === 'apartment'
          ? classification.category
          : undefined;
    const unitSubType =
      typeof unit?.unitSubType === 'string' && unit.unitSubType.trim().length > 0
        ? unit.unitSubType
        : typeof classification?.subType === 'string' && classification.subType.trim().length > 0
          ? classification.subType
          : undefined;

    const normalized: SubmitUnitType = {
      id: typeof unit?.id === 'string' ? unit.id : undefined,
      name: String(unit?.name ?? '').trim() || 'Unnamed Unit',
      description: typeof unit?.description === 'string' ? unit.description : undefined,
      bedrooms: Math.max(0, toInt(unit?.bedrooms, 0)),
      bathrooms: Math.max(0, toNumber(unit?.bathrooms, 0)),
      unitSize: unitSize && unitSize > 0 ? unitSize : undefined,
      yardSize: yardSize && yardSize > 0 ? yardSize : undefined,
      extras: Array.isArray(unit?.extras) ? unit.extras : undefined,
      monthlyRentFrom: monthlyRentFrom > 0 ? monthlyRentFrom : undefined,
      monthlyRentTo: monthlyRentTo > 0 ? monthlyRentTo : undefined,
      leaseTerm: typeof unit?.leaseTerm === 'string' ? unit.leaseTerm : undefined,
      isFurnished: typeof unit?.isFurnished === 'boolean' ? unit.isFurnished : undefined,
      depositRequired:
        unit?.depositRequired != null ? toNumber(unit.depositRequired, 0) : undefined,
      startingBid: startingBid > 0 ? startingBid : undefined,
      reservePrice: reservePrice > 0 ? reservePrice : undefined,
      auctionStartDate,
      auctionEndDate,
      auctionStatus,
      features: typeof unit?.features === 'object' && unit?.features ? unit.features : undefined,
      totalUnits: unit?.totalUnits != null ? Math.max(0, toInt(unit.totalUnits, 0)) : undefined,
      availableUnits:
        unit?.availableUnits != null ? Math.max(0, toInt(unit.availableUnits, 0)) : undefined,
      reservedUnits:
        unit?.reservedUnits != null ? Math.max(0, toInt(unit.reservedUnits, 0)) : undefined,
      isActive: typeof unit?.isActive === 'boolean' ? unit.isActive : undefined,
      structuralType: unit?.structuralType,
      unitCategory,
      unitSubType,
      specifications,
      baseMedia: unit?.baseMedia,
      displayOrder: unit?.displayOrder != null ? toInt(unit.displayOrder, 0) : undefined,
    };

    if (basePriceFrom > 0) normalized.basePriceFrom = basePriceFrom;
    if (basePriceTo > 0) normalized.basePriceTo = basePriceTo;
    if (hasParkingType) normalized.parkingType = parkingType;
    if (hasParkingType || hasParkingBays) {
      normalized.parkingBays = parkingType === 'none' ? 0 : parkingBays;
    }

    return stripUnitPricingForTransaction(normalized, transactionType as any);
  });
}

function buildFeatureTags(input: DevelopmentSubmitPayloadInput): string[] {
  const { wizardData, residentialConfig, landConfig, commercialConfig } = input;
  const transactionType = normalizeDevelopmentTransactionType(
    resolveSubmitTransactionType(wizardData),
  );
  const features: string[] = [];

  if (residentialConfig?.residentialType) {
    features.push(`cfg:res_type:${residentialConfig.residentialType}`);
  }
  residentialConfig?.communityTypes?.forEach((type: string) =>
    features.push(`cfg:comm_type:${type}`),
  );
  residentialConfig?.securityFeatures?.forEach((feature: string) =>
    features.push(`cfg:sec_feat:${feature}`),
  );
  if (transactionType === 'auction' && wizardData.auctionType) {
    features.push(`cfg:auction_type:${wizardData.auctionType}`);
  }
  if (landConfig?.landType) features.push(`cfg:land_type:${landConfig.landType}`);
  landConfig?.infrastructure?.forEach((item: string) => features.push(`cfg:infra:${item}`));
  if (commercialConfig?.commercialType) {
    features.push(`cfg:comm_use:${commercialConfig.commercialType}`);
  }
  commercialConfig?.features?.forEach((feature: string) =>
    features.push(`cfg:comm_feat:${feature}`),
  );
  if (wizardData.hasGoverningBody !== undefined) {
    features.push(`cfg:hoa:${wizardData.hasGoverningBody}`);
  }
  if (wizardData.governanceType) {
    features.push(`cfg:governance_type:${wizardData.governanceType}`);
  }

  return features;
}

function getInventory(units: SubmitUnitType[], isLand: boolean) {
  if (isLand || units.length === 0) {
    return { totalUnits: undefined, availableUnits: undefined };
  }
  return {
    totalUnits: units.reduce((sum, unit) => sum + Math.max(0, Number(unit.totalUnits ?? 0)), 0),
    availableUnits: units.reduce(
      (sum, unit) => sum + Math.max(0, Number(unit.availableUnits ?? 0)),
      0,
    ),
  };
}

function getSaleRange(rawUnits: any[], isLand: boolean) {
  if (isLand) return { priceFrom: undefined, priceTo: undefined };
  const ranges = rawUnits
    .map(unit => ({ from: computeUnitTotalFrom(unit), to: computeUnitTotalTo(unit) }))
    .filter(range => range.from > 0 || range.to > 0);
  if (ranges.length === 0) return { priceFrom: undefined, priceTo: undefined };

  const fromValues = ranges.map(range => range.from).filter(value => value > 0);
  const toValues = ranges.map(range => range.to).filter(value => value > 0);

  return {
    priceFrom: fromValues.length ? Math.min(...fromValues) : undefined,
    priceTo: toValues.length ? Math.max(...toValues) : undefined,
  };
}

function getRentRange(rawUnits: any[], isLand: boolean) {
  if (isLand) return { monthlyRentFrom: undefined, monthlyRentTo: undefined };
  const rentRanges = rawUnits
    .map(unit => {
      const from = getUnitRentFrom(unit);
      const to = getUnitRentTo(unit);
      return { from: from > 0 ? from : to, to: to > 0 ? to : from };
    })
    .filter(range => range.from > 0 || range.to > 0);
  if (rentRanges.length === 0) return { monthlyRentFrom: undefined, monthlyRentTo: undefined };

  const mins = rentRanges.map(range => range.from).filter(value => value > 0);
  const maxs = rentRanges.map(range => range.to).filter(value => value > 0);
  return {
    monthlyRentFrom: mins.length ? Math.min(...mins) : undefined,
    monthlyRentTo: maxs.length ? Math.max(...maxs) : undefined,
  };
}

function getAuctionRange(rawUnits: any[], isLand: boolean) {
  if (isLand) {
    return {
      auctionStartDate: undefined,
      auctionEndDate: undefined,
      startingBidFrom: undefined,
      reservePriceFrom: undefined,
    };
  }
  const starts = rawUnits
    .map(unit => (unit?.auctionStartDate ? new Date(unit.auctionStartDate) : null))
    .filter((date: Date | null) => date && !Number.isNaN(date.getTime())) as Date[];
  const ends = rawUnits
    .map(unit => (unit?.auctionEndDate ? new Date(unit.auctionEndDate) : null))
    .filter((date: Date | null) => date && !Number.isNaN(date.getTime())) as Date[];
  const startingBids = rawUnits
    .map(unit => Number(unit?.startingBid ?? 0))
    .filter(value => Number.isFinite(value) && value > 0);
  const reservePrices = rawUnits
    .map(unit => Number(unit?.reservePrice ?? 0))
    .filter(value => Number.isFinite(value) && value > 0);

  return {
    auctionStartDate: starts.length
      ? new Date(Math.min(...starts.map(date => date.getTime())))
      : undefined,
    auctionEndDate: ends.length
      ? new Date(Math.max(...ends.map(date => date.getTime())))
      : undefined,
    startingBidFrom: startingBids.length ? Math.min(...startingBids) : undefined,
    reservePriceFrom: reservePrices.length ? Math.min(...reservePrices) : undefined,
  };
}

export function buildDevelopmentSubmitPayload(input: DevelopmentSubmitPayloadInput) {
  const {
    wizardData,
    canonicalSnapshot,
    residentialConfig,
    landConfig,
    commercialConfig,
    mixedUseConfig,
    specifications,
  } = input;
  const wizardUnitTypes = resolveSubmitUnitTypes(wizardData);
  const canonicalUnitTypes = canonicalSnapshot ? resolveSubmitUnitTypes(canonicalSnapshot) : [];
  const rawUnits = wizardUnitTypes.length ? wizardUnitTypes : canonicalUnitTypes;
  const submitSource: Record<string, any> = canonicalSnapshot
    ? buildDevelopmentWizardDataFromCanonicalSnapshot({
        ...canonicalSnapshot,
        stepData: {
          ...(canonicalSnapshot.stepData ?? {}),
          unit_types: {
            ...(canonicalSnapshot.stepData?.unit_types ?? {}),
            unitTypes: rawUnits,
          },
        },
        unitTypes: rawUnits,
      })
    : wizardData;
  const canonicalDevelopmentData = buildCanonicalDevelopmentDataSnapshot(submitSource);
  const canonicalConfiguration = getCanonicalDevelopmentConfiguration(submitSource);
  const developmentType =
    canonicalConfiguration.developmentType ?? submitSource.developmentType ?? 'residential';
  const transactionType = normalizeDevelopmentTransactionType(
    resolveSubmitTransactionType(submitSource),
  );
  const isLand = developmentType === 'land';
  const unitTypes = isLand ? [] : normalizeSubmitUnitTypes(rawUnits, transactionType);
  const inventory = getInventory(unitTypes, isLand);
  const saleRange = getSaleRange(unitTypes, isLand);
  const rentRange = getRentRange(unitTypes, isLand);
  const auctionRange = getAuctionRange(unitTypes, isLand);
  const images = extractSubmitImages(submitSource);
  const videos = extractSubmitVideoUrls(submitSource);
  const floorPlans = extractSubmitFloorPlanUrls(submitSource);
  const brochures = extractSubmitDocumentUrls(submitSource);
  const mediaPayload = hasSubmitMediaSource(submitSource)
    ? {
        images,
        videos,
        floorPlans,
        brochures,
        media: {
          photos: images,
          videos: videos.map(url => ({ url })),
          floorPlans: floorPlans.map(url => ({ url })),
          brochures: brochures.map(url => ({ url })),
        },
      }
    : {};
  const canonicalAmenities =
    canonicalDevelopmentData.amenities !== undefined
      ? (normalizeAmenitiesPayload(canonicalDevelopmentData.amenities) ?? [])
      : undefined;
  const canonicalFeatureLabels =
    canonicalDevelopmentData.features !== undefined
      ? (normalizeStringListPayload(canonicalDevelopmentData.features) ?? [])
      : [];
  const featureTags = buildFeatureTags({ ...input, wizardData: submitSource });
  const features = uniqueStringList([...canonicalFeatureLabels, ...featureTags]);
  const ownershipSource =
    Array.isArray(canonicalDevelopmentData.ownershipTypes) &&
    canonicalDevelopmentData.ownershipTypes.length > 0
      ? canonicalDevelopmentData.ownershipTypes
      : (canonicalDevelopmentData.ownershipType ?? input.fallbackOwnershipType);

  const financialPayload = buildDevelopmentFinancialPayload({
    transactionType,
    priceFrom: saleRange.priceFrom ?? canonicalDevelopmentData.priceFrom,
    priceTo: saleRange.priceTo ?? canonicalDevelopmentData.priceTo,
    monthlyRentFrom: rentRange.monthlyRentFrom ?? canonicalDevelopmentData.monthlyRentFrom,
    monthlyRentTo: rentRange.monthlyRentTo ?? canonicalDevelopmentData.monthlyRentTo,
    auctionStartDate:
      auctionRange.auctionStartDate?.toISOString() ?? canonicalDevelopmentData.auctionStartDate,
    auctionEndDate:
      auctionRange.auctionEndDate?.toISOString() ?? canonicalDevelopmentData.auctionEndDate,
    startingBidFrom: auctionRange.startingBidFrom ?? canonicalDevelopmentData.startingBidFrom,
    reservePriceFrom: auctionRange.reservePriceFrom ?? canonicalDevelopmentData.reservePriceFrom,
  });
  const canonicalSubmitSnapshot = canonicalSnapshot
    ? {
        workflowId: canonicalSnapshot.workflowId,
        currentStepId: canonicalSnapshot.currentStepId,
        completedSteps: canonicalSnapshot.completedSteps,
        stepData: {
          ...(canonicalSnapshot.stepData ?? {}),
          unit_types: {
            ...(canonicalSnapshot.stepData?.unit_types ?? {}),
            unitTypes,
          },
        },
        developmentData: {
          ...(canonicalSnapshot.developmentData ?? {}),
          developmentType,
          transactionType,
          name: canonicalDevelopmentData.name,
          subtitle: canonicalDevelopmentData.subtitle,
          tagline: canonicalDevelopmentData.tagline,
          description: canonicalDevelopmentData.description,
          status: canonicalDevelopmentData.status,
          ownershipType: normalizeSubmitOwnershipType(ownershipSource),
          ownershipTypes: canonicalDevelopmentData.ownershipTypes,
          location: canonicalDevelopmentData.location,
          monthlyLevyFrom: canonicalDevelopmentData.monthlyLevyFrom,
          monthlyLevyTo: canonicalDevelopmentData.monthlyLevyTo,
          ratesFrom: canonicalDevelopmentData.ratesFrom,
          ratesTo: canonicalDevelopmentData.ratesTo,
          transferCostsIncluded: canonicalDevelopmentData.transferCostsIncluded,
          completionDate: asOptionalString(canonicalDevelopmentData.completionDate),
          launchDate: asOptionalString(canonicalDevelopmentData.launchDate),
          amenities: canonicalAmenities ?? [],
          features,
          highlights: canonicalDevelopmentData.highlights ?? [],
          media: canonicalDevelopmentData.media,
        },
      }
    : {};

  return {
    ...canonicalSubmitSnapshot,
    name: canonicalDevelopmentData.name ?? 'Untitled Development',
    tagline: canonicalDevelopmentData.tagline ?? canonicalDevelopmentData.subtitle,
    subtitle: canonicalDevelopmentData.subtitle ?? canonicalDevelopmentData.tagline,
    description: canonicalDevelopmentData.description,
    developmentType,
    transactionType,
    ownershipType: normalizeSubmitOwnershipType(ownershipSource),
    address: canonicalDevelopmentData.location?.address,
    city: canonicalDevelopmentData.location?.city || 'Unknown',
    province: canonicalDevelopmentData.location?.province || 'Unknown',
    suburb: canonicalDevelopmentData.location?.suburb,
    postalCode: canonicalDevelopmentData.location?.postalCode,
    latitude: canonicalDevelopmentData.location?.latitude,
    longitude: canonicalDevelopmentData.location?.longitude,
    ...financialPayload,
    monthlyLevyFrom: canonicalDevelopmentData.monthlyLevyFrom,
    monthlyLevyTo: canonicalDevelopmentData.monthlyLevyTo,
    ratesFrom: canonicalDevelopmentData.ratesFrom,
    ratesTo: canonicalDevelopmentData.ratesTo,
    transferCostsIncluded: canonicalDevelopmentData.transferCostsIncluded,
    completionDate: asOptionalString(canonicalDevelopmentData.completionDate),
    launchDate: asOptionalString(canonicalDevelopmentData.launchDate),
    status: canonicalDevelopmentData.status,
    totalUnits: inventory.totalUnits ?? submitSource.totalUnits,
    availableUnits: inventory.availableUnits ?? submitSource.availableUnits,
    totalDevelopmentArea: submitSource.totalDevelopmentArea,
    erfSizeFrom: submitSource.erfSizeFrom,
    erfSizeTo: submitSource.erfSizeTo,
    floorSizeFrom: submitSource.floorSizeFrom,
    floorSizeTo: submitSource.floorSizeTo,
    bedroomsFrom: submitSource.bedroomsFrom,
    bedroomsTo: submitSource.bedroomsTo,
    bathroomsFrom: submitSource.bathroomsFrom,
    bathroomsTo: submitSource.bathroomsTo,
    petsAllowed: submitSource.petsAllowed,
    fibreReady: submitSource.fibreReady,
    solarReady: submitSource.solarReady,
    waterBackup: submitSource.waterBackup,
    backupPower: submitSource.backupPower,
    gatedCommunity: submitSource.gatedCommunity,
    featured: submitSource.featured,
    isPhasedDevelopment: submitSource.isPhasedDevelopment,
    amenities: canonicalAmenities ?? input.amenities,
    features,
    highlights: canonicalDevelopmentData.highlights ?? [],
    unitTypes,
    estateSpecs:
      submitSource.hasGoverningBody !== undefined || submitSource.governanceType
        ? {
            hasHOA: submitSource.hasGoverningBody,
            governanceType: submitSource.governanceType,
            architecturalGuidelines: submitSource.architecturalGuidelines,
            guidelinesSummary: submitSource.guidelinesSummary,
            levyRange: {
              min: canonicalDevelopmentData.monthlyLevyFrom ?? 0,
              max: canonicalDevelopmentData.monthlyLevyTo ?? 0,
            },
            rightsAndTaxes: {
              min: canonicalDevelopmentData.ratesFrom ?? 0,
              max: canonicalDevelopmentData.ratesTo ?? 0,
            },
          }
        : undefined,
    residentialConfig,
    landConfig,
    commercialConfig,
    mixedUseConfig,
    specifications,
    ...mediaPayload,
    metaTitle: submitSource.overview?.metaTitle,
    metaDescription: submitSource.overview?.metaDescription,
    keywords: submitSource.overview?.keywords,
  };
}

export function buildDevelopmentUpdatePayload(
  input: DevelopmentUpdatePayloadInput,
): Record<string, any> {
  return buildDevelopmentSubmitPayload({
    ...input,
    wizardData:
      input.wizardData ?? buildDevelopmentWizardDataFromCanonicalSnapshot(input.canonicalSnapshot),
    canonicalSnapshot: input.canonicalSnapshot,
  });
}

function getNormalizedSnapshotTransactionType(snapshot: Record<string, any> | undefined) {
  if (!snapshot) return undefined;
  const value =
    snapshot.developmentData?.transactionType ??
    snapshot.stepData?.configuration?.transactionType ??
    snapshot.stepData?.identity_market?.transactionType ??
    snapshot.transactionType;
  return value === undefined ? undefined : normalizeDevelopmentTransactionType(value);
}

function getUnitIds(units: unknown[]) {
  return new Set(
    units
      .map((unit: any) => (typeof unit?.id === 'string' ? unit.id.trim() : ''))
      .filter(Boolean),
  );
}

function assertPartialUnitTypesTransactionSwitchIsComplete(
  payload: Record<string, any>,
  options: DevelopmentPartialUpdatePayloadOptions,
) {
  if (payload.currentStepId !== 'unit_types') return;

  const previousTransactionType = getNormalizedSnapshotTransactionType(
    options.previousCanonicalSnapshot,
  );
  const nextTransactionType = getNormalizedSnapshotTransactionType(payload);
  if (!previousTransactionType || !nextTransactionType || previousTransactionType === nextTransactionType) {
    return;
  }

  const previousUnits = resolveSubmitUnitTypes(options.previousCanonicalSnapshot ?? {});
  if (previousUnits.length === 0) return;

  const nextUnitIds = getUnitIds(payload.unitTypes ?? payload.stepData?.unit_types?.unitTypes ?? []);
  const missingUnitIds = Array.from(getUnitIds(previousUnits)).filter(unitId => !nextUnitIds.has(unitId));
  if (missingUnitIds.length === 0) return;

  throw new Error(
    'Changing transaction type from a unit_types partial save requires the full unit catalogue. Review all unit types before saving.',
  );
}

export function buildDevelopmentPartialUpdatePayload(
  input: DevelopmentUpdatePayloadInput,
  options: DevelopmentPartialUpdatePayloadOptions = {},
): Record<string, any> {
  const payload = buildDevelopmentUpdatePayload(input);
  const currentStepId =
    typeof payload.currentStepId === 'string' ? payload.currentStepId : undefined;

  const stepOwnedFields = currentStepId
    ? PARTIAL_STEP_OWNED_PAYLOAD_FIELDS[currentStepId]
    : undefined;
  const partialPayload: Record<string, any> = {};

  for (const [field, value] of Object.entries(payload)) {
    if (PARTIAL_ALWAYS_ALLOWED_PAYLOAD_FIELDS.has(field) || stepOwnedFields?.has(field)) {
      partialPayload[field] = value;
    }
  }

  if (payload.stepData && typeof payload.stepData === 'object' && currentStepId) {
    partialPayload.stepData =
      payload.stepData[currentStepId] !== undefined
        ? { [currentStepId]: payload.stepData[currentStepId] }
        : {};
  }

  if (currentStepId === 'amenities_features') {
    const amenitiesStepData = partialPayload.stepData?.amenities_features;
    const hasAmenitiesStepData = amenitiesStepData && typeof amenitiesStepData === 'object';

    if (
      hasAmenitiesStepData &&
      Object.prototype.hasOwnProperty.call(amenitiesStepData, 'amenities')
    ) {
      partialPayload.amenities = normalizeAmenitiesPayload(amenitiesStepData.amenities) ?? [];
    } else {
      delete partialPayload.amenities;
    }

    if (
      hasAmenitiesStepData &&
      Object.prototype.hasOwnProperty.call(amenitiesStepData, 'features')
    ) {
      partialPayload.features = normalizeStringListPayload(amenitiesStepData.features) ?? [];
    } else {
      delete partialPayload.features;
    }
  }

  partialPayload[CANONICAL_UPDATE_MODE_FIELD] = CANONICAL_PARTIAL_UPDATE_MODE;
  assertPartialUnitTypesTransactionSwitchIsComplete(partialPayload, options);

  return partialPayload;
}

export function buildDevelopmentEditProgressPayload(
  input: DevelopmentUpdatePayloadInput,
  options: DevelopmentEditProgressPayloadOptions,
): Record<string, any> {
  if (!options?.previousCanonicalSnapshot) {
    throw new Error('Edit progress saves require a persisted canonical baseline snapshot.');
  }

  return buildDevelopmentPartialUpdatePayload(input, options);
}

export function buildDevelopmentEditSavePayload(
  input: DevelopmentUpdatePayloadInput,
  options: DevelopmentEditSavePayloadOptions = {},
): Record<string, any> {
  return options.intent === 'publish'
    ? buildDevelopmentUpdatePayload(input)
    : buildDevelopmentPartialUpdatePayload(input, options);
}
