import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  initializeCommercialActivationPolicy,
  isCommercialActivationAvailable,
  requirePaidMvpOwnerAdmission,
  resolveCommercialActivationConfiguration,
} from '../commercialActivationPolicy';

const release = () => ({
  NODE_ENV: 'production',
  APP_ENV: 'production',
  PAID_MVP_ENABLED_PRODUCT_KEYS: 'agent_launch_access,agency_launch_access,developer_launch_access',
  PAID_MVP_RELEASE_ID: 'controlled-review',
  PAID_MVP_APPROVAL_REF: 'founder-review',
  PAID_MVP_SALES_PAUSED: 'false',
  PAID_MVP_SALES_OPEN_UNTIL: new Date(Date.now() + 60_000).toISOString(),
  PAID_MVP_ADMITTED_OWNERS: 'agent:11,agency:22,developer:33',
});

describe('controlled paid owner admission', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    initializeCommercialActivationPolicy();
  });
  it.each([
    ['agent', 11],
    ['agency', 22],
    ['developer', 33],
  ])('admits only the exact %s owner pair', (ownerType, ownerId) => {
    expect(() =>
      requirePaidMvpOwnerAdmission('Invoice', { ownerType, ownerId }, release()),
    ).not.toThrow();
    expect(() =>
      requirePaidMvpOwnerAdmission('Invoice', { ownerType, ownerId: ownerId + 1 }, release()),
    ).toThrow(/controlled release intake/);
    expect(() =>
      requirePaidMvpOwnerAdmission(
        'Invoice',
        { ownerType: ownerType === 'agent' ? 'agency' : 'agent', ownerId },
        release(),
      ),
    ).toThrow(/controlled release intake/);
  });
  it.each([
    undefined,
    '',
    '*',
    'agent:*',
    'agent:0',
    'agent:-1',
    'agent:01',
    'agent:1.0',
    'agent:1e2',
    'agent:9007199254740992',
    'user:11',
    'Agent:11',
    'agent:11,',
    'agent:11,agent:11',
    'agent:11,invalid:22',
    'agent:11:22',
  ])('denies the entire missing/invalid configuration %s without disabling paid reads', value => {
    const env = { ...release(), PAID_MVP_ADMITTED_OWNERS: value };
    expect(() =>
      requirePaidMvpOwnerAdmission('Invoice', { ownerType: 'agent', ownerId: 11 }, env),
    ).toThrow(/controlled release intake/);
    expect(isCommercialActivationAvailable(env, 'agent_launch_access')).toBe(true);
  });
  it('preserves the absolute pause and window expiry for an admitted owner', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-30T09:00:00Z'));
    const env = release();
    expect(() =>
      requirePaidMvpOwnerAdmission(
        'Activation',
        { ownerType: 'agent', ownerId: 11 },
        { ...env, PAID_MVP_SALES_PAUSED: 'true' },
      ),
    ).toThrow(/paused/);
    vi.advanceTimersByTime(60_000);
    expect(() =>
      requirePaidMvpOwnerAdmission('Activation', { ownerType: 'agent', ownerId: 11 }, env),
    ).toThrow(/paused/);
    expect(isCommercialActivationAvailable(env, 'agent_launch_access')).toBe(true);
  });
  it('cannot use fixture selectors to admit an unlisted production owner', () => {
    const env = {
      ...release(),
      VITEST: 'true',
      PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_FIXTURE: 'true',
      PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_PRODUCT_KEYS: 'agent_launch_access',
      DATABASE_AUTHORITY_PARENT_FINGERPRINT: 'fixture',
      DATABASE_AUTHORITY_CORRELATION_ID: 'fixture',
    };
    expect(resolveCommercialActivationConfiguration(env).mode).toBe('paid_mvp_release');
    expect(() =>
      requirePaidMvpOwnerAdmission('Invoice', { ownerType: 'agent', ownerId: 99 }, env),
    ).toThrow(/controlled release intake/);
  });
  it('uses the reviewed startup snapshot until reinitialization', () => {
    for (const [key, value] of Object.entries(release())) vi.stubEnv(key, value);
    initializeCommercialActivationPolicy();
    vi.stubEnv('PAID_MVP_ADMITTED_OWNERS', 'agent:99');
    expect(() =>
      requirePaidMvpOwnerAdmission('Invoice', { ownerType: 'agent', ownerId: 99 }),
    ).toThrow(/controlled release intake/);
    expect(() =>
      requirePaidMvpOwnerAdmission('Invoice', { ownerType: 'agent', ownerId: 11 }),
    ).not.toThrow();
    initializeCommercialActivationPolicy();
    expect(() =>
      requirePaidMvpOwnerAdmission('Invoice', { ownerType: 'agent', ownerId: 99 }),
    ).not.toThrow();
  });
});
