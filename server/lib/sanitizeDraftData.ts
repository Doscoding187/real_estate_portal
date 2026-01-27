// server/lib/sanitizeDraftData.ts
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

const asArray = <T = any>(v: any, def: T[] = []): T[] => (Array.isArray(v) ? v : def);

const clampInt = (v: any, min: number, max: number, def: number) => {
  const n = Math.floor(asNumber(v, def));
  return Math.min(max, Math.max(min, n));
};

const normalizeMediaItem = (m: any) => {
  if (!m) return null;
  const url = typeof m === 'string' ? m : m.url;
  if (!url || typeof url !== 'string') return null;

  return {
    id: asString(m.id ?? `media-${Date.now()}-${Math.random()}`),
    url,
    type: asString(m.type ?? 'image'),
    category: asString(m.category ?? 'general'),
    isPrimary: Boolean(m.isPrimary),
    displayOrder: clampInt(m.displayOrder, 0, 9999, 0),
  };
};

const normalizeMedia = (raw: any) => {
  const hero = normalizeMediaItem(raw?.heroImage ?? raw?.hero ?? raw?.primary);
  const photos = asArray(raw?.photos ?? raw?.gallery)
    .map(normalizeMediaItem)
    .filter(Boolean);
  const videos = asArray(raw?.videos).map(normalizeMediaItem).filter(Boolean);
  const documents = asArray(raw?.documents ?? raw?.brochures)
    .map(normalizeMediaItem)
    .filter(Boolean);

  let heroImage = hero;
  if (!heroImage && photos.length) {
    const pick = photos.find((p: any) => p.category === 'featured' || p.isPrimary) ?? photos[0];
    heroImage = { ...pick, category: 'featured', isPrimary: true };
    const rest = photos.filter((p: any) => p.id !== heroImage!.id);
    return { heroImage, photos: rest, videos, documents };
  }

  return { heroImage: heroImage ?? undefined, photos, videos, documents };
};

const normalizeUnitType = (u: any) => {
  const cleaned = deepStripNonSerializable(u) ?? {};
  return {
    ...cleaned,
    id: asString(cleaned.id ?? `unit-${Date.now()}-${Math.random()}`),
    name: asString(cleaned.name ?? ''),
    bedrooms: clampInt(cleaned.bedrooms, 0, 20, 0),
    bathrooms: clampInt(cleaned.bathrooms, 0, 20, 0),
    parkingType: asString(cleaned.parkingType ?? cleaned.parking ?? 'none') || 'none',
    parkingBays: clampInt(cleaned.parkingBays ?? cleaned.parkingSpaces, 0, 20, 0),
    priceFrom: asNumber(cleaned.priceFrom ?? cleaned.basePriceFrom, 0),
    priceTo: asNumber(
      cleaned.priceTo ?? cleaned.basePriceTo ?? cleaned.priceFrom ?? cleaned.basePriceFrom,
      0,
    ),
    monthlyRentFrom: asNumber(cleaned.monthlyRentFrom ?? cleaned.monthlyRent, 0),
    monthlyRentTo: asNumber(
      cleaned.monthlyRentTo ?? cleaned.monthlyRentFrom ?? cleaned.monthlyRent,
      0,
    ),
    leaseTerm: asString(cleaned.leaseTerm ?? ''),
    isFurnished: Boolean(cleaned.isFurnished),
    depositRequired: asNumber(cleaned.depositRequired ?? cleaned.deposit, 0),
    startingBid: asNumber(cleaned.startingBid, 0),
    reservePrice: asNumber(cleaned.reservePrice, 0),
    auctionStartDate: asString(cleaned.auctionStartDate ?? ''),
    auctionEndDate: asString(cleaned.auctionEndDate ?? ''),
    auctionStatus: asString(cleaned.auctionStatus ?? 'scheduled'),
    totalUnits: clampInt(cleaned.totalUnits, 0, 1_000_000, 0),
    availableUnits: clampInt(cleaned.availableUnits, 0, 1_000_000, 0),
  };
};

// NOTE: clean-slate: only new | phase
const normalizeNature = (v: any) => (v === 'phase' ? 'phase' : 'new');

export function sanitizeDraftData(input: unknown) {
  const raw = deepStripNonSerializable(input);
  const draft = isPlainObject(raw) ? raw : {};

  // prefer nested if present
  const ddRaw = isPlainObject(draft.developmentData) ? draft.developmentData : draft;

  const developmentData = {
    ...ddRaw,
    name: asString(ddRaw.name ?? ddRaw.developmentName ?? ''),
    description: asString(ddRaw.description ?? ''),
    nature: normalizeNature(ddRaw.nature),
    location: {
      address: asString(ddRaw.location?.address ?? ddRaw.address ?? ''),
      city: asString(ddRaw.location?.city ?? ddRaw.city ?? ''),
      province: asString(ddRaw.location?.province ?? ddRaw.province ?? ''),
      suburb: asString(ddRaw.location?.suburb ?? ddRaw.suburb ?? ''),
      postalCode: asString(ddRaw.location?.postalCode ?? ddRaw.postalCode ?? ''),
      latitude: asString(ddRaw.location?.latitude ?? ddRaw.latitude ?? ''),
      longitude: asString(ddRaw.location?.longitude ?? ddRaw.longitude ?? ''),
    },
    amenities: asArray(ddRaw.amenities, []),
    highlights: asArray(ddRaw.highlights, []),
    media: normalizeMedia(ddRaw.media ?? draft.media ?? {}),
  };

  return {
    // Wizard keys (sanitized)
    currentPhase: clampInt(draft.currentPhase, 1, 11, 1),

    // keep these if your client sends them
    developmentType: asString(draft.developmentType ?? 'residential'),
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

    unitTypes: asArray(draft.unitTypes, []).map(normalizeUnitType),

    // canonical nested block (always present)
    developmentData,
  };
}
