import { describe, expect, it } from 'vitest';
import { getAgentJourneyAction, getAgentProfileCompletionDescription } from './agentJourney';
import type { AgentRecommendedNextStep } from '@shared/agentJourney';

describe('Agent journey support handoff', () => {
  it('preserves the Agent account context when support is required', () => {
    expect(getAgentJourneyAction({ recommendedNextStep: 'contact_support' })).toMatchObject({
      href: '/contact?area=agent&topic=account-access',
    });
  });

  it('keeps unactivated commercial states in private preparation while activation is disabled', () => {
    const commercialSteps: AgentRecommendedNextStep[] = [
      'select_package',
      'complete_payment',
      'renew_launch_access',
    ];

    for (const recommendedNextStep of commercialSteps) {
      expect(getAgentJourneyAction({ recommendedNextStep })).toMatchObject({
        href: '/agent/dashboard',
        label: 'Continue preparation',
        title: 'Prepare your Agent workspace',
      });
    }
  });

  it('keeps profile-completion locks truthful while commercial activation is unavailable', () => {
    expect(getAgentProfileCompletionDescription()).toBe(
      'Finish your professional profile and continue preparing your private workspace. Commercial activation, publishing, and new marketplace enquiries remain unavailable until the approved activation path opens.',
    );
    expect(getAgentProfileCompletionDescription({ agentLaunchAccessAvailable: true })).toBe(
      'Finish your professional profile, then activate Launch Access for this workspace.',
    );
  });

  it('retains a commercial action only for an explicitly enabled runtime', () => {
    expect(
      getAgentJourneyAction(
        { recommendedNextStep: 'select_package' },
        { agentLaunchAccessAvailable: true },
      ),
    ).toMatchObject({
      href: '/agent/select-package',
      label: 'Activate Launch Access',
    });
  });
});
