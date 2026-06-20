/**
 * Pure adapter: maps V2 Zustand wizard state → listing.saveDraft input.
 *
 * Separates:
 *   - Normalized columns (title, description, pricing, location, etc.)
 *   - draftData JSON (session state: currentStep, completedSteps, etc.)
 *
 * No tRPC, no React, no side effects.
 */
import type {
  ListingWizardState,
  PricingFields,
  MediaFile,
} from '@shared/listing-types';

/**
 * Shape expected by server/listingRouter.ts saveDraftSchema.
 */
export interface SaveDraftInput {
  id?: number;
  action: string;
  propertyType: string;
  title?: string;
  description?: string;
  pricing?: Record<string, unknown>;
  propertyDetails?: Record<string, unknown>;
  location?: {
    address?: string;
    latitude?: number;
    longitude?: number;
    city?: string;
    suburb?: string;
    province?: string;
    postalCode?: string;
    placeId?: string;
  };
  mediaIds?: string[];
  mainMediaId?: string | null;
  draftData?: Record<string, unknown>;
}

/**
 * Build a listing.saveDraft payload from Zustand wizard state.
 *
 * Normalized columns (promoted to DB columns):
 *   action, propertyType, title, description, pricing, propertyDetails,
 *   location (address, lat/lng, city, province, etc.), mediaIds, mainMediaId
 *
 * draftData JSON (session/transient state):
 *   currentStep, completedSteps, badges, basicInfo, additionalInfo,
 *   pricing, propertyDetails, location, media, mainMediaId, displayMediaType
 */
export function buildSaveDraftPayloadFromWizardState(
  state: Partial<ListingWizardState>,
  existingDraftId?: number,
): SaveDraftInput {
  if (!state.action) {
    throw new Error('Cannot save draft before selecting a listing action');
  }
  if (!state.propertyType) {
    throw new Error('Cannot save draft before selecting a property type');
  }

  const payload: SaveDraftInput = {
    id: existingDraftId,
    action: state.action,
    propertyType: state.propertyType,
  };

  // ── Normalized columns (promoted) ──

  if (state.title) payload.title = state.title;
  if (state.description) payload.description = state.description;

  if (state.pricing) {
    payload.pricing = mapPricingForDraft(state.pricing);
  }

  if (state.propertyDetails || state.additionalInfo) {
    payload.propertyDetails = {
      ...(state.propertyDetails as Record<string, unknown> | undefined),
      ...(state.additionalInfo as Record<string, unknown> | undefined),
    };
  }

  if (state.location) {
    const loc = state.location;
    payload.location = {};
    if (loc.address) payload.location.address = loc.address;
    if (loc.latitude !== undefined) payload.location.latitude = loc.latitude;
    if (loc.longitude !== undefined) payload.location.longitude = loc.longitude;
    if (loc.city) payload.location.city = loc.city;
    if (loc.suburb) payload.location.suburb = loc.suburb;
    if (loc.province) payload.location.province = loc.province;
    if (loc.postalCode) payload.location.postalCode = loc.postalCode;
    if (loc.placeId) payload.location.placeId = loc.placeId;
    if (Object.keys(payload.location).length === 0) delete payload.location;
  }

  if (state.media && state.media.length > 0) {
    payload.mediaIds = state.media
      .map((m: MediaFile) => m.id)
      .filter((id): id is string => !!id);
  }

  if (state.mainMediaId) {
    payload.mainMediaId = state.mainMediaId;
  } else if (state.media && state.media.length > 0 && state.media[0].id) {
    payload.mainMediaId = state.media[0].id;
  }

  // ── draftData JSON (session state) ──

  const draftData: Record<string, unknown> = {};

  if (state.currentStep !== undefined) draftData.currentStep = state.currentStep;
  if (state.completedSteps && state.completedSteps.length > 0) {
    draftData.completedSteps = state.completedSteps;
  }
  if (state.badges && state.badges.length > 0) {
    draftData.badges = state.badges;
  }
  if (state.basicInfo) draftData.basicInfo = state.basicInfo as Record<string, unknown>;
  if (state.additionalInfo) {
    draftData.additionalInfo = state.additionalInfo as Record<string, unknown>;
  }
  if (state.pricing) draftData.pricing = mapPricingForDraft(state.pricing);
  if (state.propertyDetails) {
    draftData.propertyDetails = state.propertyDetails as Record<string, unknown>;
  }
  if (state.location) draftData.location = state.location as Record<string, unknown>;
  if (state.media && state.media.length > 0) {
    draftData.media = state.media as unknown as Record<string, unknown>[];
  }
  if (state.mainMediaId) draftData.mainMediaId = state.mainMediaId;
  if (state.displayMediaType) draftData.displayMediaType = state.displayMediaType;

  // Only attach draftData if it has content
  if (Object.keys(draftData).length > 0) {
    payload.draftData = draftData;
  }

  return payload;
}

/**
 * Hydrate Zustand state from a listing.getDraft response.
 * Returns a partial state object that can be passed to store.setState() or
 * applied directly to the store via hydrateFromDraft().
 */
export interface DraftDataHydration {
  currentStep?: number;
  completedSteps?: number[];
  title?: string;
  description?: string;
  pricing?: Record<string, unknown>;
  propertyDetails?: Record<string, unknown>;
  location?: Record<string, unknown>;
  media?: Record<string, unknown>[];
  mainMediaId?: string;
  displayMediaType?: 'image' | 'video';
  badges?: string[];
  basicInfo?: Record<string, unknown>;
  additionalInfo?: Record<string, unknown>;
}

export function hydrateStateFromDraftResponse(
  draft: {
    id: number;
    action: string;
    propertyType: string;
    title?: string;
    description?: string;
    draftData?: Record<string, unknown> | null;
  },
): { serverDraftId: number; state: DraftDataHydration } {
  const serverDraftId = draft.id;
  const stateUpdate: DraftDataHydration = {};

  // Normalized columns take priority
  if (draft.title) stateUpdate.title = draft.title;
  if (draft.description) stateUpdate.description = draft.description;

  // Restore session state from draftData JSON
  const dd = draft.draftData;
  if (dd) {
    if (typeof dd.currentStep === 'number') stateUpdate.currentStep = dd.currentStep;
    if (Array.isArray(dd.completedSteps)) stateUpdate.completedSteps = dd.completedSteps as number[];
    if (dd.basicInfo) stateUpdate.basicInfo = dd.basicInfo as Record<string, unknown>;
    if (dd.additionalInfo) stateUpdate.additionalInfo = dd.additionalInfo as Record<string, unknown>;
    if (dd.pricing) stateUpdate.pricing = dd.pricing as Record<string, unknown>;
    if (dd.propertyDetails) stateUpdate.propertyDetails = dd.propertyDetails as Record<string, unknown>;
    if (dd.location) stateUpdate.location = dd.location as Record<string, unknown>;
    if (Array.isArray(dd.media)) stateUpdate.media = dd.media as Record<string, unknown>[];
    if (dd.mainMediaId) stateUpdate.mainMediaId = dd.mainMediaId as string;
    if (dd.displayMediaType) stateUpdate.displayMediaType = dd.displayMediaType as 'image' | 'video';
    if (dd.badges) stateUpdate.badges = dd.badges as string[];
  }

  return { serverDraftId, state: stateUpdate };
}

/**
 * Map PricingFields to a plain Record for the saveDraft API.
 */
function mapPricingForDraft(pricing: PricingFields): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const p = pricing as Record<string, unknown>;
  for (const key of Object.keys(p)) {
    const val = p[key];
    if (val !== undefined && val !== null) {
      result[key] = val;
    }
  }
  return result;
}
