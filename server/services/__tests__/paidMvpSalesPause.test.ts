import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getCommercialActivationStatus,
  isCommercialActivationAvailable,
  requirePaidMvpSalesOpen,
  resolveCommercialActivationConfiguration,
} from '../commercialActivationPolicy';
import {
  requestPaidLaunchAccessInvoice,
  reviewManualPayment,
  startAgencyManualCheckout,
} from '../billingFoundationService';

const releaseEnvironment = {
  NODE_ENV: 'production',
  APP_ENV: 'production',
  PAID_MVP_ENABLED_PRODUCT_KEYS:
    'agent_launch_access,agency_launch_access,developer_launch_access',
  PAID_MVP_RELEASE_ID: 'v1-release',
  PAID_MVP_APPROVAL_REF: 'founder-v1',
  PAID_MVP_SALES_PAUSED: 'true',
};

describe('founder-only new-sales pause', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('blocks new invoices while leaving the existing paid product active', () => {
    expect(isCommercialActivationAvailable(releaseEnvironment, 'agency_launch_access')).toBe(true);
    expect(getCommercialActivationStatus(releaseEnvironment)).toMatchObject({
      enabled: true,
      salesPaused: true,
      productAvailability: { agency_launch_access: true },
    });
    expect(() => requirePaidMvpSalesOpen('Invoice requests', releaseEnvironment)).toThrow(
      /Invoice requests is paused/,
    );
    expect(() =>
      requirePaidMvpSalesOpen('Invoice requests', {
        ...releaseEnvironment,
        PAID_MVP_SALES_PAUSED: 'false',
      }),
    ).not.toThrow();
    expect(() =>
      resolveCommercialActivationConfiguration({
        ...releaseEnvironment,
        PAID_MVP_SALES_PAUSED: 'yes',
      }),
    ).toThrow(/must be exactly true or false/);
  });

  it('rejects invoice issuance and finance activation before database access', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('APP_ENV', 'test');
    vi.stubEnv('VITEST', 'true');
    vi.stubEnv('PAID_MVP_SALES_PAUSED', 'true');

    await expect(requestPaidLaunchAccessInvoice({ user: {} as never })).rejects.toThrow(
      /Invoice requests is paused/,
    );
    await expect(
      startAgencyManualCheckout({ user: {} as never, planId: 1, billingCycle: 'monthly' }),
    ).rejects.toThrow(/Manual-EFT checkout is paused/);
    await expect(
      reviewManualPayment({ actorUser: {} as never, paymentId: 1, decision: 'approve' }),
    ).rejects.toThrow(/Payment activation is paused/);
  });
});
