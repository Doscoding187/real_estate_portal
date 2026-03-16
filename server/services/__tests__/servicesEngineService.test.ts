import { describe, expect, it } from 'vitest';
import {
  getStageCategoryBoost,
  isBillingEligibleForTier,
  scoreProviderCandidate,
} from '../servicesEngineService';

describe('servicesEngineService helpers', () => {
  it('applies stage-category boost for aligned seller and buyer journeys', () => {
    expect(getStageCategoryBoost('seller_valuation', 'media_marketing')).toBe(2);
    expect(getStageCategoryBoost('buyer_offer_intent', 'finance_legal')).toBe(2);
    expect(getStageCategoryBoost('buyer_move_ready', 'moving')).toBe(2);
    expect(getStageCategoryBoost('seller_valuation', 'insurance')).toBe(0);
  });

  it('enforces billing eligibility by subscription tier and source surface', () => {
    expect(isBillingEligibleForTier('directory', 'directory')).toBe(true);
    expect(isBillingEligibleForTier('directory', 'explore')).toBe(false);

    expect(isBillingEligibleForTier('directory_explore', 'directory')).toBe(true);
    expect(isBillingEligibleForTier('directory_explore', 'explore')).toBe(true);
    expect(isBillingEligibleForTier('directory_explore', 'journey_injection')).toBe(false);

    expect(isBillingEligibleForTier('ecosystem_pro', 'journey_injection')).toBe(true);
    expect(isBillingEligibleForTier('ecosystem_pro', 'agent_dashboard')).toBe(true);
  });

  it('scores verified, high-trust, location-matched providers higher', () => {
    const baseline = scoreProviderCandidate({
      serviceCategory: 'home_improvement',
      intentStage: 'seller_listing_prep',
      sourceSurface: 'journey_injection',
      providerVerificationStatus: 'pending',
      providerTrustScore: 55,
      providerSubscriptionTier: 'directory',
      matchesCity: false,
      matchesSuburb: false,
      stageCategoryBoost: 2,
    });

    const premium = scoreProviderCandidate({
      serviceCategory: 'home_improvement',
      intentStage: 'seller_listing_prep',
      sourceSurface: 'journey_injection',
      providerVerificationStatus: 'verified',
      providerTrustScore: 91,
      providerSubscriptionTier: 'ecosystem_pro',
      matchesCity: true,
      matchesSuburb: true,
      stageCategoryBoost: 2,
    });

    expect(premium).toBeGreaterThan(baseline);
  });
});
