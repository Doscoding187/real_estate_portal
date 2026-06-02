import {
  buildCanonicalDevelopmentDataSnapshot,
  firstDefined,
  getCanonicalDevelopmentConfiguration,
  getCanonicalDevelopmentGovernanceFinances,
  getCanonicalDevelopmentMedia,
  getCanonicalDevelopmentUnitTypes,
  getCanonicalStepSlice,
  isPlainObject,
} from '../../shared/developmentCanonicalSelectors';
import {
  CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP,
  CANONICAL_PARTIAL_UPDATE_MODE,
  CANONICAL_UPDATE_MODE_FIELD,
  PARTIAL_UPDATE_ALWAYS_ALLOWED_PAYLOAD_FIELDS,
  PARTIAL_UPDATE_STEP_OWNED_PAYLOAD_FIELDS,
} from '../../shared/developmentPayloadOwnership';

export type CanonicalDevelopmentPayload = Record<string, any>;
export type CanonicalDevelopmentFlattenMode = 'full' | 'partial_update';

export {
  CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP,
  CANONICAL_PARTIAL_UPDATE_MODE,
  CANONICAL_UPDATE_MODE_FIELD,
  getCanonicalDevelopmentGovernanceFinances,
  getCanonicalDevelopmentMedia,
  getCanonicalDevelopmentUnitTypes,
};

export function canonicalMediaToImages(media: any): any[] | undefined {
  if (!media) return undefined;
  const gallery = Array.isArray(media.photos)
    ? media.photos
    : Array.isArray(media.images)
      ? media.images
      : [];
  const images = [media.heroImage, ...gallery].filter(Boolean);
  return images.length > 0 ? images : undefined;
}

function canonicalMediaAssetToUrl(asset: unknown): string | undefined {
  if (typeof asset === 'string') return asset.trim() || undefined;
  if (isPlainObject(asset) && typeof asset.url === 'string') {
    return asset.url.trim() || undefined;
  }
  return undefined;
}

function canonicalMediaToUrls(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const urls = value.map(canonicalMediaAssetToUrl).filter(Boolean) as string[];
  return urls.length > 0 ? urls : undefined;
}

export function getCanonicalDevelopmentMediaPayload(
  payload: CanonicalDevelopmentPayload,
): Record<string, any> {
  const developmentData = isPlainObject(payload.developmentData) ? payload.developmentData : {};
  const hasStepMedia = Object.keys(getCanonicalStepSlice(payload, 'development_media')).length > 0;
  const media = getCanonicalDevelopmentMedia(payload);
  const mediaPayload: Record<string, any> = {};
  const images = canonicalMediaToImages(media);
  const videos = canonicalMediaToUrls(media.videos);
  const floorPlans = canonicalMediaToUrls(media.floorPlans);
  const brochures = canonicalMediaToUrls(media.brochures ?? media.documents);

  if (hasStepMedia && images !== undefined) mediaPayload.images = images;
  else if (payload.images !== undefined) mediaPayload.images = payload.images;
  else if (developmentData.images !== undefined) mediaPayload.images = developmentData.images;
  else if (images !== undefined) mediaPayload.images = images;

  if (hasStepMedia && videos !== undefined) mediaPayload.videos = videos;
  else if (payload.videos !== undefined) mediaPayload.videos = payload.videos;
  else if (developmentData.videos !== undefined) mediaPayload.videos = developmentData.videos;
  else if (videos !== undefined) mediaPayload.videos = videos;

  if (hasStepMedia && floorPlans !== undefined) mediaPayload.floorPlans = floorPlans;
  else if (payload.floorPlans !== undefined) mediaPayload.floorPlans = payload.floorPlans;
  else if (developmentData.floorPlans !== undefined)
    mediaPayload.floorPlans = developmentData.floorPlans;
  else if (floorPlans !== undefined) mediaPayload.floorPlans = floorPlans;

  if (hasStepMedia && brochures !== undefined) mediaPayload.brochures = brochures;
  else if (payload.brochures !== undefined) mediaPayload.brochures = payload.brochures;
  else if (developmentData.brochures !== undefined)
    mediaPayload.brochures = developmentData.brochures;
  else if (brochures !== undefined) mediaPayload.brochures = brochures;

  return mediaPayload;
}

function getCanonicalPartialStepId(input: CanonicalDevelopmentPayload): string | undefined {
  const currentStepId = typeof input.currentStepId === 'string' ? input.currentStepId : undefined;
  if (!currentStepId || currentStepId === 'review_publish') return undefined;
  return Object.prototype.hasOwnProperty.call(
    PARTIAL_UPDATE_STEP_OWNED_PAYLOAD_FIELDS,
    currentStepId,
  )
    ? currentStepId
    : undefined;
}

export function isCanonicalPartialDevelopmentUpdate(input: unknown): boolean {
  if (!isPlainObject(input)) return false;
  return input[CANONICAL_UPDATE_MODE_FIELD] === CANONICAL_PARTIAL_UPDATE_MODE;
}

