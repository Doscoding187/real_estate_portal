import { AMENITY_REGISTRY } from '@/config/amenityRegistry';
import {
  normalizeDevelopmentTransactionType,
  stripUnitPricingForTransaction,
} from '@/lib/developmentTransactionPayload';
import {
  buildCanonicalStepDataFromDevelopmentSnapshot,
  buildCanonicalHydrationDevelopmentDataSnapshot,
  buildCanonicalHydrationSource,
  firstDefined,
  getCanonicalDevelopmentAmenities,
  getCanonicalDevelopmentLocation,
  getCanonicalDevelopmentMarketing,
  getCanonicalStepSlice,
  isPlainObject,
} from '../../../shared/developmentCanonicalSelectors';

export type HydrationParse = (value: any, fallback: any) => any;
type TransactionTypeNormalizer = (value: unknown) => unknown;

const toFiniteNumber = (value: any, fallback: number) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

export function resolveHydrationDateValue(...values: any[]) {
  const value = values.find(candidate => candidate !== undefined);
  if (value === null || value === '') return value;
  return value !== undefined ? new Date(value) : undefined;
}

export function hydrateDevelopmentConfigs(source: Record<string, any>, parse: HydrationParse) {
  return {
    residentialConfig: parse(source.residentialConfig, {
      unitMix: { studios: 0, oneBed: 0, twoBed: 0, threeBed: 0, fourPlusBed: 0 },
      priceRange: { min: null, max: null },
      sizeRange: { min: null, max: null },
      parkingOptions: [],
      levy: { from: null, to: null },
      rates: { from: null, to: null },
      residentialType: null,
      freeholdCategory: null,
      communityTypes: [],
    }),
    landConfig: parse(source.landConfig, {
      totalStands: null,
      availableStands: null,
      erfSizeFrom: null,
      erfSizeTo: null,
      priceFrom: null,
      priceTo: null,
      serviced: null,
      zoningType: null,
      buildingRestrictions: null,
      landType: null,
      infrastructure: [],
    }),
    commercialConfig: parse(source.commercialConfig, {
      totalSpace: null,
      availableSpace: null,
      spaceUnits: 'sqm',
      rentalRate: null,
      tenantType: [],
      parkingRatio: null,
      commercialType: null,
      features: [],
    }),
  };
}

export function normalizeAmenityKeys(value: unknown): string[] {
  const list = (() => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      const standard = Array.isArray((value as any).standard) ? (value as any).standard : [];
      const additional = Array.isArray((value as any).additional) ? (value as any).additional : [];
      return [...standard, ...additional];
    }
    return [];
  })();

  if (list.length === 0) return [];

  const byKey = new Set(AMENITY_REGISTRY.map(item => item.key));
  const byLabel = new Map(AMENITY_REGISTRY.map(item => [item.label.toLowerCase(), item.key]));

  return list
    .map(item => String(item ?? '').trim())
    .filter(Boolean)
    .map(item => {
      if (byKey.has(item)) return item;
      const mapped = byLabel.get(item.toLowerCase());
      return mapped ?? item;
    });
}

