import type {
  AgentRecommendedNextStep,
  AgentSubscriptionDisplayStatus,
} from '@shared/agentJourney';
import { COMMERCIAL_ACTIVATION_STATE } from '@shared/commercialActivation';

export type AgentJourneyStatus = {
  recommendedNextStep: AgentRecommendedNextStep;
  subscriptionStatus: AgentSubscriptionDisplayStatus;
  onboardingComplete: boolean;
  profileCompletionScore: number;
};

export type AgentJourneyAction = {
  href: string;
  label: string;
  title: string;
  description: string;
  waiting?: boolean;
};

type AgentJourneyOptions = {
  commercialActivationEnabled?: boolean;
};

function preparationAction(): AgentJourneyAction {
  return {
    href: '/agent/dashboard',
    label: 'Continue preparation',
    title: 'Prepare your Agent workspace',
    description:
      'Commercial activation is not available yet. Continue preparing your professional presence and private inventory; publishing becomes available after approved commercial activation.',
  };
}

/**
 * A profile-completion lock must describe the runtime that is actually
 * available. Individual workspace pages supply their own feature-specific
 * title, while this message keeps the commercial boundary consistent.
 */
export function getAgentProfileCompletionDescription(options: AgentJourneyOptions = {}): string {
  const commercialActivationEnabled =
    options.commercialActivationEnabled ?? COMMERCIAL_ACTIVATION_STATE.enabled;

  if (commercialActivationEnabled) {
    return 'Finish your professional profile, then activate Launch Access for this workspace.';
  }

  return 'Finish your professional profile and continue preparing your private workspace. Commercial activation, publishing, and new marketplace enquiries remain unavailable until the approved activation path opens.';
}

/**
 * Every Agent surface uses this presentation of the server-decided journey
 * state. This prevents a finished profile from being sent back to setup by one
 * page while another page correctly asks for Launch Access.
 */
export function getAgentJourneyAction(
  status: { recommendedNextStep?: AgentRecommendedNextStep } | null | undefined,
  options: AgentJourneyOptions = {},
): AgentJourneyAction {
  const commercialActivationEnabled =
    options.commercialActivationEnabled ?? COMMERCIAL_ACTIVATION_STATE.enabled;

  switch (status?.recommendedNextStep) {
    case 'verify_email':
      return {
        href: '/login',
        label: 'Verify email',
        title: 'Verify your email address',
        description:
          'Use the verification link sent to your inbox, then sign in to continue setting up your Agent workspace.',
      };
    case 'complete_profile_basics':
      return {
        href: '/agent/setup',
        label: 'Finish setup',
        title: 'Complete your professional profile',
        description:
          'Add the remaining core profile details so Property Listify can prepare your agent workspace.',
      };
    case 'publish_profile':
      return {
        href: '/agent/setup',
        label: 'Complete profile',
        title: 'Finish your public professional profile',
        description:
          'Your core details are in place. Complete your profile so your public presence is ready for Launch Access.',
      };
    case 'complete_payment':
      if (!commercialActivationEnabled) return preparationAction();
      return {
        href: '/agent/select-package',
        label: 'Complete payment',
        title: 'Complete your Launch Access payment',
        description:
          'Your Launch Access invoice is ready. Pay by EFT and submit proof here to begin verification.',
      };
    case 'await_payment_review':
      return {
        href: '/agent/dashboard',
        label: 'Return to dashboard',
        title: 'Your payment proof is under review',
        description:
          'We will notify you when Launch Access is active. Your professional profile remains available while verification is in progress.',
        waiting: true,
      };
    case 'await_agency_activation':
      return {
        href: '/agent/dashboard',
        label: 'Return to dashboard',
        title: 'Your agency manages Launch Access',
        description:
          'Your agency membership is confirmed. Continue working existing assigned enquiries while your agency completes commercial access; publishing and new marketplace enquiries remain paused.',
        waiting: true,
      };
    case 'await_profile_approval':
      return {
        href: '/agent/dashboard',
        label: 'View approval status',
        title: 'Your professional profile is under review',
        description:
          'Your Launch Access is active. We are reviewing your professional profile before listings and leads can go live.',
        waiting: true,
      };
    case 'renew_launch_access':
      if (!commercialActivationEnabled) return preparationAction();
      return {
        href: '/agent/select-package',
        label: 'Renew Launch Access',
        title: 'Renew your Launch Access',
        description:
          'Your previous access period has ended. Renew Launch Access to resume publishing and receiving new marketplace enquiries. You can continue working enquiries already assigned to you.',
      };
    case 'contact_support':
      return {
        href: '/contact?area=agent&topic=account-access',
        label: 'Contact Property Listify',
        title: 'Your Launch Access needs support',
        description: 'Contact Property Listify so we can help restore your account access.',
      };
    case 'dashboard':
      return {
        href: '/agent/dashboard',
        label: 'Open dashboard',
        title: 'Your Agent workspace is ready',
        description: 'Continue with the work that matters most to your business today.',
      };
    case 'select_package':
    default:
      if (!commercialActivationEnabled) return preparationAction();
      return {
        href: '/agent/select-package',
        label: 'Activate Launch Access',
        title: 'Activate your Agent workspace',
        description:
          'Your professional profile is ready. Choose Agent Launch Access to start publishing inventory and working enquiries.',
      };
  }
}

export function isAgentProfileJourneyStep(
  status: { recommendedNextStep?: AgentRecommendedNextStep } | null | undefined,
) {
  return (
    status?.recommendedNextStep === 'complete_profile_basics' ||
    status?.recommendedNextStep === 'publish_profile'
  );
}