function scopeCanonicalPartialUpdatePayload<T extends CanonicalDevelopmentPayload>(input: T): T {
  const currentStepId = getCanonicalPartialStepId(input);
  if (!currentStepId) {
    return {
      workflowId: input.workflowId,
      currentStepId: input.currentStepId,
      completedSteps: input.completedSteps,
      [CANONICAL_UPDATE_MODE_FIELD]: input[CANONICAL_UPDATE_MODE_FIELD],
      stepData: {},
    } as unknown as T;
  }

  const stepData = isPlainObject(input.stepData) ? input.stepData : {};
  const scopedStepData = isPlainObject(stepData[currentStepId])
    ? { [currentStepId]: stepData[currentStepId] }
    : {};
  const stepOwnedFields = new Set<string>(
    PARTIAL_UPDATE_STEP_OWNED_PAYLOAD_FIELDS[
      currentStepId as keyof typeof PARTIAL_UPDATE_STEP_OWNED_PAYLOAD_FIELDS
    ] as readonly string[],
  );
  const scopedPayload: Record<string, any> = {
    workflowId: input.workflowId,
    currentStepId,
    completedSteps: input.completedSteps,
    [CANONICAL_UPDATE_MODE_FIELD]: input[CANONICAL_UPDATE_MODE_FIELD],
    stepData: scopedStepData,
  };

  for (const field of stepOwnedFields) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      scopedPayload[field] = input[field];
    }
  }

  return scopedPayload as T;
}

function omitUndefinedTopLevel<T extends CanonicalDevelopmentPayload>(payload: T): T {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  ) as T;
}

function filterCanonicalPartialFlattenedPayload<T extends CanonicalDevelopmentPayload>(
  payload: T,
): T {
  const currentStepId = getCanonicalPartialStepId(payload);
  if (!currentStepId) return payload;

  const allowedFields = new Set<string>([
    ...PARTIAL_UPDATE_ALWAYS_ALLOWED_PAYLOAD_FIELDS,
    ...PARTIAL_UPDATE_STEP_OWNED_PAYLOAD_FIELDS[
      currentStepId as keyof typeof PARTIAL_UPDATE_STEP_OWNED_PAYLOAD_FIELDS
    ],
    CANONICAL_UPDATE_MODE_FIELD,
  ]);

  return Object.fromEntries(
    Object.entries(payload).filter(([field]) => allowedFields.has(field)),
  ) as T;
}

export function flattenCanonicalDevelopmentPayload<T extends CanonicalDevelopmentPayload>(
  input: T,
  options: { mode?: CanonicalDevelopmentFlattenMode } = {},
): T {
  const source =
    options.mode === 'partial_update' ? scopeCanonicalPartialUpdatePayload(input) : input;
  const developmentData = isPlainObject(source.developmentData) ? source.developmentData : {};
  const configuration = getCanonicalStepSlice(source, 'configuration');
  const identityMarket = getCanonicalStepSlice(source, 'identity_market');
  const locationStep = getCanonicalStepSlice(source, 'location');
  const amenitiesFeatures = getCanonicalStepSlice(source, 'amenities_features');
  const marketingSummary = getCanonicalStepSlice(source, 'marketing_summary');
  const hasCanonicalDevelopmentData = Object.keys(developmentData).length > 0;
  const hasCanonicalStepUnits = Array.isArray(source.stepData?.unit_types?.unitTypes);
  const hasCanonicalStepData = [
    configuration,
    identityMarket,
    locationStep,
    amenitiesFeatures,
    marketingSummary,
  ].some(slice => Object.keys(slice).length > 0);
  const hasCanonicalMedia = Boolean(
    isPlainObject(developmentData.media) ||
    isPlainObject(source.stepData?.development_media) ||
    isPlainObject(source.media),
  );
  const canonicalDevelopmentData = buildCanonicalDevelopmentDataSnapshot(source);
  const unitTypesData = getCanonicalDevelopmentUnitTypes(source);
  const governanceFinances = getCanonicalDevelopmentGovernanceFinances(source);
  const mediaPayload = getCanonicalDevelopmentMediaPayload(source);
  const hasGovernanceFinances = Object.keys(governanceFinances).length > 0;

  if (
    !hasCanonicalDevelopmentData &&
    !hasCanonicalStepData &&
    !hasCanonicalStepUnits &&
    !hasCanonicalMedia &&
    !hasGovernanceFinances
  ) {
    return source;
  }

  const flattened = {
    ...source,
    ...developmentData,
    developmentType: canonicalDevelopmentData.developmentType,
    transactionType: canonicalDevelopmentData.transactionType,
    name: canonicalDevelopmentData.name,
    tagline: canonicalDevelopmentData.tagline,
    subtitle: firstDefined(
      canonicalDevelopmentData.subtitle,
      developmentData.subtitle,
      canonicalDevelopmentData.tagline,
      developmentData.tagline,
      input.subtitle,
    ),
    description: canonicalDevelopmentData.description,
    status: canonicalDevelopmentData.status,
    nature: canonicalDevelopmentData.nature,
    ownershipTypes: canonicalDevelopmentData.ownershipTypes,
    marketingRole: canonicalDevelopmentData.marketingRole,
    launchDate: canonicalDevelopmentData.launchDate,
    completionDate: canonicalDevelopmentData.completionDate,
    ownershipType: canonicalDevelopmentData.ownershipType,
    propertyTypes: developmentData.propertyTypes ?? input.propertyTypes,
    address: canonicalDevelopmentData.location?.address,
    city: canonicalDevelopmentData.location?.city,
    province: canonicalDevelopmentData.location?.province,
    suburb: canonicalDevelopmentData.location?.suburb,
    postalCode: canonicalDevelopmentData.location?.postalCode,
    latitude: canonicalDevelopmentData.location?.latitude,
    longitude: canonicalDevelopmentData.location?.longitude,
    amenities: canonicalDevelopmentData.amenities,
    features: canonicalDevelopmentData.features,
    highlights: canonicalDevelopmentData.highlights,
    ...mediaPayload,
    ...governanceFinances,
    unitTypes: unitTypesData,
  };

  return options.mode === 'partial_update'
    ? omitUndefinedTopLevel(filterCanonicalPartialFlattenedPayload(flattened))
    : flattened;
}
