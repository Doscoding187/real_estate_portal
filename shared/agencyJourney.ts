/**
 * Canonical, transport-safe vocabulary for the Agency commercial and
 * onboarding journey. The server decides the state; client surfaces use the
 * recommended step so the public promise, onboarding, billing handoff and
 * operating workspace do not tell an Agency owner different next actions.
 */
export const AGENCY_SUBSCRIPTION_STATUS_VALUES = [
  'not_started',
  'pending_payment',
  'payment_under_review',
  'active',
  'past_due',
  'grace_period',
  'suspended',
  'cancelled',
  'expired',
] as const;

export type AgencySubscriptionStatus = (typeof AGENCY_SUBSCRIPTION_STATUS_VALUES)[number];
export type AgencySubscriptionDisplayStatus = AgencySubscriptionStatus | 'unavailable';

export const AGENCY_RECOMMENDED_NEXT_STEP_VALUES = [
  'create_agency_profile',
  'complete_agency_brand',
  'activate_launch_access',
  'complete_payment',
  'await_payment_review',
  'invite_team',
  'renew_launch_access',
  'contact_support',
  'workspace',
] as const;

export type AgencyRecommendedNextStep = (typeof AGENCY_RECOMMENDED_NEXT_STEP_VALUES)[number];

export type AgencyJourneyAccessState = {
  dashboardUnlocked: boolean;
  fullFeaturesUnlocked: boolean;
  recommendedNextStep: AgencyRecommendedNextStep;
};

/**
 * Resolve the Agency owner's next business-operating checkpoint. This is
 * intentionally different from the individual Agent journey: an Agency must
 * establish a business profile and identity, activate commercial access, then
 * bring its team into the shared operating workspace.
 */
export function deriveAgencyJourneyAccessState(input: {
  hasAgency: boolean;
  profileConfigured: boolean;
  brandingConfigured: boolean;
  billingActivated: boolean;
  teamReady: boolean;
  subscriptionStatus: AgencySubscriptionDisplayStatus;
}): AgencyJourneyAccessState {
  const dashboardUnlocked = Boolean(input.hasAgency && input.profileConfigured);
  const fullFeaturesUnlocked = Boolean(
    dashboardUnlocked && input.brandingConfigured && input.billingActivated,
  );

  if (!dashboardUnlocked) {
    return {
      dashboardUnlocked: false,
      fullFeaturesUnlocked: false,
      recommendedNextStep: 'create_agency_profile',
    };
  }

  if (!input.brandingConfigured) {
    return {
      dashboardUnlocked,
      fullFeaturesUnlocked: false,
      recommendedNextStep: 'complete_agency_brand',
    };
  }

  switch (input.subscriptionStatus) {
    case 'not_started':
      return {
        dashboardUnlocked,
        fullFeaturesUnlocked: false,
        recommendedNextStep: 'activate_launch_access',
      };
    case 'pending_payment':
      return {
        dashboardUnlocked,
        fullFeaturesUnlocked: false,
        recommendedNextStep: 'complete_payment',
      };
    case 'payment_under_review':
      return {
        dashboardUnlocked,
        fullFeaturesUnlocked: false,
        recommendedNextStep: 'await_payment_review',
      };
    case 'past_due':
    case 'cancelled':
    case 'expired':
      return {
        dashboardUnlocked,
        fullFeaturesUnlocked: false,
        recommendedNextStep: 'renew_launch_access',
      };
    case 'suspended':
    case 'unavailable':
      return {
        dashboardUnlocked,
        fullFeaturesUnlocked: false,
        recommendedNextStep: 'contact_support',
      };
    case 'active':
    case 'grace_period':
      // A canonical status and entitlement result should agree. Do not send an
      // owner to pay again if they disagree; make the discrepancy observable.
      if (!input.billingActivated) {
        return {
          dashboardUnlocked,
          fullFeaturesUnlocked: false,
          recommendedNextStep: 'contact_support',
        };
      }
      break;
  }

  if (!input.teamReady) {
    return {
      dashboardUnlocked,
      fullFeaturesUnlocked,
      recommendedNextStep: 'invite_team',
    };
  }

  return {
    dashboardUnlocked,
    fullFeaturesUnlocked,
    recommendedNextStep: 'workspace',
  };
}
