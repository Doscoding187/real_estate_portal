import { describe, expect, it } from 'vitest';
import {
  calculateCommercialTermEnd,
  getCommercialProductKey,
  getConfiguredLaunchFeeMinor,
  isPaidCommercialTermExpired,
  parseCanonicalCommercialTimestamp,
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

    expect(end?.getTime() - start.getTime()).toBe(90 * 24 * 60 * 60 * 1000);
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
    // MySQL DATETIME is UTC, independent of the worker's local timezone.
    expect(
      isPaidCommercialTermExpired(
        term,
        'active',
        '2026-11-05 00:00:00',
        new Date('2026-11-04T23:59:59.000Z'),
      ),
    ).toBe(false);
    expect(
      isPaidCommercialTermExpired(
        term,
        'active',
        '2026-11-05 00:00:00',
        new Date('2026-11-05T00:00:00.000Z'),
      ),
    ).toBe(true);
    expect(isPaidCommercialTermExpired(term, 'active', null, start)).toBe(true);
    expect(isPaidCommercialTermExpired(term, 'active', 'not-a-date', start)).toBe(true);
  });

  it.each(['2026-03-01T12:34:56.789Z', '2026-10-01T12:34:56.789Z'])(
    'preserves fixed duration and repeated UTC round trips from %s',
    value => {
      const term = resolveCommercialTerm(launchPlan);
      const activation = new Date(value);
      let start = activation;
      for (let renewal = 1; renewal <= 8; renewal += 1) {
        const end = calculateCommercialTermEnd(start, term)!;
        expect(end.getTime() - start.getTime()).toBe(90 * 24 * 60 * 60 * 1000);
        const stored = end.toISOString().replace('T', ' ').replace('Z', '');
        const restored = parseCanonicalCommercialTimestamp(stored)!;
        expect(restored).toBe(end.getTime());
        expect(restored - activation.getTime()).toBe(renewal * 90 * 24 * 60 * 60 * 1000);
        start = new Date(restored);
      }
    },
  );

  it('preserves explicit timezone offsets and rejects invalid timestamps', () => {
    const expected = Date.parse('2026-09-17T12:34:56.789Z');
    expect(parseCanonicalCommercialTimestamp('2026-09-17 12:34:56.789')).toBe(expected);
    expect(parseCanonicalCommercialTimestamp('2026-09-17T12:34:56.789')).toBe(expected);
    expect(parseCanonicalCommercialTimestamp('2026-09-17T14:34:56.789+02:00')).toBe(expected);
    expect(parseCanonicalCommercialTimestamp('2026-09-17T08:34:56.789-04:00')).toBe(expected);
    expect(parseCanonicalCommercialTimestamp(new Date(expected))).toBe(expected);
    expect(parseCanonicalCommercialTimestamp('invalid')).toBeNull();
    expect(parseCanonicalCommercialTimestamp(null)).toBeNull();
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
    expect(
      validatePaidLaunchAccessPayment(term, 150_000, { ...payment, amountMinor: 149_899 }),
    ).toContain('below');
    expect(
      validatePaidLaunchAccessPayment(term, 100_000, { ...payment, state: 'submitted' }),
    ).toContain('verified');
  });

  it('keeps an unconfigured launch fee unavailable rather than treating it as free', () => {
    const unconfigured = resolveCommercialTerm({
      ...launchPlan,
      metadata: { ...launchPlan.metadata, commercial_price_configured: false },
    });
    expect(
      getConfiguredLaunchFeeMinor({
        ...launchPlan,
        metadata: { ...launchPlan.metadata, commercial_price_configured: false },
      }),
    ).toBeNull();
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
