/**
 * Canonical, transport-safe vocabulary for the Agent commercial and onboarding
 * journey.  The server decides the current state; client surfaces use the
 * recommended step so every entry point gives the agent the same next move.
 */
export const AGENT_SUBSCRIPTION_STATUS_VALUES = [
  'trial',
  'pending_payment',
  'payment_under_review',
  'active',
  'past_due',
  'grace_period',
  'suspended',
  'cancelled',
  'expired',
] as const;

export type AgentSubscriptionStatus = (typeof AGENT_SUBSCRIPTION_STATUS_VALUES)[number];
export type AgentSubscriptionDisplayStatus = AgentSubscriptionStatus | 'unassigned';

export const AGENT_APPROVAL_STATUS_VALUES = [
  'pending',
  'approved',
  'rejected',
  'suspended',
] as const;

export type AgentApprovalStatus = (typeof AGENT_APPROVAL_STATUS_VALUES)[number];

export const AGENT_RECOMMENDED_NEXT_STEP_VALUES = [
  'verify_email',
  'complete_profile_basics',
  'publish_profile',
  'select_package',
  'complete_payment',
  'await_payment_review',
  'await_profile_approval',
  'renew_launch_access',
  'contact_support',
  'dashboard',
] as const;

export type AgentRecommendedNextStep = (typeof AGENT_RECOMMENDED_NEXT_STEP_VALUES)[number];

export type AgentJourneyAccessState = {
  fullFeaturesUnlocked: boolean;
  recommendedNextStep: AgentRecommendedNextStep;
};

export function normalizeAgentSubscriptionStatus(
  value: string | null | undefined,
): AgentSubscriptionDisplayStatus {
  return AGENT_SUBSCRIPTION_STATUS_VALUES.includes(value as AgentSubscriptionStatus)
    ? (value as AgentSubscriptionStatus)
    : 'unassigned';
}

export function deriveAgentJourneyAccessState(input: {
  onboardingComplete: boolean;
  onboardingStep: number;
  coreContactReady: boolean;
  emailVerified: boolean;
  approvalStatus: AgentApprovalStatus;
  subscriptionStatus: AgentSubscriptionDisplayStatus;
}): AgentJourneyAccessState {
  const profileNextStep: AgentRecommendedNextStep =
    input.onboardingStep >= 3 ? 'publish_profile' : 'complete_profile_basics';

  if (!input.emailVerified) {
    return {
      fullFeaturesUnlocked: false,
      recommendedNextStep: 'verify_email',
    };
  }

  if (!input.onboardingComplete || !input.coreContactReady) {
    return {
      fullFeaturesUnlocked: false,
      recommendedNextStep: profileNextStep,
    };
  }

  if (input.approvalStatus === 'rejected' || input.approvalStatus === 'suspended') {
    return {
      fullFeaturesUnlocked: false,
      recommendedNextStep: 'contact_support',
    };
  }

  switch (input.subscriptionStatus) {
    case 'trial':
    case 'active':
    case 'grace_period':
      if (input.approvalStatus !== 'approved') {
        return {
          fullFeaturesUnlocked: false,
          recommendedNextStep: 'await_profile_approval',
        };
      }
      return {
        fullFeaturesUnlocked: true,
        recommendedNextStep: 'dashboard',
      };
    case 'pending_payment':
      return {
        fullFeaturesUnlocked: false,
        recommendedNextStep: 'complete_payment',
      };
    case 'payment_under_review':
      return {
        fullFeaturesUnlocked: false,
        recommendedNextStep: 'await_payment_review',
      };
    case 'expired':
    case 'past_due':
    case 'cancelled':
      return {
        fullFeaturesUnlocked: false,
        recommendedNextStep: 'renew_launch_access',
      };
    case 'suspended':
      return {
        fullFeaturesUnlocked: false,
        recommendedNextStep: 'contact_support',
      };
    case 'unassigned':
    default:
      return {
        fullFeaturesUnlocked: false,
        recommendedNextStep: 'select_package',
      };
  }
}
