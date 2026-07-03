export type CanonicalRecord = Record<string, any>;

export function isPlainObject(value: unknown): value is CanonicalRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export const firstDefined = (...values: any[]) => values.find(value => value !== undefined);

export const hasOwnDefined = (source: CanonicalRecord, key: string) =>
  Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined;

export function toCanonicalPositiveInteger(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : value == null ? NaN : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : undefined;
}

export function getCanonicalDevelopmentEditTargetId(payload: CanonicalRecord): number | undefined {
  return (
    toCanonicalPositiveInteger(payload.editingId) ??
    toCanonicalPositiveInteger(payload.developmentId) ??
    toCanonicalPositiveInteger(payload.existingDevelopmentId) ??
    toCanonicalPositiveInteger(payload.id)
  );
}

export function getCanonicalStepData(payload: CanonicalRecord): CanonicalRecord {
  return isPlainObject(payload?.stepData) ? payload.stepData : {};
}

export function getCanonicalStepSlice(payload: CanonicalRecord, key: string): CanonicalRecord {
  const stepData = getCanonicalStepData(payload);
  return isPlainObject(stepData[key]) ? stepData[key] : {};
}

export function getCanonicalDevelopmentData(payload: CanonicalRecord): CanonicalRecord {
  return isPlainObject(payload?.developmentData) ? payload.developmentData : {};
}

export function getCanonicalDevelopmentConfiguration(payload: CanonicalRecord): CanonicalRecord {
  const developmentData = getCanonicalDevelopmentData(payload);
  const configuration = getCanonicalStepSlice(payload, 'configuration');
  const identityMarket = getCanonicalStepSlice(payload, 'identity_market');

  return {
    developmentType: firstDefined(
      configuration.developmentType,
      developmentData.developmentType,
      payload.developmentType,
    ),
    transactionType: firstDefined(
      identityMarket.transactionType,
      configuration.transactionType,
      developmentData.transactionType,
      payload.transactionType,
      payload.listingType,
    ),
  };
}

export function getCanonicalDevelopmentIdentity(payload: CanonicalRecord): CanonicalRecord {
  const developmentData = getCanonicalDevelopmentData(payload);
  const identityMarket = getCanonicalStepSlice(payload, 'identity_market');
  const ownershipTypes = firstDefined(
    identityMarket.ownershipTypes,
    developmentData.ownershipTypes,
    payload.ownershipTypes,
  );

  return {
    name: firstDefined(
      identityMarket.name,
      developmentData.name,
      developmentData.developmentName,
      payload.name,
      payload.developmentName,
    ),
    subtitle: firstDefined(identityMarket.subtitle, developmentData.subtitle, payload.subtitle),
    status: firstDefined(identityMarket.status, developmentData.status, payload.status),
    nature: firstDefined(identityMarket.nature, developmentData.nature, payload.nature),
    ownershipTypes,
    ownershipType: firstDefined(
      identityMarket.ownershipType,
      Array.isArray(identityMarket.ownershipTypes) ? identityMarket.ownershipTypes[0] : undefined,
      developmentData.ownershipType,
      Array.isArray(developmentData.ownershipTypes) ? developmentData.ownershipTypes[0] : undefined,
      Array.isArray(ownershipTypes) ? ownershipTypes[0] : undefined,
      payload.ownershipType,
    ),
    marketingRole: firstDefined(
      identityMarket.marketingRole,
      developmentData.marketingRole,
      payload.marketingRole,
    ),
    launchDate: firstDefined(
      identityMarket.launchDate,
      developmentData.launchDate,
      payload.launchDate,
    ),
    completionDate: firstDefined(
      identityMarket.completionDate,
      developmentData.completionDate,
      payload.completionDate,
    ),
    expectedFirstHandoverDate: firstDefined(
      identityMarket.expectedFirstHandoverDate,
      developmentData.expectedFirstHandoverDate,
      payload.expectedFirstHandoverDate,
    ),
    handoverDuringConstruction: firstDefined(
      identityMarket.handoverDuringConstruction,
      developmentData.handoverDuringConstruction,
      payload.handoverDuringConstruction,
    ),
  };
}

