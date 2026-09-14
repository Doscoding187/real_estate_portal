import { describe, expect, it } from 'vitest';
import { getAgentJourneyAction } from './agentJourney';

describe('Agent journey support handoff', () => {
  it('preserves the Agent account context when support is required', () => {
    expect(getAgentJourneyAction({ recommendedNextStep: 'contact_support' })).toMatchObject({
      href: '/contact?area=agent&topic=account-access',
    });
  });
});
