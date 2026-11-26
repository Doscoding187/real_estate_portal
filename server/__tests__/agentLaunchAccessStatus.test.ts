import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { deriveAgentLaunchAccess } from '../../shared/agentJourney';

const read = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const order = {
  invoiceId: 9,
  reference: 'PLAN990101-8344DC',
  amountMinor: 49900,
  currency: 'ZAR',
  submittedAt: '2026-11-18 10:00:00',
  state: 'under_review' as const,
};

describe('agent Launch Access status (single source of truth)', () => {
  it('reports paid once finance approval makes the entitlement predicate true', () => {
    const state = deriveAgentLaunchAccess({
      hasCommercialAccess: true,
      subscriptionStatus: 'active',
      pendingOrder: null,
    });
    expect(state).toEqual({ paid: true, state: 'paid', pendingOrder: null });
  });

  it.each(['expired', 'cancelled', 'suspended', 'past_due'] as const)(
    'flips back to unpaid after revoke/refund/expiry (%s)',
    subscriptionStatus => {
      const state = deriveAgentLaunchAccess({
        hasCommercialAccess: false,
        subscriptionStatus,
        pendingOrder: null,
      });
      expect(state).toMatchObject({ paid: false, state: 'ended' });
    },
  );

  it('exposes the pending order reference, amount and submittedAt while under review', () => {
    const state = deriveAgentLaunchAccess({
      hasCommercialAccess: false,
      subscriptionStatus: 'payment_under_review',
      pendingOrder: order,
    });
    expect(state.paid).toBe(false);
    expect(state.state).toBe('under_review');
    expect(state.pendingOrder).toMatchObject({
      reference: 'PLAN990101-8344DC',
      amountMinor: 49900,
      submittedAt: '2026-11-18 10:00:00',
    });
  });

  it('reports awaiting payment and none distinctly', () => {
    expect(
      deriveAgentLaunchAccess({
        hasCommercialAccess: false,
        subscriptionStatus: 'pending_payment',
        pendingOrder: null,
      }).state,
    ).toBe('awaiting_payment');
    expect(
      deriveAgentLaunchAccess({
        hasCommercialAccess: false,
        subscriptionStatus: 'unassigned',
        pendingOrder: null,
      }).state,
    ).toBe('none');
  });

  it('wires the onboarding status to the entitlement authority and the pending invoice', () => {
    const service = read('server/services/agentOnboardingService.ts');
    expect(service).toContain('hasCommercialAccess: Boolean(entitlements?.hasCommercialAccess)');
    expect(service).toContain("getPendingLaunchAccessOrder('agent', userId)");
    expect(service).toContain('launchAccess,');
  });

  it('refuses a second Launch Access order while finance is reviewing one', () => {
    const billing = read('server/services/billingFoundationService.ts');
    const guardIndex = billing.indexOf('One Launch Access order at a time');
    const upsertIndex = billing.indexOf('await upsertPendingSubscription(tx, {', guardIndex);
    expect(guardIndex).toBeGreaterThan(0);
    // The refusal happens before the subscription can be rolled back to pending_payment.
    expect(upsertIndex).toBeGreaterThan(guardIndex);
    expect(billing.slice(guardIndex, upsertIndex)).toContain("eq(billingInvoices.status, 'submitted')");
    expect(billing.slice(guardIndex, upsertIndex)).toContain("code: 'CONFLICT'");
  });
});