export function getCanonicalDevelopmentLocation(payload: CanonicalRecord): CanonicalRecord {
  const developmentData = getCanonicalDevelopmentData(payload);
  const location = isPlainObject(developmentData.location) ? developmentData.location : {};
  const payloadLocation = isPlainObject(payload.location) ? payload.location : {};
  const locationStep = getCanonicalStepSlice(payload, 'location');

  return {
    address: firstDefined(
      locationStep.address,
      developmentData.address,
      location.address,
      payload.address,
      payloadLocation.address,
    ),
    city: firstDefined(
      locationStep.city,
      developmentData.city,
      location.city,
      payload.city,
      payloadLocation.city,
    ),
    province: firstDefined(
      locationStep.province,
      developmentData.province,
      location.province,
      payload.province,
      payloadLocation.province,
    ),
    suburb: firstDefined(
      locationStep.suburb,
      developmentData.suburb,
      location.suburb,
      payload.suburb,
      payloadLocation.suburb,
    ),
    postalCode: firstDefined(
      locationStep.postalCode,
      developmentData.postalCode,
      location.postalCode,
      payload.postalCode,
      payloadLocation.postalCode,
    ),
    latitude: firstDefined(
      locationStep.latitude,
      developmentData.latitude,
      location.latitude,
      payload.latitude,
      payloadLocation.latitude,
    ),
    longitude: firstDefined(
      locationStep.longitude,
      developmentData.longitude,
      location.longitude,
      payload.longitude,
      payloadLocation.longitude,
    ),
  };
}

export function getCanonicalDevelopmentMarketing(payload: CanonicalRecord): CanonicalRecord {
  const developmentData = getCanonicalDevelopmentData(payload);
  const identityMarket = getCanonicalStepSlice(payload, 'identity_market');
  const marketingSummary = getCanonicalStepSlice(payload, 'marketing_summary');

  return {
    description: firstDefined(
      marketingSummary.description,
      developmentData.description,
      payload.description,
    ),
    tagline: firstDefined(
      marketingSummary.tagline,
      identityMarket.tagline,
      developmentData.tagline,
      identityMarket.subtitle,
      developmentData.subtitle,
      payload.tagline,
    ),
    highlights: firstDefined(
      marketingSummary.keySellingPoints,
      marketingSummary.highlights,
      developmentData.highlights,
      payload.highlights,
    ),
  };
}

export function getCanonicalDevelopmentAmenities(payload: CanonicalRecord): CanonicalRecord {
  const developmentData = getCanonicalDevelopmentData(payload);
  const amenitiesFeatures = getCanonicalStepSlice(payload, 'amenities_features');

  return {
    amenities: firstDefined(
      amenitiesFeatures.amenities,
      developmentData.amenities,
      payload.amenities,
    ),
    features: firstDefined(amenitiesFeatures.features, developmentData.features, payload.features),
  };
}

export const hasCanonicalKeys = (value: unknown): value is CanonicalRecord =>
  isPlainObject(value) && Object.keys(value).length > 0;

