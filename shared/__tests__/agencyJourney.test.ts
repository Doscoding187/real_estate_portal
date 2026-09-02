import { describe, expect, it } from 'vitest';
import { deriveAgencyJourneyAccessState } from '../agencyJourney';

function journey(overrides: Partial<Parameters<typeof deriveAgencyJourneyAccessState>[0]> = {}) {
  return deriveAgencyJourneyAccessState({
    hasAgency: true,
    profileConfigured: true,
    brandingConfigured: true,
    billingActivated: false,
    teamReady: false,
    subscriptionStatus: 'not_started',
    ...overrides,
  });
}

describe('Agency journey contract', () => {
  it('starts with an Agency business profile, not an individual Agent flow', () => {
    expect(journey({ hasAgency: false, profileConfigured: false })).toEqual({
      dashboardUnlocked: false,
      fullFeaturesUnlocked: false,
      recommendedNextStep: 'create_agency_profile',
    });
  });

  it('keeps the Agency identity checkpoint ahead of commercial activation', () => {
    expect(journey({ brandingConfigured: false })).toEqual({
      dashboardUnlocked: true,
      fullFeaturesUnlocked: false,
      recommendedNextStep: 'complete_agency_brand',
    });
  });

  it('keeps payment, payment review and renewal states distinct', () => {
    expect(journey({ subscriptionStatus: 'pending_payment' }).recommendedNextStep).toBe(
      'complete_payment',
    );
    expect(journey({ subscriptionStatus: 'payment_under_review' }).recommendedNextStep).toBe(
      'await_payment_review',
    );
    expect(journey({ subscriptionStatus: 'expired' }).recommendedNextStep).toBe(
      'renew_launch_access',
    );
  });

  it('makes bringing the team into an activated workspace the last launch checkpoint', () => {
    expect(
      journey({
        billingActivated: true,
        subscriptionStatus: 'active',
        teamReady: false,
      }),
    ).toEqual({
      dashboardUnlocked: true,
      fullFeaturesUnlocked: true,
      recommendedNextStep: 'invite_team',
    });

    expect(
      journey({
        billingActivated: true,
        subscriptionStatus: 'active',
        teamReady: true,
      }),
    ).toEqual({
      dashboardUnlocked: true,
      fullFeaturesUnlocked: true,
      recommendedNextStep: 'workspace',
    });
  });

  it('does not disguise an unavailable commercial state as a new checkout', () => {
    expect(journey({ subscriptionStatus: 'unavailable' }).recommendedNextStep).toBe(
      'contact_support',
    );
  });
});