export function buildHydratedDevelopmentDataUpdates({
  source,
  snapshotStepData,
  currentDevelopmentData,
  normalizeTransactionType,
}: {
  source: Record<string, any>;
  snapshotStepData: Record<string, any>;
  currentDevelopmentData: Record<string, any>;
  normalizeTransactionType: TransactionTypeNormalizer;
}) {
  const sourceSelectorPayload = buildCanonicalHydrationSource(source, snapshotStepData);
  const canonicalHydrationSnapshot = buildCanonicalHydrationDevelopmentDataSnapshot(
    source,
    snapshotStepData,
  );
  const canonicalSourceLocation = getCanonicalDevelopmentLocation(sourceSelectorPayload);
  const canonicalSourceMarketing = getCanonicalDevelopmentMarketing(sourceSelectorPayload);
  const canonicalSourceAmenities = getCanonicalDevelopmentAmenities(sourceSelectorPayload);
  const developmentMediaStep = getCanonicalStepSlice(
    { stepData: snapshotStepData },
    'development_media',
  );
  const sourceMedia = sourceSelectorPayload.media ?? {};
  const hasHydrationMedia =
    Object.keys(developmentMediaStep).length > 0 ||
    source.media !== undefined ||
    source.images !== undefined ||
    source.videos !== undefined ||
    source.brochures !== undefined ||
    source.floorPlans !== undefined ||
    isPlainObject(source.developmentData?.media);
  const canonicalMediaFromStep = {
    heroImage: firstDefined(developmentMediaStep.heroImage, sourceMedia.heroImage),
    photos: firstDefined(developmentMediaStep.photos, sourceMedia.photos ?? []),
    videos: firstDefined(developmentMediaStep.videos, sourceMedia.videos ?? []),
    floorPlans: firstDefined(developmentMediaStep.floorPlans, sourceMedia.floorPlans ?? []),
    documents: firstDefined(developmentMediaStep.documents, sourceMedia.documents ?? []),
  };
  const rawAmenities = firstDefined(
    canonicalHydrationSnapshot.amenities,
    canonicalSourceAmenities.amenities,
    currentDevelopmentData.amenities,
    [],
  );
  const normalizedAmenities = normalizeAmenityKeys(rawAmenities);
  const rawHighlights = firstDefined(
    canonicalHydrationSnapshot.highlights,
    canonicalSourceMarketing.highlights,
    currentDevelopmentData.highlights,
    [],
  );

  const updates: Partial<typeof currentDevelopmentData> & Record<string, any> = {
    name: firstDefined(canonicalHydrationSnapshot.name, currentDevelopmentData.name, ''),
    subtitle: firstDefined(
      canonicalHydrationSnapshot.subtitle,
      canonicalHydrationSnapshot.tagline,
      currentDevelopmentData.subtitle,
      '',
    ),
    tagline: firstDefined(
      canonicalHydrationSnapshot.tagline,
      canonicalHydrationSnapshot.subtitle,
      currentDevelopmentData.tagline,
      '',
    ),
    description: firstDefined(
      canonicalHydrationSnapshot.description,
      currentDevelopmentData.description,
      '',
    ),

    status: firstDefined(canonicalHydrationSnapshot.status, currentDevelopmentData.status),
    nature: firstDefined(canonicalHydrationSnapshot.nature, currentDevelopmentData.nature),
    launchDate: resolveHydrationDateValue(
      canonicalHydrationSnapshot.launchDate,
      currentDevelopmentData.launchDate,
    ),
    completionDate: resolveHydrationDateValue(
      canonicalHydrationSnapshot.completionDate,
      currentDevelopmentData.completionDate,
    ),
    expectedFirstHandoverDate: resolveHydrationDateValue(
      canonicalHydrationSnapshot.expectedFirstHandoverDate,
      currentDevelopmentData.expectedFirstHandoverDate,
    ),
    handoverDuringConstruction:
      canonicalHydrationSnapshot.handoverDuringConstruction ??
      currentDevelopmentData.handoverDuringConstruction,

    transactionType:
      normalizeTransactionType(canonicalHydrationSnapshot.transactionType) ??
      currentDevelopmentData.transactionType,
    ownershipType: canonicalHydrationSnapshot.ownershipType ?? currentDevelopmentData.ownershipType,
    ownershipTypes:
      canonicalHydrationSnapshot.ownershipTypes ?? currentDevelopmentData.ownershipTypes ?? [],
    structuralType:
      source.structuralType ??
      source.developmentData?.structuralType ??
      currentDevelopmentData.structuralType,
    floors: source.floors ?? source.developmentData?.floors ?? currentDevelopmentData.floors,

    propertyTypes:
      canonicalHydrationSnapshot.propertyTypes ??
      sourceSelectorPayload.propertyTypes ??
      source.developmentData?.propertyTypes ??
      currentDevelopmentData.propertyTypes,

    location: {
      address: firstDefined(
        canonicalSourceLocation.address,
        currentDevelopmentData.location?.address,
        '',
      ),
      suburb: firstDefined(
        canonicalSourceLocation.suburb,
        currentDevelopmentData.location?.suburb,
        '',
      ),
      city: firstDefined(canonicalSourceLocation.city, currentDevelopmentData.location?.city, ''),
      province: firstDefined(
        canonicalSourceLocation.province,
        currentDevelopmentData.location?.province,
        '',
      ),
      postalCode: firstDefined(
        canonicalSourceLocation.postalCode,
        currentDevelopmentData.location?.postalCode,
        '',
      ),
      latitude: String(
        firstDefined(
          canonicalSourceLocation.latitude,
          currentDevelopmentData.location?.latitude,
          '',
        ),
      ),
      longitude: String(
        firstDefined(
          canonicalSourceLocation.longitude,
          currentDevelopmentData.location?.longitude,
          '',
        ),
      ),
    },

    media: hasHydrationMedia ? canonicalMediaFromStep : currentDevelopmentData.media,

    monthlyLevyFrom: firstDefined(
      canonicalHydrationSnapshot.monthlyLevyFrom,
      currentDevelopmentData.monthlyLevyFrom,
    ),
    monthlyLevyTo: firstDefined(
      canonicalHydrationSnapshot.monthlyLevyTo,
      currentDevelopmentData.monthlyLevyTo,
    ),
    ratesFrom: firstDefined(canonicalHydrationSnapshot.ratesFrom, currentDevelopmentData.ratesFrom),
    ratesTo: firstDefined(canonicalHydrationSnapshot.ratesTo, currentDevelopmentData.ratesTo),
    transferCostsIncluded: firstDefined(
      canonicalHydrationSnapshot.transferCostsIncluded,
      currentDevelopmentData.transferCostsIncluded,
    ),
    priceFrom: firstDefined(
      canonicalHydrationSnapshot.priceFrom,
      source.priceFrom,
      source.developmentData?.priceFrom,
      currentDevelopmentData.priceFrom,
    ),
    priceTo: firstDefined(
      canonicalHydrationSnapshot.priceTo,
      source.priceTo,
      source.developmentData?.priceTo,
      currentDevelopmentData.priceTo,
    ),
    monthlyRentFrom: firstDefined(
      canonicalHydrationSnapshot.monthlyRentFrom,
      source.monthlyRentFrom,
      source.developmentData?.monthlyRentFrom,
      currentDevelopmentData.monthlyRentFrom,
    ),
    monthlyRentTo: firstDefined(
      canonicalHydrationSnapshot.monthlyRentTo,
      source.monthlyRentTo,
      source.developmentData?.monthlyRentTo,
      currentDevelopmentData.monthlyRentTo,
    ),
    startingBidFrom: firstDefined(
      canonicalHydrationSnapshot.startingBidFrom,
      source.startingBidFrom,
      source.developmentData?.startingBidFrom,
      currentDevelopmentData.startingBidFrom,
    ),
    reservePriceFrom: firstDefined(
      canonicalHydrationSnapshot.reservePriceFrom,
      source.reservePriceFrom,
      source.developmentData?.reservePriceFrom,
      currentDevelopmentData.reservePriceFrom,
    ),

    highlights: rawHighlights,
    amenities: normalizedAmenities,
    features: firstDefined(
      canonicalHydrationSnapshot.features,
      canonicalSourceAmenities.features,
      currentDevelopmentData.features,
      [],
    ),
  };

  return {
    sourceSelectorPayload,
    updates,
    normalizedAmenities,
  };
}

