import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getCommercialActivationStatus,
  isCommercialActivationAvailable,
  requirePaidMvpOwnerAdmission,
  requirePaidMvpOwnerAdmissionForSettlement,
  requirePaidMvpSalesOpen,
  resolveCommercialActivationConfiguration,
} from '../commercialActivationPolicy';
import {
  requestPaidLaunchAccessInvoice,
  reviewManualPayment,
  startAgencyManualCheckout,
} from '../billingFoundationService';
import { PAID_SALES_PAUSED_MESSAGE } from '../../../shared/paidIntakeCopy';

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
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('automatically pauses hosted sales at the renewed UTC deadline while preserving product access', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-24T09:00:00Z'));
    const hosted = {
      ...releaseEnvironment,
      PAID_MVP_SALES_PAUSED: 'false',
      PAID_MVP_SALES_OPEN_UNTIL: '2026-09-25T09:00:00Z',
    };
    expect(getCommercialActivationStatus(hosted).salesPaused).toBe(false);
    expect(() => requirePaidMvpSalesOpen('Invoice requests', hosted)).not.toThrow();

    vi.setSystemTime(new Date('2026-09-25T09:00:00Z'));
    expect(getCommercialActivationStatus(hosted).salesPaused).toBe(true);
    expect(() => requirePaidMvpSalesOpen('Invoice requests', hosted)).toThrow(/paused/);
    expect(isCommercialActivationAvailable(hosted, 'agency_launch_access')).toBe(true);
  });

  it('fails closed without a hosted sales window and rejects an overlong or invalid deadline', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-24T09:00:00Z'));
    const hosted = { ...releaseEnvironment, PAID_MVP_SALES_PAUSED: 'false' };
    expect(getCommercialActivationStatus(hosted).salesPaused).toBe(true);
    expect(() => requirePaidMvpSalesOpen('Invoice requests', hosted)).toThrow(/paused/);
    expect(() => resolveCommercialActivationConfiguration({
      ...hosted,
      PAID_MVP_SALES_OPEN_UNTIL: '2026-09-25T09:00:01Z',
    })).toThrow(/next weekday check/);
    expect(() => resolveCommercialActivationConfiguration({
      ...hosted,
      PAID_MVP_SALES_OPEN_UNTIL: '2026-09-31T09:00:00Z',
    })).toThrow(/valid UTC timestamp/);

    vi.setSystemTime(new Date('2026-09-25T09:00:00Z')); // Friday to Monday
    expect(() => resolveCommercialActivationConfiguration({
      ...hosted,
      PAID_MVP_SALES_OPEN_UNTIL: '2026-09-28T09:00:00Z',
    })).not.toThrow();
  });

  it('blocks new invoices while leaving the existing paid product active', () => {
    expect(isCommercialActivationAvailable(releaseEnvironment, 'agency_launch_access')).toBe(true);
    expect(getCommercialActivationStatus(releaseEnvironment)).toMatchObject({
      enabled: true,
      salesPaused: true,
      productAvailability: { agency_launch_access: true },
    });
    expect(() => requirePaidMvpSalesOpen('Invoice requests', releaseEnvironment)).toThrow(
      PAID_SALES_PAUSED_MESSAGE,
    );
    expect(() =>
      requirePaidMvpSalesOpen('Invoice requests', {
        ...releaseEnvironment,
        PAID_MVP_SALES_PAUSED: 'false',
        PAID_MVP_SALES_OPEN_UNTIL: new Date(Date.now() + 60_000).toISOString(),
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
      PAID_SALES_PAUSED_MESSAGE,
    );
    await expect(
      startAgencyManualCheckout({ user: {} as never, planId: 1, billingCycle: 'monthly' }),
    ).rejects.toThrow(PAID_SALES_PAUSED_MESSAGE);
    // D1: approving an already-issued invoice is no longer blocked by the pause.
    // It proceeds to the finance-admin check instead of the sales-paused refusal.
    await expect(
      reviewManualPayment({ actorUser: {} as never, paymentId: 1, decision: 'approve' }),
    ).rejects.toThrow(/Finance admin privileges required|Database not available/);
  });

  it('D1: settlement admission ignores a closed window or pause but keeps owner admission', () => {
    const env = {
      ...releaseEnvironment,
      PAID_MVP_SALES_PAUSED: 'true',
      PAID_MVP_ADMITTED_OWNERS: 'agent:11',
    };
    expect(() =>
      requirePaidMvpOwnerAdmission('Activation', { ownerType: 'agent', ownerId: 11 }, env),
    ).toThrow(PAID_SALES_PAUSED_MESSAGE);
    expect(() =>
      requirePaidMvpOwnerAdmissionForSettlement({ ownerType: 'agent', ownerId: 11 }, env),
    ).not.toThrow();
    expect(() =>
      requirePaidMvpOwnerAdmissionForSettlement({ ownerType: 'agent', ownerId: 12 }, env),
    ).toThrow();
    // New invoice requests still require sales to be open.
    expect(() => requirePaidMvpSalesOpen('Invoice requests', env)).toThrow(
      PAID_SALES_PAUSED_MESSAGE,
    );
  });
});
