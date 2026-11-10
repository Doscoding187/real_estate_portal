import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  initializeCommercialActivationPolicy,
  isCommercialActivationAvailable,
  requirePaidMvpOwnerAdmission,
  requirePaidMvpOwnerAdmissionForSettlement,
  requirePaidMvpSalesOpen,
  resolveCommercialActivationConfiguration,
} from '../commercialActivationPolicy';

import { PAID_INTAKE_CLOSED_MESSAGE, PAID_SALES_PAUSED_MESSAGE } from '../../../shared/paidIntakeCopy';

const release = () => ({
  NODE_ENV: 'production',
  APP_ENV: 'production',
  PAID_MVP_ENABLED_PRODUCT_KEYS: 'agent_launch_access,agency_launch_access,developer_launch_access',
  PAID_MVP_RELEASE_ID: 'controlled-review',
  PAID_MVP_APPROVAL_REF: 'founder-review',
});

describe('open paid owner admission', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    initializeCommercialActivationPolicy();
  });

  it.each([
    ['agent', 11],
    ['agency', 22],
    ['developer', 33],
    ['agent', 987654],
  ])('admits an arbitrary %s owner with no allow-list and no sales window', (ownerType, ownerId) => {
    const env = release();
    expect(resolveCommercialActivationConfiguration(env).salesPaused).toBe(false);
    expect(() => requirePaidMvpSalesOpen('Invoice', env)).not.toThrow();
    expect(() =>
      requirePaidMvpOwnerAdmission('Invoice', { ownerType, ownerId }, env),
    ).not.toThrow();
    expect(() =>
      requirePaidMvpOwnerAdmissionForSettlement({ ownerType, ownerId }, env),
    ).not.toThrow();
  });

  it('ignores a legacy allow-list that excludes the owner and a past sales window', () => {
    const env = {
      ...release(),
      PAID_MVP_ADMITTED_OWNERS: 'agent:11',
      PAID_MVP_SALES_OPEN_UNTIL: '2020-01-01T00:00:00Z',
    };
    expect(() => resolveCommercialActivationConfiguration(env)).not.toThrow();
    expect(() =>
      requirePaidMvpOwnerAdmission('Invoice', { ownerType: 'agent', ownerId: 99 }, env),
    ).not.toThrow();
    expect(() =>
      requirePaidMvpOwnerAdmission('Invoice', { ownerType: 'agent', ownerId: 99 }, {
        ...env,
        PAID_MVP_ADMITTED_OWNERS: 'not-a-list',
        PAID_MVP_SALES_OPEN_UNTIL: 'garbage',
      }),
    ).not.toThrow();
    expect(isCommercialActivationAvailable(env, 'agent_launch_access')).toBe(true);
  });

  it('refuses new purchases with the paused message when sales are paused, but not settlement', () => {
    const env = { ...release(), PAID_MVP_SALES_PAUSED: 'true' };
    expect(() =>
      requirePaidMvpOwnerAdmission('Activation', { ownerType: 'agent', ownerId: 99 }, env),
    ).toThrow(PAID_SALES_PAUSED_MESSAGE);
    expect(() =>
      requirePaidMvpOwnerAdmissionForSettlement({ ownerType: 'agent', ownerId: 99 }, env),
    ).not.toThrow();
    expect(isCommercialActivationAvailable(env, 'agent_launch_access')).toBe(true);
  });

  it('still refuses in preparation-only mode', () => {
    const env = { NODE_ENV: 'production', APP_ENV: 'production' };
    expect(() =>
      requirePaidMvpOwnerAdmission('Invoice', { ownerType: 'agent', ownerId: 11 }, env),
    ).toThrow(PAID_INTAKE_CLOSED_MESSAGE);
    expect(() =>
      requirePaidMvpOwnerAdmissionForSettlement({ ownerType: 'agent', ownerId: 11 }, env),
    ).toThrow(PAID_INTAKE_CLOSED_MESSAGE);
  });

  it('keeps the exact three product keys rule in production', () => {
    expect(() =>
      resolveCommercialActivationConfiguration({
        ...release(),
        PAID_MVP_ENABLED_PRODUCT_KEYS: 'agent_launch_access',
      }),
    ).toThrow(/exactly the three approved/);
  });
});
