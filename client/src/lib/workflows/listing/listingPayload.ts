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
 * 1. `propertyDetails` = store.propertyDetails ∪ store.additionalInfo
 *    - additionalInfo fields (furnishing, security, outdoor features, etc.) are
 *      spread into the JSON column so the backend persists them.
 *    - store.basicInfo is intentionally NOT merged: it contains fields that
 *      duplicate top-level (title, description), location (province, city,
 *      suburb, streetAddress), and pricing (depositAmount, leaseTerm,
 *      occupationDate).  V1 has the same exclusion.
 *
 * 2. `pricing` preserves the full PricingFields union — the backend router writes
 *    each field to its own column. Only the fields relevant to the selected action
 *    will be populated; others remain undefined.
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

  // NOTE: store.basicInfo is deliberately excluded (see doc comment above)
  const propertyDetails: Record<string, any> = {
    ...(state.propertyDetails as Record<string, any> | undefined),
    ...(state.additionalInfo as Record<string, any> | undefined),
  };

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
    pricing: state.pricing!,
    propertyDetails,
    location: state.location!,
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
    leaseTerms: p.leaseTerms,
    availableFrom: p.availableFrom,
    utilitiesIncluded: p.utilitiesIncluded,
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
