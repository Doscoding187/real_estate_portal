import type { AgencyRecommendedNextStep } from '@shared/agencyJourney';

export type AgencyJourneyAction = {
  href: string;
  label: string;
  title: string;
  description: string;
  waiting?: boolean;
};

/**
 * Presentation for the server-decided Agency journey state. Keep the action
 * language focused on the principal's operating workspace rather than the
 * individual Agent's profile-growth journey.
 */
export function getAgencyJourneyAction(
  status: { recommendedNextStep?: AgencyRecommendedNextStep } | null | undefined,
): AgencyJourneyAction {
  switch (status?.recommendedNextStep) {
    case 'create_agency_profile':
      return {
        href: '/agency/setup',
        label: 'Create agency profile',
        title: 'Create the Agency operating account',
        description:
          'Add the business details that establish the Agency workspace for your people, inventory and opportunities.',
      };
    case 'complete_agency_brand':
      return {
        href: '/agency/setup',
        label: 'Finish agency identity',
        title: 'Finish the Agency identity',
        description:
          'Complete the Agency branding details before using the business workspace for public-facing inventory.',
      };
    case 'activate_launch_access':
      return {
        href: '/agency/billing',
        label: 'Activate Launch Access',
        title: 'Activate the Agency workspace',
        description:
          'Confirm Agency Launch Access and request the assisted EFT invoice for the complete supported launch workspace.',
      };
    case 'complete_payment':
      return {
        href: '/agency/billing',
        label: 'Open invoice',
        title: 'Complete the Agency Launch Access payment',
        description:
          'Your invoice is ready. Pay by EFT and submit proof in Billing so finance can verify the Agency activation.',
      };
    case 'await_payment_review':
      return {
        href: '/agency/billing',
        label: 'View payment review',
        title: 'Your payment proof is under review',
        description:
          'Finance is verifying the Agency Launch Access payment. We will notify the owner when the operating workspace is active.',
        waiting: true,
      };
    case 'invite_team':
      return {
        href: '/agency/team',
        label: 'Invite team',
        title: 'Bring the team into the workspace',
        description:
          'Agency Launch Access is active. Invite the people who will own inventory, opportunities and follow-up.',
      };
    case 'renew_launch_access':
      return {
        href: '/agency/billing',
        label: 'Renew Launch Access',
        title: 'Renew the Agency workspace',
        description:
          'The previous Agency Launch Access term has ended. Review Billing to continue the supported business workspace.',
      };
    case 'contact_support':
      return {
        href: '/contact',
        label: 'Contact Property Listify',
        title: 'Your Agency Launch Access needs support',
        description:
          'Contact Property Listify so we can help resolve the Agency commercial access state before the workspace is used for live work.',
      };
    case 'workspace':
    default:
      return {
        href: '/agency/overview',
        label: 'Open workspace',
        title: 'Your Agency workspace is ready',
        description:
          'Continue managing the people, inventory, opportunities and commercial work that matter most today.',
      };
  }
}
