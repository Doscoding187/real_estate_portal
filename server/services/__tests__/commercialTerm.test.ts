import { describe, expect, it } from 'vitest';
import {
  calculateCommercialTermEnd,
  getCommercialProductKey,
  getConfiguredLaunchFeeMinor,
  isPaidCommercialTermExpired,
  resolveCommercialTerm,
  validatePaidLaunchAccessPayment,
} from '../commercialTerm';

describe('commercial term semantics', () => {
  const launchPlan = {
    name: 'developer_launch_access',
    price: 149900,
    priceMonthly: 0,
    trialDays: 0,
    metadata: {
      commercial_product_key: 'developer_launch_access',
      commercial_term_kind: 'paid_launch_access',
      commercial_term_duration_days: 90,
      commercial_requires_verified_payment: true,
      commercial_auto_renews: false,
      commercial_price_configured: true,
      commercial_launch_fee_minor: 149900,
      commercial_billing_interval: 'once_off',
    },
  };

  it('does not reinterpret paid Launch Access as a free trial', () => {
    expect(resolveCommercialTerm(launchPlan)).toEqual({
      kind: 'paid_launch_access',
      durationDays: 90,
      requiresVerifiedPayment: true,
      autoRenews: false,
    });
    expect(getCommercialProductKey(launchPlan)).toBe('developer_launch_access');
    expect(getConfiguredLaunchFeeMinor(launchPlan)).toBe(149900);
  });

  it('keeps free trials and normal recurring subscriptions as separate terms', () => {
    expect(resolveCommercialTerm({ name: 'agent_trial', trialDays: 14, metadata: null })).toEqual({
      kind: 'free_trial',
      durationDays: 14,
      requiresVerifiedPayment: false,
      autoRenews: false,
    });
    expect(resolveCommercialTerm({ name: 'agency_growth', trialDays: 0, metadata: null })).toEqual({
      kind: 'recurring_subscription',
      durationDays: null,
      requiresVerifiedPayment: true,
      autoRenews: true,
    });
  });

  it('calculates a fixed 90-day entitlement and never treats it as renewable', () => {
    const start = new Date('2026-08-07T00:00:00.000Z');
    const term = resolveCommercialTerm(launchPlan);
    const end = calculateCommercialTermEnd(start, term);

    expect(end?.toISOString()).toBe('2026-11-05T00:00:00.000Z');
    expect(
      isPaidCommercialTermExpired(term, 'active', end, new Date('2026-11-04T23:59:59.000Z')),
    ).toBe(false);
    expect(
      isPaidCommercialTermExpired(term, 'active', end, new Date('2026-11-05T00:00:00.000Z')),
    ).toBe(true);
    expect(
      isPaidCommercialTermExpired(term, 'active', end, new Date('2026-11-06T00:00:00.000Z')),
    ).toBe(true);
  });

  it('requires a configured fee and verified payment before activation', () => {
    const term = resolveCommercialTerm(launchPlan);
    const payment = {
      invoiceId: 10,
      paymentId: 20,
      amountMinor: 149_900,
      state: 'verified' as const,
    };

    expect(validatePaidLaunchAccessPayment(term, 149_900, payment)).toBeNull();
    expect(validatePaidLaunchAccessPayment(term, 150_000, { ...payment, amountMinor: 149_899 })).toContain('below');
    expect(
      validatePaidLaunchAccessPayment(term, 100_000, { ...payment, state: 'submitted' }),
    ).toContain('verified');
  });

  it('keeps an unconfigured launch fee unavailable rather than treating it as free', () => {
    const unconfigured = resolveCommercialTerm({
      ...launchPlan,
      metadata: { ...launchPlan.metadata, commercial_price_configured: false },
    });
    expect(getConfiguredLaunchFeeMinor({ ...launchPlan, metadata: { ...launchPlan.metadata, commercial_price_configured: false } })).toBeNull();
    expect(
      validatePaidLaunchAccessPayment(unconfigured, null, {
        invoiceId: 10,
        paymentId: 20,
        amountMinor: 149_900,
        state: 'verified',
      }),
    ).toContain('fee is configured');
  });
});
