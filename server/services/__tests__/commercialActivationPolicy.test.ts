import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getCommercialActivationStatus,
  isCommercialActivationAvailable,
  requireCommercialActivation,
} from '../commercialActivationPolicy';
import {
  getManualEftBankDetails,
  requestPaidLaunchAccessInvoice,
  requestAgencyCancellationAtPeriodEnd,
  reviewManualPayment,
  restoreAgencySubscription,
  startAgencyManualCheckout,
  submitAgencyPaymentProof,
  submitPaidLaunchAccessPaymentProof,
  updateSubscriptionLifecycle,
} from '../billingFoundationService';
import {
  claimBillingProviderEvent,
  completeBillingProviderEvent,
  failBillingProviderEvent,
  recordBillingProviderEvent,
} from '../billingProviderEventService';
import { getDeveloperPublicationAccess } from '../developerPublicationAccess';
import { activatePaidLaunchAccessForOwner } from '../planAccessService';

describe('commercial activation containment', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is disabled for development and deployed runtimes', () => {
    expect(isCommercialActivationAvailable({ NODE_ENV: 'development' })).toBe(false);
    expect(isCommercialActivationAvailable({ NODE_ENV: 'production' })).toBe(false);
    expect(isCommercialActivationAvailable({ NODE_ENV: 'development', VITEST: 'true' })).toBe(
      false,
    );
    expect(isCommercialActivationAvailable({ NODE_ENV: 'production', VITEST: 'true' })).toBe(false);
    expect(getCommercialActivationStatus({ NODE_ENV: 'production' })).toMatchObject({
      mode: 'preparation_only',
      enabled: false,
    });
  });

  it('only permits paid-state fixtures in the isolated Vitest runtime', () => {
    expect(isCommercialActivationAvailable({ NODE_ENV: 'test', VITEST: 'true' })).toBe(true);
    expect(isCommercialActivationAvailable({ NODE_ENV: 'test' })).toBe(false);
    expect(isCommercialActivationAvailable()).toBe(true);
  });

  it('fails closed before a commercial mutation starts', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(() => requireCommercialActivation('Payment review')).toThrow(
      /preparation-only onboarding/,
    );
  });

  it('does not expose EFT account details while activation is disabled', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(getManualEftBankDetails()).toMatchObject({
      configured: false,
      canIssueInvoices: false,
      accountNumber: '',
    });
  });

  it('blocks invoice, proof, finance, entitlement, and provider paths before database work', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const expected = /preparation-only onboarding/;

    await expect(
      requestPaidLaunchAccessInvoice({ user: { id: 1, role: 'agent' } }),
    ).rejects.toThrow(expected);
    await expect(
      startAgencyManualCheckout({
        user: { id: 1, role: 'agency_admin', agencyId: 1 },
        planId: 1,
        billingCycle: 'monthly',
      }),
    ).rejects.toThrow(expected);
    await expect(
      submitPaidLaunchAccessPaymentProof({
        user: { id: 1, role: 'agent' },
        invoiceId: 1,
        amount: 100,
        file: {
          filename: 'proof.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1,
          contentBase64: 'AA==',
        },
      }),
    ).rejects.toThrow(expected);
    await expect(
      submitAgencyPaymentProof({
        user: { id: 1, role: 'agency_admin', agencyId: 1 },
        invoiceId: 1,
        amount: 100,
        file: {
          filename: 'proof.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1,
          contentBase64: 'AA==',
        },
      }),
    ).rejects.toThrow(expected);
    await expect(
      reviewManualPayment({
        actorUser: { id: 1, role: 'super_admin' },
        paymentId: 1,
        decision: 'approve',
      }),
    ).rejects.toThrow(expected);
    await expect(
      updateSubscriptionLifecycle({
        actorUser: { id: 1, role: 'super_admin' },
        subscriptionId: 1,
        status: 'active',
      }),
    ).rejects.toThrow(expected);
    await expect(
      requestAgencyCancellationAtPeriodEnd({ id: 1, role: 'agency_admin', agencyId: 1 }),
    ).rejects.toThrow(expected);
    await expect(
      restoreAgencySubscription({ id: 1, role: 'agency_admin', agencyId: 1 }),
    ).rejects.toThrow(expected);
    await expect(
      activatePaidLaunchAccessForOwner({
        ownerType: 'agent',
        ownerId: 1,
        planId: 1,
        verifiedPayment: { invoiceId: 1, paymentId: 1, amountMinor: 100, state: 'verified' },
      }),
    ).rejects.toThrow(expected);
    await expect(
      recordBillingProviderEvent({
        provider: 'test-provider',
        providerEventId: 'evt-1',
        eventType: 'payment.succeeded',
        payload: {},
      }),
    ).rejects.toThrow(expected);
    await expect(claimBillingProviderEvent(1)).rejects.toThrow(expected);
    await expect(completeBillingProviderEvent(1, 'claim-token', 'applied')).rejects.toThrow(
      expected,
    );
    await expect(failBillingProviderEvent(1, 'claim-token', 'failed')).rejects.toThrow(expected);
    await expect(getDeveloperPublicationAccess(1, { db: {} as any })).resolves.toMatchObject({
      eligible: false,
      reason: 'commercial_activation_unavailable',
    });
  });
});
