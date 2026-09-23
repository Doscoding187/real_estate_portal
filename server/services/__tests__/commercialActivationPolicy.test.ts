import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getCommercialActivationStatus,
  getCommercialActivationOperatorStatus,
  isCommercialActivationAvailable,
  resolveCommercialActivationConfiguration,
  requireCommercialActivation,
} from '../commercialActivationPolicy';
import { isPaidMvpLaunchAccessProductEnabled } from '../../../shared/commercialActivation';
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
      productAvailability: {
        agent_launch_access: false,
        agency_launch_access: false,
        developer_launch_access: false,
      },
    });
  });

  it('only permits paid-state fixtures in governed test runtimes', () => {
    expect(isCommercialActivationAvailable({ NODE_ENV: 'test', VITEST: 'true' })).toBe(true);
    expect(
      getCommercialActivationStatus({ NODE_ENV: 'test', VITEST: 'true' }).productAvailability,
    ).toEqual({
      agent_launch_access: true,
      agency_launch_access: true,
      developer_launch_access: true,
    });
    expect(isCommercialActivationAvailable({ NODE_ENV: 'test' })).toBe(false);
    expect(
      isCommercialActivationAvailable({
        NODE_ENV: 'test',
        APP_ENV: 'test',
        PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_FIXTURE: 'true',
        DATABASE_AUTHORITY_PARENT_FINGERPRINT: 'owned-target',
        DATABASE_AUTHORITY_CORRELATION_ID: 'authority-run',
      }),
    ).toBe(true);
    expect(
      isCommercialActivationAvailable({
        NODE_ENV: 'test',
        APP_ENV: 'test',
        PROPERTY_LISTIFY_GOVERNED_SCENARIO_TEST_FIXTURE: 'true',
        DATABASE_AUTHORITY_PARENT_FINGERPRINT: 'owned-target',
        DATABASE_AUTHORITY_CORRELATION_ID: 'authority-run',
      }),
    ).toBe(false);
    expect(
      isCommercialActivationAvailable({
        NODE_ENV: 'test',
        APP_ENV: 'test',
        PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_FIXTURE: 'true',
      }),
    ).toBe(false);
    expect(
      isCommercialActivationAvailable({
        NODE_ENV: 'test',
        APP_ENV: 'test',
        PROPERTY_LISTIFY_GOVERNED_SCENARIO_TEST_FIXTURE: 'true',
      }),
    ).toBe(false);
    expect(
      isCommercialActivationAvailable({
        NODE_ENV: 'development',
        APP_ENV: 'test',
        PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_FIXTURE: 'true',
        DATABASE_AUTHORITY_PARENT_FINGERPRINT: 'owned-target',
        DATABASE_AUTHORITY_CORRELATION_ID: 'authority-run',
      }),
    ).toBe(false);
    expect(
      isCommercialActivationAvailable({
        NODE_ENV: 'production',
        APP_ENV: 'test',
        PROPERTY_LISTIFY_GOVERNED_SCENARIO_TEST_FIXTURE: 'true',
        DATABASE_AUTHORITY_PARENT_FINGERPRINT: 'owned-target',
        DATABASE_AUTHORITY_CORRELATION_ID: 'authority-run',
      }),
    ).toBe(false);
    expect(isCommercialActivationAvailable()).toBe(true);
  });

  it('limits a governed browser fixture to its explicit exact product key', () => {
    const agencyOnlyFixture = {
      NODE_ENV: 'test',
      APP_ENV: 'test',
      PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_FIXTURE: 'true',
      PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_PRODUCT_KEYS: 'agency_launch_access',
      DATABASE_AUTHORITY_PARENT_FINGERPRINT: 'owned-target',
      DATABASE_AUTHORITY_CORRELATION_ID: 'b05-agency-only',
    };

    expect(isCommercialActivationAvailable(agencyOnlyFixture, 'agency_launch_access')).toBe(true);
    expect(isCommercialActivationAvailable(agencyOnlyFixture, 'agent_launch_access')).toBe(false);
    expect(isCommercialActivationAvailable(agencyOnlyFixture, 'developer_launch_access')).toBe(false);
    expect(getCommercialActivationStatus(agencyOnlyFixture).productAvailability).toEqual({
      agent_launch_access: false,
      agency_launch_access: true,
      developer_launch_access: false,
    });
  });

  it('rejects a malformed governed product selector', () => {
    const malformedFixture = {
      NODE_ENV: 'test',
      APP_ENV: 'test',
      PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_FIXTURE: 'true',
      PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_PRODUCT_KEYS: 'agency_launch_access,not_a_product',
      DATABASE_AUTHORITY_PARENT_FINGERPRINT: 'owned-target',
      DATABASE_AUTHORITY_CORRELATION_ID: 'b05-malformed-selector',
    };

    expect(() => isCommercialActivationAvailable(malformedFixture)).toThrow(/unknown/i);
  });

  it.each([
    ['unknown', 'agent_launch_access,unapproved_plan'],
    ['wildcard', '*'],
    ['duplicate', 'agent_launch_access,agent_launch_access'],
    ['empty component', 'agent_launch_access,,agency_launch_access'],
  ])('rejects a production activation list with a %s component', (_label, productKeys) => {
    expect(() => resolveCommercialActivationConfiguration({
      NODE_ENV: 'production',
      APP_ENV: 'production',
      PAID_MVP_ENABLED_PRODUCT_KEYS: productKeys,
      PAID_MVP_RELEASE_ID: 'paid-mvp-rc-1',
      PAID_MVP_APPROVAL_REF: 'b16-approval-1',
    })).toThrow();
  });

  it('enables only the exact three product keys with release metadata in production', () => {
    const release = resolveCommercialActivationConfiguration({
      NODE_ENV: 'production',
      APP_ENV: 'production',
      PAID_MVP_ENABLED_PRODUCT_KEYS:
        'agent_launch_access,agency_launch_access,developer_launch_access',
      PAID_MVP_RELEASE_ID: 'paid-mvp-rc-1',
      PAID_MVP_APPROVAL_REF: 'b16-approval-1',
    });
    expect(release).toMatchObject({
      mode: 'paid_mvp_release',
      enabled: true,
      enabledProductKeys: [
        'agent_launch_access',
        'agency_launch_access',
        'developer_launch_access',
      ],
      releaseId: 'paid-mvp-rc-1',
      approvalRef: 'b16-approval-1',
    });
    expect(Object.isFrozen(release.enabledProductKeys)).toBe(true);
  });

  it('does not treat client-like or customer-state fields as activation authority', () => {
    expect(isCommercialActivationAvailable({
      NODE_ENV: 'production',
      APP_ENV: 'production',
      enabled: true,
      productAvailability: {
        agent_launch_access: true,
        agency_launch_access: true,
        developer_launch_access: true,
        all: true,
      },
      customerDatabaseCommercialEnabled: true,
    } as any)).toBe(false);
  });

  it('keeps release references in the super-admin status projection only', () => {
    const production = {
      NODE_ENV: 'production',
      APP_ENV: 'production',
      PAID_MVP_ENABLED_PRODUCT_KEYS:
        'agent_launch_access,agency_launch_access,developer_launch_access',
      PAID_MVP_RELEASE_ID: 'paid-mvp-rc-1',
      PAID_MVP_APPROVAL_REF: 'b16-approval-1',
      GITHUB_SHA: 'candidate-sha-1',
    };
    expect(getCommercialActivationOperatorStatus(production)).toEqual({
      status: 'valid',
      enabled: true,
      enabledProductKeys: [
        'agent_launch_access',
        'agency_launch_access',
        'developer_launch_access',
      ],
      releaseId: 'paid-mvp-rc-1',
      approvalRef: 'b16-approval-1',
      buildSha: 'candidate-sha-1',
    });
    expect(getCommercialActivationStatus(production)).not.toHaveProperty('releaseId');
    expect(getCommercialActivationStatus(production)).not.toHaveProperty('approvalRef');
  });

  it('rejects production subsets and missing release metadata', () => {
    expect(() => resolveCommercialActivationConfiguration({
      NODE_ENV: 'production',
      APP_ENV: 'production',
      PAID_MVP_ENABLED_PRODUCT_KEYS: 'agent_launch_access',
      PAID_MVP_RELEASE_ID: 'paid-mvp-rc-1',
      PAID_MVP_APPROVAL_REF: 'b16-approval-1',
    })).toThrow(/exactly the three/i);
    expect(() => resolveCommercialActivationConfiguration({
      NODE_ENV: 'staging',
      APP_ENV: 'staging',
      PAID_MVP_ENABLED_PRODUCT_KEYS: 'agent_launch_access',
      PAID_MVP_RELEASE_ID: 'paid-mvp-rc-1',
    })).toThrow(/APPROVAL_REF/);
    expect(() => resolveCommercialActivationConfiguration({
      NODE_ENV: 'production',
      APP_ENV: 'production',
      PAID_MVP_RELEASE_ID: 'paid-mvp-rc-1',
      PAID_MVP_APPROVAL_REF: 'b16-approval-1',
    })).toThrow(/without an enabled product list/);
  });

  it('fails closed before a commercial mutation starts', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(() => requireCommercialActivation('Payment review')).toThrow(
      /preparation-only onboarding/,
    );
  });

  it('allows a future release decision to enable only its explicit paid-MVP product keys', () => {
    const boundedRelease = {
      mode: 'paid_mvp' as const,
      enabled: true,
      enabledProductKeys: ['agent_launch_access'] as const,
    };
    expect(isPaidMvpLaunchAccessProductEnabled('agent_launch_access', boundedRelease)).toBe(true);
    expect(isPaidMvpLaunchAccessProductEnabled('agency_launch_access', boundedRelease)).toBe(false);
    expect(isPaidMvpLaunchAccessProductEnabled('developer_launch_access', boundedRelease)).toBe(false);
    expect(isPaidMvpLaunchAccessProductEnabled('land_launch_access', boundedRelease)).toBe(false);
    expect(isCommercialActivationAvailable({ NODE_ENV: 'production' })).toBe(false);
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
