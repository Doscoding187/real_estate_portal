import { buildListingSubmitPayloadFromWizardState } from './listingPayload';
import { validateListingWorkflowPayload } from './listingWorkflowValidation';
import { calculateListingReadiness } from '@/lib/readiness';
import { calculateListingQualityScore, getQualityTier } from '@/lib/quality';
import type { ListingWorkflowData, ListingFieldError } from '@shared/listing-workflow-types';

export interface SubmitReadinessResult {
  ready: boolean;
  blockingReasons: string[];
  validation: {
    valid: boolean;
    errorCount: number;
    errors: ListingFieldError[];
  };
  payload: {
    built: boolean;
    action?: string;
    propertyType?: string;
    title?: string;
    mediaCount: number;
    mainMediaPresent: boolean;
    propertyDetailsKeys: number;
    sizeBytes: number;
  };
  readiness: {
    score: number;
    missing: Record<string, string[]>;
  };
  quality: {
    score: number;
    tier: string;
    tips: string[];
  };
}

/**
 * Derive action-aware price matching V1 PreviewStep.getPrice().
 */
function getActionPrice(data: ListingWorkflowData): number {
  if (!data.pricing) return 0;
  const p = data.pricing as Record<string, any>;
  if (data.action === 'sell') return Number(p.askingPrice) || 0;
  if (data.action === 'rent') return Number(p.monthlyRent) || 0;
  return Number(p.startingBid) || 0;
}

/**
 * Derive floor/building area by property type matching V1 PreviewStep.getPropertyArea().
 */
function getPropertyArea(data: ListingWorkflowData): number {
  if (!data.propertyDetails) return 0;
  const d = data.propertyDetails as Record<string, any>;
  switch (data.propertyType) {
    case 'apartment':
      return Number(d.unitSizeM2) || 0;
    case 'house':
      return Number(d.houseAreaM2) || 0;
    case 'land':
      return Number(d.landSizeM2OrHa) || 0;
    case 'farm':
      return Number(d.landSizeHa) || 0;
    case 'commercial':
      return Number(d.floorAreaM2) || 0;
    default:
      return 0;
  }
}

/**
 * Build features array from additionalInfo, matching V1 PreviewStep amenitiesList.
 */
function buildFeaturesList(data: ListingWorkflowData): string[] {
  const ai = data.additionalInfo as Record<string, any> | undefined;
  return [
    ...(ai?.propertyHighlights ?? []),
    ...(ai?.additionalRooms ?? []),
    ...(ai?.securityFeatures ?? []),
  ];
}

export async function calculateSubmitReadinessDryRun(
  data: ListingWorkflowData,
): Promise<SubmitReadinessResult> {
  const blockingReasons: string[] = [];

  // 1. Build payload (wrapped in try/catch — partial data may cause runtime issues)
  let builtPayload: ReturnType<typeof buildListingSubmitPayloadFromWizardState> | null = null;
  try {
    const stateForPayload: Record<string, any> = {
      action: data.action,
      propertyType: data.propertyType,
      title: data.title,
      description: data.description,
      pricing: data.pricing,
      propertyDetails: data.propertyDetails,
      additionalInfo: data.additionalInfo,
      basicInfo: data.basicInfo,
      location: data.location,
      media: data.media,
      mainMediaId: data.mainMediaId,
    };
    builtPayload = buildListingSubmitPayloadFromWizardState(stateForPayload as any);
  } catch {
    blockingReasons.push('Payload build failed');
  }

  // 2. Run full workflow validation
  const validation = await validateListingWorkflowPayload(data);

  // 3. Core prerequisites
  if (!data.action) blockingReasons.push('Action not selected');
  if (!data.propertyType) blockingReasons.push('Property type not selected');
  if (!data.title) blockingReasons.push('Title not set');
  if (!data.description) blockingReasons.push('Description not set');
  if (!data.pricing) blockingReasons.push('Pricing not set');
  if (!data.location?.address) blockingReasons.push('Location address not set');
  if (!data.media || data.media.length === 0) blockingReasons.push('No media uploaded');

  if (validation.errors.length > 0) {
    blockingReasons.push(`${validation.errors.length} validation error(s)`);
  }

  const ready = blockingReasons.length === 0;

  // 4. Derive shared values matching V1 PreviewStep conventions
  const images = (data.media ?? []).filter((m) => m.type === 'image');
  const videos = (data.media ?? []).filter((m) => m.type === 'video');
  const price = getActionPrice(data);
  const features = buildFeaturesList(data);
  const floorSize = getPropertyArea(data);

  // 5. Readiness score — map wizard data to the shape calculateListingReadiness expects
  const readinessInput: any = {
    address: data.location?.address,
    latitude: data.location?.latitude,
    longitude: data.location?.longitude,
    askingPrice: price,
    monthlyRent: data.action === 'rent' ? price : undefined,
    images,
    media: data.media,
    description: data.description,
    propertyType: data.propertyType,
    propertyDetails: data.propertyDetails,
  };
  const readinessResult = calculateListingReadiness(readinessInput);

  // 6. Quality score — map wizard data matching V1 PreviewStep quality input
  const qualityInput: any = {
    images,
    videos,
    description: data.description,
    features,
    price,
    askingPrice: price,
    monthlyRent: price,
    latitude: data.location?.latitude,
    longitude: data.location?.longitude,
    floorSize,
    propertyDetails: data.propertyDetails,
  };
  const qualityResult = calculateListingQualityScore(qualityInput);
  const tierResult = getQualityTier(qualityResult.score);

  // 7. mainMediaPresent: only when mainMediaId is set or first media item has a valid ID
  const mainMediaPresent = !!data.mainMediaId || (data.media?.[0]?.id ? true : false);

  return {
    ready,
    blockingReasons,
    validation: {
      valid: validation.valid,
      errorCount: validation.errors.length,
      errors: validation.errors,
    },
    payload: {
      built: !!builtPayload,
      action: builtPayload?.action,
      propertyType: builtPayload?.propertyType,
      title: builtPayload?.title,
      mediaCount: data.media?.length ?? 0,
      mainMediaPresent,
      propertyDetailsKeys: builtPayload ? Object.keys(builtPayload.propertyDetails).length : 0,
      sizeBytes: builtPayload ? new Blob([JSON.stringify(builtPayload)]).size : 0,
    },
    readiness: {
      score: readinessResult.score,
      missing: readinessResult.missing,
    },
    quality: {
      score: qualityResult.score,
      tier: tierResult.tier,
      tips: qualityResult.tips,
    },
  };
}