export function buildHydratedStepData({
  source,
  snapshotStepData,
  hasSnapshotStepData,
  canonicalDevelopmentData,
  hydratedDevelopmentType,
  hydratedUnitTypes,
  parse,
}: {
  source: Record<string, any>;
  snapshotStepData: Record<string, any>;
  hasSnapshotStepData: boolean;
  canonicalDevelopmentData: Record<string, any>;
  hydratedDevelopmentType: unknown;
  hydratedUnitTypes: any[];
  parse: HydrationParse;
}) {
  const snapshotSelectorPayload = { stepData: snapshotStepData };
  const identityMarketStep = getCanonicalStepSlice(snapshotSelectorPayload, 'identity_market');
  const governanceFinancesStep = getCanonicalStepSlice(
    snapshotSelectorPayload,
    'governance_finances',
  );
  const levyRangeStep = isPlainObject(governanceFinancesStep.levyRange)
    ? governanceFinancesStep.levyRange
    : {};
  const rightsAndTaxesStep = isPlainObject(governanceFinancesStep.rightsAndTaxes)
    ? governanceFinancesStep.rightsAndTaxes
    : {};

  const ownershipTypesFromSource = (() => {
    const raw =
      identityMarketStep.ownershipTypes ??
      identityMarketStep.ownershipType ??
      source.ownershipTypes ??
      source.developmentData?.ownershipTypes ??
      source.ownershipType ??
      source.developmentData?.ownershipType;
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed.startsWith('[')) {
        const parsed = parse(trimmed, []);
        if (Array.isArray(parsed)) return parsed;
      }
      return trimmed ? [trimmed] : [];
    }
    if (Array.isArray(raw)) return raw;
    if (raw) return [raw];
    return [];
  })();

  const estateSpecs = parse(source.estateSpecs, {});
  const resolvedLevyRange = {
    min: toFiniteNumber(
      firstDefined(levyRangeStep.min, estateSpecs?.levyRange?.min, source.monthlyLevyFrom, 0),
      0,
    ),
    max: toFiniteNumber(
      firstDefined(levyRangeStep.max, estateSpecs?.levyRange?.max, source.monthlyLevyTo, 0),
      0,
    ),
  };
  const resolvedRightsAndTaxes = {
    min: toFiniteNumber(
      firstDefined(rightsAndTaxesStep.min, estateSpecs?.rightsAndTaxes?.min, source.ratesFrom, 0),
      0,
    ),
    max: toFiniteNumber(
      firstDefined(rightsAndTaxesStep.max, estateSpecs?.rightsAndTaxes?.max, source.ratesTo, 0),
      0,
    ),
  };

  const reconstructedStepData = buildCanonicalStepDataFromDevelopmentSnapshot(
    {
      ...canonicalDevelopmentData,
      developmentType: hydratedDevelopmentType,
      ownershipTypes: ownershipTypesFromSource,
    },
    hydratedUnitTypes,
  );
  reconstructedStepData.governance_finances = {
    ...reconstructedStepData.governance_finances,
    hasGoverningBody: governanceFinancesStep.hasGoverningBody ?? estateSpecs?.hasHOA ?? false,
    governanceType: governanceFinancesStep.governanceType ?? estateSpecs?.governanceType ?? '',
    levyRange: resolvedLevyRange,
    architecturalGuidelines:
      governanceFinancesStep.architecturalGuidelines ??
      estateSpecs?.architecturalGuidelines ??
      false,
    guidelinesSummary:
      governanceFinancesStep.guidelinesSummary ?? estateSpecs?.guidelinesSummary ?? '',
    rightsAndTaxes: resolvedRightsAndTaxes,
    transferCostsIncluded: canonicalDevelopmentData.transferCostsIncluded,
  };

  if (!hasSnapshotStepData) {
    return reconstructedStepData;
  }

  return {
    ...reconstructedStepData,
    ...snapshotStepData,
    configuration: {
      ...(reconstructedStepData.configuration ?? {}),
      ...(snapshotStepData.configuration ?? {}),
    },
    identity_market: {
      ...(reconstructedStepData.identity_market ?? {}),
      ...(snapshotStepData.identity_market ?? {}),
      ownershipTypes: ownershipTypesFromSource,
    },
    location: {
      ...(reconstructedStepData.location ?? {}),
      ...(snapshotStepData.location ?? {}),
    },
    governance_finances: {
      ...(reconstructedStepData.governance_finances ?? {}),
      ...(snapshotStepData.governance_finances ?? {}),
      levyRange: resolvedLevyRange,
      rightsAndTaxes: resolvedRightsAndTaxes,
      transferCostsIncluded: canonicalDevelopmentData.transferCostsIncluded,
    },
    amenities_features: {
      ...(reconstructedStepData.amenities_features ?? {}),
      ...(snapshotStepData.amenities_features ?? {}),
    },
    marketing_summary: {
      ...(reconstructedStepData.marketing_summary ?? {}),
      ...(snapshotStepData.marketing_summary ?? {}),
    },
    development_media: {
      ...(reconstructedStepData.development_media ?? {}),
      ...(snapshotStepData.development_media ?? {}),
    },
    unit_types: {
      ...(reconstructedStepData.unit_types ?? {}),
      ...(snapshotStepData.unit_types ?? {}),
      unitTypes: hydratedUnitTypes,
    },
  };
}

