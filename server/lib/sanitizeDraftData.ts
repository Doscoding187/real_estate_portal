// server/lib/sanitizeDraftData.ts
import {
  buildCanonicalDevelopmentDataSnapshot,
  firstDefined,
  getCanonicalDevelopmentEditTargetId,
  getCanonicalDevelopmentConfiguration,
  getCanonicalDevelopmentMedia,
  getCanonicalDevelopmentUnitTypes,
  hasCanonicalKeys,
} from '../../shared/developmentCanonicalSelectors';
import { normalizeDevelopmentWorkflowState } from './developmentWorkflowProgress';

type AnyObj = Record<string, any>;

const isPlainObject = (v: any): v is AnyObj =>
  !!v && typeof v === 'object' && (v.constructor === Object || Object.getPrototypeOf(v) === null);

const isFileLike = (v: any) =>
  !!v && typeof v === 'object' && (v instanceof Blob || v instanceof File);

function deepStripNonSerializable(value: any): any {
  if (value == null) return value;
  if (isFileLike(value)) return undefined;

  if (Array.isArray(value)) {
    return value.map(deepStripNonSerializable).filter(v => v !== undefined);
  }

  if (isPlainObject(value)) {
    const out: AnyObj = {};
    for (const [k, v] of Object.entries(value)) {
      const cleaned = deepStripNonSerializable(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }

  return value;
}

const asString = (v: any, def = ''): string =>
  typeof v === 'string' ? v : v == null ? def : String(v);

const asNumber = (v: any, def = 0): number => {
  const n = typeof v === 'number' ? v : v == null ? NaN : Number(v);
  return Number.isFinite(n) ? n : def;
};

const hasOwn = (obj: any, key: string) => Object.prototype.hasOwnProperty.call(obj ?? {}, key);

const pickStringField = (cleaned: any, keys: string[], def = '') => {
  const key = keys.find(candidate => hasOwn(cleaned, candidate));
  return key ? { [keys[0]]: asString(cleaned[key] ?? def) } : {};
};

const asArray = <T = any>(v: any, def: T[] = []): T[] => (Array.isArray(v) ? v : def);

const clampInt = (v: any, min: number, max: number, def: number) => {
  const n = Math.floor(asNumber(v, def));
  return Math.min(max, Math.max(min, n));
};

type DraftTransactionType = 'for_sale' | 'for_rent' | 'auction';

function normalizeTransactionType(value: unknown): DraftTransactionType {
  const normalized = asString(value)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (['for_rent', 'rent', 'to_rent', 'rental', 'rent_to_buy'].includes(normalized)) {
    return 'for_rent';
  }
  if (['auction', 'auctions'].includes(normalized)) return 'auction';
  return 'for_sale';
}

const normalizeMediaItem = (m: any, fallbackType = 'image', fallbackCategory = 'general') => {
  if (!m) return null;
  const url = typeof m === 'string' ? m : m.url;
  if (!url || typeof url !== 'string') return null;

  return {
    id: asString(m.id ?? `media-${Date.now()}-${Math.random()}`),
    url,
    type: asString(m.type ?? fallbackType),
    category: asString(m.category ?? fallbackCategory),
    isPrimary: Boolean(m.isPrimary),
    displayOrder: clampInt(m.displayOrder, 0, 9999, 0),
  };
};

const normalizeMedia = (raw: any) => {
  const hero = normalizeMediaItem(raw?.heroImage ?? raw?.hero ?? raw?.primary, 'image', 'featured');
  const photos = asArray(raw?.photos ?? raw?.gallery)
    .map(item => normalizeMediaItem(item, 'image', 'general'))
    .filter(Boolean);
  const videos = asArray(raw?.videos)
    .map(item => normalizeMediaItem(item, 'video', 'video'))
    .filter(Boolean);
  const floorPlans = asArray(raw?.floorPlans)
    .map(item => normalizeMediaItem(item, 'document', 'floor_plan'))
    .filter(Boolean);
  const documents = asArray(raw?.documents ?? raw?.brochures)
    .map(item => normalizeMediaItem(item, 'document', 'document'))
    .filter(Boolean);

  let heroImage = hero;
  if (!heroImage && photos.length) {
    const pick = photos.find((p: any) => p.category === 'featured' || p.isPrimary) ?? photos[0];
    heroImage = {
      ...pick,
      id: asString(pick?.id ?? `media-${Date.now()}-${Math.random()}`),
      url: asString(pick?.url ?? ''),
      type: asString(pick?.type ?? 'image'),
      category: 'featured',
      isPrimary: true,
      displayOrder: clampInt(pick?.displayOrder, 0, 9999, 0),
    };
    const rest = photos.filter((p: any) => p.id !== heroImage!.id);
    return { heroImage, photos: rest, videos, floorPlans, documents };
  }

  return { heroImage: heroImage ?? undefined, photos, videos, floorPlans, documents };
};

const normalizeUnitType = (u: any, transactionType: DraftTransactionType) => {
  const cleaned = deepStripNonSerializable(u) ?? {};
  const totalUnits = clampInt(cleaned.totalUnits, 0, 1_000_000, 0);
  const reservedUnitsRaw = clampInt(cleaned.reservedUnits, 0, 1_000_000, 0);
  const availableUnitsRaw = clampInt(cleaned.availableUnits, 0, 1_000_000, 0);
  const reservedUnits = Math.min(reservedUnitsRaw, totalUnits);
  const availableUnits = Math.min(availableUnitsRaw, Math.max(0, totalUnits - reservedUnits));
  const priceFrom = asNumber(cleaned.priceFrom ?? cleaned.basePriceFrom, 0);
  const priceTo = asNumber(cleaned.priceTo ?? cleaned.basePriceTo ?? priceFrom, 0);
  const monthlyRentFrom = asNumber(cleaned.monthlyRentFrom ?? cleaned.monthlyRent, 0);
  const monthlyRentTo = asNumber(cleaned.monthlyRentTo ?? monthlyRentFrom, 0);
  const startingBid = asNumber(cleaned.startingBid, 0);
  const reservePrice = asNumber(cleaned.reservePrice ?? startingBid, 0);

  const normalized = {
    ...cleaned,
    id: asString(cleaned.id ?? `unit-${Date.now()}-${Math.random()}`),
    name: asString(cleaned.name ?? ''),
    bedrooms: clampInt(cleaned.bedrooms, 0, 20, 0),
    bathrooms: clampInt(cleaned.bathrooms, 0, 20, 0),
    parkingType: asString(cleaned.parkingType ?? cleaned.parking ?? 'none') || 'none',
    parkingBays: clampInt(cleaned.parkingBays ?? cleaned.parkingSpaces, 0, 20, 0),
    leaseTerm: asString(cleaned.leaseTerm ?? ''),
    isFurnished: Boolean(cleaned.isFurnished),
    depositRequired: asNumber(cleaned.depositRequired ?? cleaned.deposit, 0),
    totalUnits,
    availableUnits,
    reservedUnits,
  };

  if (transactionType === 'for_sale') {
    if (hasOwn(cleaned, 'priceFrom') || hasOwn(cleaned, 'basePriceFrom')) {
      normalized.priceFrom = priceFrom;
    }
    if (
      hasOwn(cleaned, 'priceTo') ||
      hasOwn(cleaned, 'basePriceTo') ||
      hasOwn(cleaned, 'priceFrom') ||
      hasOwn(cleaned, 'basePriceFrom')
    ) {
      normalized.priceTo =
        priceTo > 0 && priceFrom > 0 && priceTo < priceFrom ? priceFrom : priceTo;
    }
    delete normalized.basePriceFrom;
    delete normalized.basePriceTo;
    delete normalized.monthlyRentFrom;
    delete normalized.monthlyRentTo;
    delete normalized.monthlyRent;
    delete normalized.leaseTerm;
    delete normalized.isFurnished;
    delete normalized.depositRequired;
    delete normalized.startingBid;
    delete normalized.reservePrice;
    delete normalized.auctionStartDate;
    delete normalized.auctionEndDate;
    delete normalized.auctionStatus;
    return normalized;
  }

  if (transactionType === 'for_rent') {
    if (hasOwn(cleaned, 'monthlyRentFrom') || hasOwn(cleaned, 'monthlyRent')) {
      normalized.monthlyRentFrom = monthlyRentFrom;
    }
    if (
      hasOwn(cleaned, 'monthlyRentTo') ||
      hasOwn(cleaned, 'monthlyRentFrom') ||
      hasOwn(cleaned, 'monthlyRent')
    ) {
      normalized.monthlyRentTo =
        monthlyRentTo > 0 && monthlyRentFrom > 0 && monthlyRentTo < monthlyRentFrom
          ? monthlyRentFrom
          : monthlyRentTo;
    }
    delete normalized.priceFrom;
    delete normalized.priceTo;
    delete normalized.basePriceFrom;
    delete normalized.basePriceTo;
    delete normalized.startingBid;
    delete normalized.reservePrice;
    delete normalized.auctionStartDate;
    delete normalized.auctionEndDate;
    delete normalized.auctionStatus;
    return normalized;
  }

  if (hasOwn(cleaned, 'startingBid')) {
    normalized.startingBid = startingBid;
  }
  if (hasOwn(cleaned, 'reservePrice') || hasOwn(cleaned, 'startingBid')) {
    normalized.reservePrice =
      reservePrice > 0 && startingBid > 0 && reservePrice < startingBid
        ? startingBid
        : reservePrice;
  }
  Object.assign(
    normalized,
    pickStringField(cleaned, ['auctionStartDate']),
    pickStringField(cleaned, ['auctionEndDate']),
    pickStringField(cleaned, ['auctionStatus'], 'scheduled'),
  );
  delete normalized.priceFrom;
  delete normalized.priceTo;
  delete normalized.basePriceFrom;
  delete normalized.basePriceTo;
  delete normalized.monthlyRentFrom;
  delete normalized.monthlyRentTo;
  delete normalized.monthlyRent;
  delete normalized.leaseTerm;
  delete normalized.isFurnished;
  delete normalized.depositRequired;
  return normalized;
};

// NOTE: clean-slate: only new | phase
const normalizeNature = (v: any) => (v === 'phase' ? 'phase' : 'new');

const normalizeStepData = (value: unknown, unitTypes: any[], media?: AnyObj) => {
  const cleaned = deepStripNonSerializable(value);
  const stepData = isPlainObject(cleaned) ? cleaned : {};
  const existingMediaStep = isPlainObject((stepData as any).development_media)
    ? (stepData as any).development_media
    : {};
  const canonicalMediaStep = isPlainObject(media)
    ? {
        ...existingMediaStep,
        heroImage: media.heroImage,
        photos: asArray(media.photos, []),
        videos: asArray(media.videos, []),
        floorPlans: asArray(media.floorPlans, []),
        documents: asArray(media.documents, []),
      }
    : existingMediaStep;

  return {
    ...stepData,
    development_media: canonicalMediaStep,
    unit_types: {
      ...(isPlainObject((stepData as any).unit_types) ? (stepData as any).unit_types : {}),
      unitTypes,
    },
  };
};

const getCanonicalUnitTypes = (draft: AnyObj): any[] => {
  return asArray(getCanonicalDevelopmentUnitTypes(draft), []);
};

export function sanitizeDraftData(input: unknown) {
  const raw = deepStripNonSerializable(input);
  const draft = isPlainObject(raw) ? raw : {};

  // prefer nested if present
  const ddRaw = isPlainObject(draft.developmentData) ? draft.developmentData : draft;
  const canonicalConfiguration = getCanonicalDevelopmentConfiguration(draft);
  const canonicalSnapshot = buildCanonicalDevelopmentDataSnapshot(draft);

  const transactionType = normalizeTransactionType(canonicalConfiguration.transactionType);
  const rawHighlights = canonicalSnapshot.highlights;
  const canonicalMedia = getCanonicalDevelopmentMedia(draft);
  const rawMedia = hasCanonicalKeys(canonicalMedia)
    ? canonicalMedia
    : firstDefined(ddRaw.media, draft.media, {});

  const developmentData = {
    ...ddRaw,
    name: asString(canonicalSnapshot.name ?? ''),
    description: asString(canonicalSnapshot.description ?? ''),
    transactionType,
    developmentType: asString(canonicalSnapshot.developmentType ?? 'residential'),
    tagline: asString(canonicalSnapshot.tagline ?? ''),
    subtitle: asString(canonicalSnapshot.subtitle ?? canonicalSnapshot.tagline ?? ''),
    status: canonicalSnapshot.status,
    nature: normalizeNature(canonicalSnapshot.nature),
    ownershipTypes: asArray(canonicalSnapshot.ownershipTypes, []),
    ownershipType: canonicalSnapshot.ownershipType,
    marketingRole: canonicalSnapshot.marketingRole,
    launchDate: canonicalSnapshot.launchDate,
    completionDate: canonicalSnapshot.completionDate,
    expectedFirstHandoverDate: canonicalSnapshot.expectedFirstHandoverDate,
    handoverDuringConstruction: canonicalSnapshot.handoverDuringConstruction,
    monthlyLevyFrom: firstDefined(canonicalSnapshot.monthlyLevyFrom, ddRaw.monthlyLevyFrom),
    monthlyLevyTo: firstDefined(canonicalSnapshot.monthlyLevyTo, ddRaw.monthlyLevyTo),
    ratesFrom: firstDefined(canonicalSnapshot.ratesFrom, ddRaw.ratesFrom),
    ratesTo: firstDefined(canonicalSnapshot.ratesTo, ddRaw.ratesTo),
    transferCostsIncluded: firstDefined(
      canonicalSnapshot.transferCostsIncluded,
      ddRaw.transferCostsIncluded,
    ),
    location: {
      address: asString(canonicalSnapshot.location?.address ?? ''),
      city: asString(canonicalSnapshot.location?.city ?? ''),
      province: asString(canonicalSnapshot.location?.province ?? ''),
      suburb: asString(canonicalSnapshot.location?.suburb ?? ''),
      postalCode: asString(canonicalSnapshot.location?.postalCode ?? ''),
      latitude: asString(canonicalSnapshot.location?.latitude ?? ''),
      longitude: asString(canonicalSnapshot.location?.longitude ?? ''),
    },
    amenities: asArray(canonicalSnapshot.amenities, []),
    features: asArray(canonicalSnapshot.features, []),
    highlights: asArray(rawHighlights, []),
    media: normalizeMedia(rawMedia),
  };

  const unitTypes = getCanonicalUnitTypes(draft).map(unit =>
    normalizeUnitType(unit, transactionType),
  );
  const stepData = normalizeStepData(draft.stepData, unitTypes, developmentData.media);
  const workflowState = normalizeDevelopmentWorkflowState(draft);
  const editTargetId = getCanonicalDevelopmentEditTargetId(draft);

  return {
    // Wizard keys (sanitized)
    currentPhase: clampInt(draft.currentPhase, 1, 11, 1),
    currentStep: clampInt(draft.currentStep, 1, 999, 1),
    workflowId: workflowState.workflowId,
    currentStepId: workflowState.currentStepId,
    completedSteps: workflowState.completedSteps,
    stepData,
    ...(editTargetId ? { editingId: editTargetId, developmentId: editTargetId } : {}),

    // keep these if your client sends them
    developmentType: developmentData.developmentType,
    residentialConfig: isPlainObject(draft.residentialConfig)
      ? draft.residentialConfig
      : { residentialType: null, communityTypes: [], securityFeatures: [] },
    landConfig: isPlainObject(draft.landConfig)
      ? draft.landConfig
      : { landType: null, infrastructure: [] },
    commercialConfig: isPlainObject(draft.commercialConfig)
      ? draft.commercialConfig
      : { commercialType: null, features: [] },

    listingIdentity: isPlainObject(draft.listingIdentity)
      ? draft.listingIdentity
      : { identityType: 'developer' },
    estateProfile: isPlainObject(draft.estateProfile) ? draft.estateProfile : {},
    selectedAmenities: asArray(draft.selectedAmenities, []),

    classification: isPlainObject(draft.classification) ? draft.classification : {},
    overview: isPlainObject(draft.overview) ? draft.overview : {},
    finalisation: isPlainObject(draft.finalisation) ? draft.finalisation : {},

    unitTypes,

    // canonical nested block (always present)
    developmentData,

    _version: asString(draft._version ?? '3.0'),
    _savedAt: draft._savedAt ?? Date.now(),
  };
}
