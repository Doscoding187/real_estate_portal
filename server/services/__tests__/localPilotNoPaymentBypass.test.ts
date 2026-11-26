import { describe, expect, it } from 'vitest';

import { isPaidMvpLaunchAccessSubscriptionEntitled } from '../planAccessService';

/**
 * The local pilot mode only flips commercial activation (the PAID_MVP_* keys).
 * Per-owner entitlement is still read from a persisted subscription row, which
 * publicPropertyEligibilityService.loadAgentPaidEntitledUserIds feeds through
 * isPaidMvpLaunchAccessSubscriptionEntitled. These tests show the predicate is
 * independent of the activation mode: unpaid owners stay unentitled.
 */
const plan = {
  segment: 'agent',
  isActive: 1,
  metadata: {
    commercial_product_key: 'agent_launch_access',
    commercial_term_kind: 'paid_launch_access',
    commercial_term_duration_days: 90,
    commercial_requires_verified_payment: true,
    commercial_auto_renews: false,
  },
} as any;
const future = new Date(Date.now() + 30 * 86_400_000);

describe('pilot mode adds no payment bypass', () => {
  it('an owner without an approved entitlement is not entitled', () => {
    for (const status of ['pending', 'pending_payment', 'trial', 'expired', 'cancelled', null]) {
      expect(
        isPaidMvpLaunchAccessSubscriptionEntitled(
          { status, currentPeriodEnd: future },
          plan,
          'agent',
        ),
      ).toBe(false);
    }
    expect(
      isPaidMvpLaunchAccessSubscriptionEntitled(
        { status: 'active', currentPeriodEnd: new Date(Date.now() - 1000) },
        plan,
        'agent',
      ),
    ).toBe(false);
  });

  it('only an active, unexpired, verified-payment launch subscription is entitled', () => {
    expect(
      isPaidMvpLaunchAccessSubscriptionEntitled(
        { status: 'active', currentPeriodEnd: future },
        plan,
        'agent',
      ),
    ).toBe(true);
  });
});