function inferHydratedUnitCategory(
  unit: Record<string, any>,
  classification: Record<string, any>,
  structuralTypeValue?: string,
) {
  if (unit.unitCategory === 'house' || unit.unitCategory === 'apartment') {
    return unit.unitCategory;
  }
  if (classification?.category === 'house' || classification?.category === 'apartment') {
    return classification.category;
  }
  return ['freestanding-house', 'simplex', 'duplex', 'townhouse', 'plot-and-plan'].includes(
    String(structuralTypeValue || ''),
  )
    ? 'house'
    : 'apartment';
}

function inferHydratedUnitSubType(
  unit: Record<string, any>,
  classification: Record<string, any>,
  unitCategory: 'house' | 'apartment',
  structuralTypeValue?: string,
) {
  if (typeof unit.unitSubType === 'string' && unit.unitSubType.trim().length > 0) {
    return unit.unitSubType;
  }
  if (typeof classification?.subType === 'string' && classification.subType.trim().length > 0) {
    return classification.subType;
  }
  return structuralTypeValue || (unitCategory === 'house' ? 'freestanding-house' : 'apartment');
}

export function normalizeHydratedUnitTypeForState(
  unit: Record<string, any>,
  index: number,
  transactionType: unknown,
  parse: HydrationParse,
) {
  const id = unit.id || `unit-${Date.now()}-${index}`;
  const parsedSpecifications = parse(unit.specifications, {
    builtInFeatures: {},
    finishes: {},
    electrical: {},
  });
  const storedClassification = parsedSpecifications?.classification ?? {};
  const structuralTypeValue = unit.structuralType || undefined;
  const unitCategory = inferHydratedUnitCategory(unit, storedClassification, structuralTypeValue);
  const unitSubType = inferHydratedUnitSubType(
    unit,
    storedClassification,
    unitCategory,
    structuralTypeValue,
  );

  const hydratedUnit = {
    id,
    label: unit.label || unit.name || 'Unnamed Unit',
    name: unit.name || unit.label || 'Unnamed Unit',
    configDescription: unit.configDescription || unit.description || '',

    floors: unit.floors || undefined,
    bedrooms: Number(unit.bedrooms ?? 0),
    bathrooms: Number(unit.bathrooms ?? 0),
    unitSize: Number(unit.unitSize ?? unit.floorSize ?? 0),
    yardSize: unit.yardSize ? Number(unit.yardSize) : undefined,

    ownershipType: unit.ownershipType || undefined,
    structuralType: structuralTypeValue,
    unitCategory,
    unitSubType,

    parkingType: unit.parkingType ?? 'none',
    parkingBays: Number(unit.parkingBays ?? unit.parkingSpaces ?? 0),

    priceFrom: Number(unit.priceFrom ?? unit.basePriceFrom ?? 0),
    priceTo: Number(unit.priceTo ?? unit.basePriceTo ?? unit.priceFrom ?? unit.basePriceFrom ?? 0),
    basePriceFrom: unit.basePriceFrom ? Number(unit.basePriceFrom) : undefined,
    basePriceTo: unit.basePriceTo ? Number(unit.basePriceTo) : undefined,
    monthlyRentFrom: unit.monthlyRentFrom ? Number(unit.monthlyRentFrom) : undefined,
    monthlyRentTo: unit.monthlyRentTo ? Number(unit.monthlyRentTo) : undefined,
    leaseTerm: unit.leaseTerm || undefined,
    isFurnished: unit.isFurnished ?? undefined,
    depositRequired: unit.depositRequired ? Number(unit.depositRequired) : undefined,
    startingBid: unit.startingBid != null ? Number(unit.startingBid) : undefined,
    reservePrice: unit.reservePrice != null ? Number(unit.reservePrice) : undefined,
    auctionStartDate: unit.auctionStartDate || undefined,
    auctionEndDate: unit.auctionEndDate || undefined,
    auctionStatus: unit.auctionStatus || undefined,

    availableUnits: Number(unit.availableUnits ?? 0),
    reservedUnits: Number(unit.reservedUnits ?? 0),
    totalUnits: Number(unit.totalUnits ?? 0),
    completionDate: unit.completionDate || undefined,

    amenities: parse(unit.amenities, { standard: [], additional: [] }),
    specifications: parsedSpecifications,
    baseMedia: parse(unit.baseMedia, { gallery: [], floorPlans: [], renders: [] }),
    features: parse(unit.features, {
      kitchen: [],
      bathroom: [],
      flooring: [],
      storage: [],
      climate: [],
      security: [],
      outdoor: [],
      other: [],
    }),
    extras: parse(unit.extras, []),
    specs: parse(unit.specs, []),

    baseFeatures: parse(unit.baseFeatures, {}),
    baseFinishes: parse(unit.baseFinishes, {}),
    specOverrides: parse(unit.specOverrides, {}),

    virtualTourLink: unit.virtualTourLink || '',
    transferCostsIncluded: !!unit.transferCostsIncluded,
    internalNotes: unit.internalNotes || '',
    isActive: unit.isActive !== false,
    displayOrder: unit.displayOrder ?? index,
  };

  return stripUnitPricingForTransaction(
    hydratedUnit,
    normalizeDevelopmentTransactionType(transactionType),
  );
}