export function getCanonicalDevelopmentGovernanceFinances(
  payload: CanonicalRecord,
): CanonicalRecord {
  const developmentData = getCanonicalDevelopmentData(payload);
  const governance = getCanonicalStepSlice(payload, 'governance_finances');
  const levyRange = isPlainObject(governance.levyRange) ? governance.levyRange : {};
  const rightsAndTaxes = isPlainObject(governance.rightsAndTaxes) ? governance.rightsAndTaxes : {};
  const finances: CanonicalRecord = {};

  if (hasOwnDefined(levyRange, 'min')) {
    finances.monthlyLevyFrom = levyRange.min;
  } else if (hasOwnDefined(developmentData, 'monthlyLevyFrom')) {
    finances.monthlyLevyFrom = developmentData.monthlyLevyFrom;
  } else if (hasOwnDefined(payload, 'monthlyLevyFrom')) {
    finances.monthlyLevyFrom = payload.monthlyLevyFrom;
  }

  if (hasOwnDefined(levyRange, 'max')) {
    finances.monthlyLevyTo = levyRange.max;
  } else if (hasOwnDefined(developmentData, 'monthlyLevyTo')) {
    finances.monthlyLevyTo = developmentData.monthlyLevyTo;
  } else if (hasOwnDefined(payload, 'monthlyLevyTo')) {
    finances.monthlyLevyTo = payload.monthlyLevyTo;
  }

  if (hasOwnDefined(rightsAndTaxes, 'min')) {
    finances.ratesFrom = rightsAndTaxes.min;
  } else if (hasOwnDefined(developmentData, 'ratesFrom')) {
    finances.ratesFrom = developmentData.ratesFrom;
  } else if (hasOwnDefined(payload, 'ratesFrom')) {
    finances.ratesFrom = payload.ratesFrom;
  }

  if (hasOwnDefined(rightsAndTaxes, 'max')) {
    finances.ratesTo = rightsAndTaxes.max;
  } else if (hasOwnDefined(developmentData, 'ratesTo')) {
    finances.ratesTo = developmentData.ratesTo;
  } else if (hasOwnDefined(payload, 'ratesTo')) {
    finances.ratesTo = payload.ratesTo;
  }

  if (hasOwnDefined(governance, 'transferCostsIncluded')) {
    finances.transferCostsIncluded = governance.transferCostsIncluded;
  } else if (hasOwnDefined(developmentData, 'transferCostsIncluded')) {
    finances.transferCostsIncluded = developmentData.transferCostsIncluded;
  } else if (hasOwnDefined(payload, 'transferCostsIncluded')) {
    finances.transferCostsIncluded = payload.transferCostsIncluded;
  }

  return finances;
}

export function getCanonicalDevelopmentMedia(payload: CanonicalRecord): CanonicalRecord {
  const developmentData = getCanonicalDevelopmentData(payload);
  const stepMedia = getCanonicalStepSlice(payload, 'development_media');
  if (Object.keys(stepMedia).length > 0) return stepMedia;
  if (isPlainObject(developmentData.media)) return developmentData.media;
  return isPlainObject(payload.media) ? payload.media : {};
}

