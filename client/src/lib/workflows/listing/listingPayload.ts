import type {
  ListingAction,
  PropertyType,
  PricingFields,
  LocationData,
  MediaFile,
  SellPricing,
  RentPricing,
  AuctionPricing,
  ListingWizardState,
} from '@shared/listing-types';
import { buildCanonicalCorePropertyDetails } from '@shared/core-property-information';
import { listingActionToIntent } from '@shared/listing-types';
import {
  buildFeaturesContextFromWizardState,
  LEGACY_STEP4_PROPERTY_DETAIL_KEYS,
} from '@shared/features-context';
import { buildPricingContract } from '@shared/pricing-contract';
import { buildListingLocationAuthoringPayload } from '@shared/location-contract';
import {
  createDefaultRentalTerms,
  normalizeRentalTerms,
} from '@shared/rental-terms-contract';

/**
 * Shape expected by server/listingRouter.ts createListingSchema.
 * This is the canonical submit contract between V2 frontend and backend.
 */
export interface ListingSubmitPayload {
  action: ListingAction;
  propertyType: PropertyType;
  title: string;
  description: string;
  pricing: PricingFields;
  propertyDetails: Record<string, any>;
  location: LocationData;
  mediaIds: string[];
  mainMediaId?: string | null;
  status?: 'draft' | 'pending_review';
}

/**
 * Build a ListingSubmitPayload from raw Zustand wizard state.
 *
 * Merge rules (matching V1 ListingWizard.tsx handleSubmit):
 *
 * 1. `propertyDetails` = approved Core Property Information ∪ canonical Features & Context
 *    - the typed Step 3 core contract is mapped explicitly;
 *    - Step 4 is mapped through the typed Features & Context contract;
 *    - unrelated historical `basicInfo` fields never cross this boundary.
 *
 * 2. `pricing` preserves the full PricingFields union for the transport
 *    boundary. The versioned action-specific contract inside `propertyDetails`
 *    is the new semantic authority; legacy typed columns remain compatibility
 *    projections for existing readers.
 *
 * 3. `location` passes LocationData directly (address, lat/lng, city, province,
 *    placeId, addressComponents for server-side hierarchy auto-population).
 *
 * 4. `mediaIds` = store.media[].id filtered to defined values (no empty strings).
 *
 * 5. `mainMediaId` = store.mainMediaId, falling back to the first media item's id.
 *    Matches V1 empty-string handling ('' falls through to fallback).
 *
 * This function is pure and side-effect free. No tRPC calls.
 */
export function buildListingSubmitPayloadFromWizardState(
  state: Partial<ListingWizardState>,
): ListingSubmitPayload {
  const action = state.action!;
  const propertyType = state.propertyType!;

  const historicalDetails: Record<string, any> = {
    ...(state.propertyDetails as Record<string, any> | undefined),
  };
  for (const key of [
    'propertyCategory',
    'developerName',
    'developmentName',
    'selectedDeveloperId',
    'selectedDevelopmentId',
    'landSizeUnit',
    'landSizeHa',
    'landSizeM2OrHa',
    'badges',
    ...LEGACY_STEP4_PROPERTY_DETAIL_KEYS,
  ]) {
    delete historicalDetails[key];
  }

  const propertyDetails: Record<string, any> = {
    ...historicalDetails,
    featuresContext: buildFeaturesContextFromWizardState(
      state.additionalInfo,
      state.propertyDetails,
      listingActionToIntent(action),
      propertyType,
    ),
    ...buildCanonicalCorePropertyDetails(
      propertyType,
      state.propertyDetails,
      state.basicInfo,
    ),
  };

  if (action === 'rent') {
    propertyDetails.rentalTerms =
      normalizeRentalTerms(historicalDetails.rentalTerms) ?? createDefaultRentalTerms();
  } else {
    delete propertyDetails.rentalTerms;
  }

  // These pre-launch flat fields are retired from new authoring. Rental
  // availability and tenancy facts now have one versioned details authority.
  const pricing =
    action === 'rent'
      ? (() => {
          const {
            leaseTerms: _leaseTerms,
            availableFrom: _availableFrom,
            utilitiesIncluded: _utilitiesIncluded,
            ...canonicalRentPricing
          } = (state.pricing || {}) as Record<string, unknown>;
          return canonicalRentPricing as RentPricing;
        })()
      : state.pricing!;

  const pricingContract = buildPricingContract(
    action,
    pricing as Record<string, unknown> | undefined,
    propertyDetails,
    { preferEmbedded: false },
  );
  if (pricingContract) propertyDetails.pricingContract = pricingContract;
  for (const key of ['levies', 'leviesHoaOperatingCosts', 'ratesAndTaxes', 'ratesTaxes']) {
    delete propertyDetails[key];
  }

  const mediaIds = (state.media ?? [])
    .map((m) => m.id)
    .filter((id): id is string => !!id);

  // Use || not ?? to match V1 — empty string falls through to fallback
  const mainMediaId =
    state.mainMediaId ||
    ((state.media?.length ?? 0) > 0 ? state.media![0].id : undefined);

  return {
    action,
    propertyType,
    title: state.title ?? '',
    description: state.description ?? '',
    pricing,
    propertyDetails,
    location: buildListingLocationAuthoringPayload(state.location)!,
    mediaIds,
    mainMediaId,
    status: undefined,
  };
}

/**
 * Extract the sale-specific pricing fields for testing/validation.
 */
export function extractSellPricing(
  pricing: PricingFields | undefined,
): Partial<SellPricing> {
  if (!pricing) return {};
  const p = pricing as SellPricing;
  return {
    askingPrice: p.askingPrice,
    negotiable: p.negotiable,
    transferCostEstimate: p.transferCostEstimate,
  };
}

/**
 * Extract the rent-specific pricing fields for testing/validation.
 */
export function extractRentPricing(
  pricing: PricingFields | undefined,
): Partial<RentPricing> {
  if (!pricing) return {};
  const p = pricing as RentPricing;
  return {
    monthlyRent: p.monthlyRent,
    deposit: p.deposit,
    depositFact: p.depositFact,
  };
}

/**
 * Extract the auction-specific pricing fields for testing/validation.
 */
export function extractAuctionPricing(
  pricing: PricingFields | undefined,
): Partial<AuctionPricing> {
  if (!pricing) return {};
  const p = pricing as AuctionPricing;
  return {
    startingBid: p.startingBid,
    reservePrice: p.reservePrice,
    auctionDateTime: p.auctionDateTime,
    auctionTermsDocumentUrl: p.auctionTermsDocumentUrl,
  };
}
