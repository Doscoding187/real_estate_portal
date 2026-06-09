import { describe, expect, it } from 'vitest';

import { WORKSPACE_LINKS } from './ReferralSidebar';

describe('ReferralSidebar workspace links', () => {
  it('uses rewards language for the partner payout destination', () => {
    const rewardsLink = WORKSPACE_LINKS.find(
      item => item.href === '/distribution/partner/commissions',
    );

    expect(rewardsLink?.label).toBe('Rewards');
    expect(WORKSPACE_LINKS.some(item => item.label === 'Commissions')).toBe(false);
  });
});