export function parseCanonicalJsonValue<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value as T;

  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'string') {
      const trimmed = parsed.trim();
      if (
        (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'))
      ) {
        try {
          return JSON.parse(trimmed) as T;
        } catch {
          return fallback;
        }
      }
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function normalizeCanonicalDevelopmentMediaSource(source: CanonicalRecord): CanonicalRecord {
  if (isPlainObject(source?.developmentData?.media)) return source.developmentData.media;

  const parsedMedia = parseCanonicalJsonValue<CanonicalRecord>(source?.media, {
    photos: [],
    videos: [],
    documents: [],
  });

  if ((!parsedMedia.photos || parsedMedia.photos.length === 0) && source?.images) {
    const legacyImages = parseCanonicalJsonValue<unknown[]>(source.images, []);
    if (Array.isArray(legacyImages) && legacyImages.length > 0) {
      parsedMedia.photos = legacyImages.map((image, index) => {
        if (typeof image === 'string') {
          return { id: `img-${index}`, url: image, category: 'general', type: 'image' };
        }
        return image;
      });
    }
  }

  if ((!parsedMedia.videos || parsedMedia.videos.length === 0) && source?.videos) {
    const legacyVideos = parseCanonicalJsonValue<unknown[]>(source.videos, []);
    if (Array.isArray(legacyVideos) && legacyVideos.length > 0) {
      parsedMedia.videos = legacyVideos.map(video =>
        typeof video === 'string' ? { url: video } : video,
      );
    }
  }

  if (
    (!parsedMedia.documents || parsedMedia.documents.length === 0) &&
    (!parsedMedia.brochures || parsedMedia.brochures.length === 0) &&
    source?.brochures
  ) {
    const legacyBrochures = parseCanonicalJsonValue<unknown[]>(source.brochures, []);
    if (Array.isArray(legacyBrochures) && legacyBrochures.length > 0) {
      parsedMedia.documents = legacyBrochures.map(document =>
        typeof document === 'string' ? { url: document } : document,
      );
    }
  }

  if ((!parsedMedia.floorPlans || parsedMedia.floorPlans.length === 0) && source?.floorPlans) {
    const legacyFloorPlans = parseCanonicalJsonValue<unknown[]>(source.floorPlans, []);
    if (Array.isArray(legacyFloorPlans) && legacyFloorPlans.length > 0) {
      parsedMedia.floorPlans = legacyFloorPlans.map(floorPlan =>
        typeof floorPlan === 'string' ? { url: floorPlan } : floorPlan,
      );
    }
  }

  if (
    !parsedMedia.heroImage &&
    Array.isArray(parsedMedia.photos) &&
    parsedMedia.photos.length > 0
  ) {
    const manualHero =
      parsedMedia.photos.find((photo: any) => photo?.category === 'featured' || photo?.isPrimary) ??
      parsedMedia.photos[0];

    if (manualHero) {
      parsedMedia.heroImage = { ...manualHero, category: 'featured', isPrimary: true };
    }
  }

  return {
    heroImage: parsedMedia.heroImage,
    photos: Array.isArray(parsedMedia.photos) ? parsedMedia.photos : [],
    videos: Array.isArray(parsedMedia.videos) ? parsedMedia.videos : [],
    floorPlans: Array.isArray(parsedMedia.floorPlans) ? parsedMedia.floorPlans : [],
    documents: Array.isArray(parsedMedia.documents)
      ? parsedMedia.documents
      : Array.isArray(parsedMedia.brochures)
        ? parsedMedia.brochures
        : [],
  };
}

export function buildCanonicalHydrationSource(
  source: CanonicalRecord,
  stepData: CanonicalRecord = {},
): CanonicalRecord {
  return {
    ...source,
    stepData,
    amenities:
      source?.amenities !== undefined
        ? parseCanonicalJsonValue(source.amenities, [])
        : source?.amenities,
    features:
      source?.features !== undefined
        ? parseCanonicalJsonValue(source.features, [])
        : source?.keyFeatures !== undefined
          ? parseCanonicalJsonValue(source.keyFeatures, [])
          : source?.features,
    highlights:
      source?.highlights !== undefined
        ? parseCanonicalJsonValue(source.highlights, [])
        : source?.highlights,
    media: normalizeCanonicalDevelopmentMediaSource(source),
    propertyTypes:
      typeof source?.propertyTypes === 'string'
        ? parseCanonicalJsonValue(source.propertyTypes, [])
        : firstDefined(source?.propertyTypes, source?.developmentData?.propertyTypes),
  };
}

export function buildCanonicalHydrationDevelopmentDataSnapshot(
  source: CanonicalRecord,
  stepData: CanonicalRecord = {},
): CanonicalRecord {
  return buildCanonicalDevelopmentDataSnapshot(buildCanonicalHydrationSource(source, stepData));
}

export function buildCanonicalDevelopmentDataSnapshot(payload: CanonicalRecord): CanonicalRecord {
  const developmentData = getCanonicalDevelopmentData(payload);
  const configuration = getCanonicalDevelopmentConfiguration(payload);
  const identity = getCanonicalDevelopmentIdentity(payload);
  const location = getCanonicalDevelopmentLocation(payload);
  const marketing = getCanonicalDevelopmentMarketing(payload);
  const amenities = getCanonicalDevelopmentAmenities(payload);
  const governanceFinances = getCanonicalDevelopmentGovernanceFinances(payload);
  const media = getCanonicalDevelopmentMedia(payload);

  return {
    ...developmentData,
    developmentType: configuration.developmentType,
    transactionType: configuration.transactionType,
    name: identity.name,
    subtitle: firstDefined(identity.subtitle, marketing.tagline, developmentData.subtitle),
    status: identity.status,
    nature: identity.nature,
    ownershipTypes: identity.ownershipTypes,
    ownershipType: identity.ownershipType,
    propertyTypes: firstDefined(developmentData.propertyTypes, payload.propertyTypes),
    marketingRole: identity.marketingRole,
    launchDate: identity.launchDate,
    completionDate: identity.completionDate,
    expectedFirstHandoverDate: identity.expectedFirstHandoverDate,
    handoverDuringConstruction: identity.handoverDuringConstruction,
    monthlyLevyFrom: firstDefined(
      governanceFinances.monthlyLevyFrom,
      developmentData.monthlyLevyFrom,
    ),
    monthlyLevyTo: firstDefined(governanceFinances.monthlyLevyTo, developmentData.monthlyLevyTo),
    ratesFrom: firstDefined(governanceFinances.ratesFrom, developmentData.ratesFrom),
    ratesTo: firstDefined(governanceFinances.ratesTo, developmentData.ratesTo),
    transferCostsIncluded: firstDefined(
      governanceFinances.transferCostsIncluded,
      developmentData.transferCostsIncluded,
    ),
    description: marketing.description,
    tagline: marketing.tagline,
    highlights: marketing.highlights,
    amenities: amenities.amenities,
    features: amenities.features,
    location,
    media,
  };
}

export function buildCanonicalStepDataFromDevelopmentSnapshot(
  developmentData: CanonicalRecord,
  unitTypes: unknown[] = [],
): CanonicalRecord {
  const media = isPlainObject(developmentData.media) ? developmentData.media : {};
  const location = isPlainObject(developmentData.location) ? developmentData.location : {};

  return {
    configuration: {
      developmentType: developmentData.developmentType,
      transactionType: developmentData.transactionType,
    },
    identity_market: {
      name: developmentData.name,
      subtitle: developmentData.subtitle,
      tagline: developmentData.tagline,
      status: developmentData.status,
      nature: developmentData.nature,
      transactionType: developmentData.transactionType,
      ownershipType: developmentData.ownershipType,
      ownershipTypes: developmentData.ownershipTypes,
      marketingRole: developmentData.marketingRole,
      launchDate: developmentData.launchDate,
      completionDate: developmentData.completionDate,
      expectedFirstHandoverDate: developmentData.expectedFirstHandoverDate,
      handoverDuringConstruction: developmentData.handoverDuringConstruction,
    },
    location: { ...location },
    governance_finances: {
      levyRange: {
        min: developmentData.monthlyLevyFrom ?? null,
        max: developmentData.monthlyLevyTo ?? null,
      },
      rightsAndTaxes: {
        min: developmentData.ratesFrom ?? null,
        max: developmentData.ratesTo ?? null,
      },
      transferCostsIncluded: developmentData.transferCostsIncluded,
    },
    amenities_features: {
      amenities: developmentData.amenities ?? [],
      features: developmentData.features ?? [],
    },
    marketing_summary: {
      description: developmentData.description,
      tagline: developmentData.tagline ?? developmentData.subtitle ?? '',
      keySellingPoints: developmentData.highlights ?? [],
    },
    development_media: {
      heroImage: media.heroImage,
      photos: media.photos ?? [],
      videos: media.videos ?? [],
      floorPlans: media.floorPlans ?? [],
      documents: media.documents ?? [],
    },
    unit_types: { unitTypes },
  };
}

export function hasSubstantiveCanonicalUnitFields(unit: unknown): boolean {
  if (!isPlainObject(unit)) return false;
  return Object.keys(unit).some(key => !['id', 'developmentId', 'displayOrder'].includes(key));
}

export function getCanonicalDevelopmentUnitTypes(payload: CanonicalRecord): unknown[] | undefined {
  const stepUnits = payload?.stepData?.unit_types?.unitTypes;
  if (Array.isArray(stepUnits) && stepUnits.some(hasSubstantiveCanonicalUnitFields)) {
    return stepUnits;
  }

  // Compatibility bridge: older edit payloads can carry id-only step units
  // beside the full root mirror. Keep full inventory from root until those routes are retired.
  if (Array.isArray(payload?.unitTypes)) return payload.unitTypes;
  return Array.isArray(stepUnits) ? stepUnits : undefined;
}
