import { describe, expect, it } from 'vitest';
import { getAgencyJourneyAction } from './agencyJourney';

describe('Agency journey action presentation', () => {
  it('keeps payment proof and finance review as different Agency actions', () => {
    expect(getAgencyJourneyAction({ recommendedNextStep: 'complete_payment' })).toMatchObject({
      href: '/agency/billing',
      label: 'Open invoice',
    });
    expect(getAgencyJourneyAction({ recommendedNextStep: 'await_payment_review' })).toMatchObject({
      href: '/agency/billing',
      label: 'View payment review',
      waiting: true,
    });
  });

  it('turns an active Agency into a team-and-operations journey', () => {
    expect(getAgencyJourneyAction({ recommendedNextStep: 'invite_team' })).toMatchObject({
      href: '/agency/team',
      label: 'Invite team',
    });
    expect(getAgencyJourneyAction({ recommendedNextStep: 'workspace' })).toMatchObject({
      href: '/agency/overview',
      label: 'Open workspace',
    });
  });
});
