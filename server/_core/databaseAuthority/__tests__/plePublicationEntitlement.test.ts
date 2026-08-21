import { describe, expect, it } from 'vitest';
import {
  assertPleFixtureEntitlementRow,
  assertPleFixturePlanRow,
  assertPleFixtureSubscriptionRow,
  assertPlePublicationEntitlementTarget,
  classifyPleFixtureEntitlement,
  classifyPleFixturePlan,
  classifyPleFixtureSubscription,
  PLE_PUBLICATION_ENTITLEMENT_IDENTITIES,
  PLE_PUBLICATION_ENTITLEMENT_PLAN_NAME,
  PLE_PUBLICATION_ENTITLEMENT_TARGET,
} from '../dataAdapters/plePublicationEntitlement';

const EXPECTED_DATABASE = 'listify_wt_ple_acceptance_0123456789ab';
const actors = {
  ownerKind: 'agency' as const,
  agencyId: 990002,
  responsibleAgentId: 990002,
  administratorUserId: 990003,
};

const authority = (overrides: Record<string, unknown> = {}) =>
  ({
    context: {
      targetClass: 'disposable-worktree',
      host: PLE_PUBLICATION_ENTITLEMENT_TARGET.host,
      port: PLE_PUBLICATION_ENTITLEMENT_TARGET.port,
      databaseName: EXPECTED_DATABASE,
      worktree: {
        expectedDatabase: EXPECTED_DATABASE,
        ownershipMatches: true,
      },
      ...overrides,
    },
  }) as any;

const exactPlan = {
  id: 7001,
  name: PLE_PUBLICATION_ENTITLEMENT_PLAN_NAME,
  display_name: 'Listing Preview Agency Acceptance',
  segment: 'agency',
  is_active: 1,
  price: 0,
  price_monthly: 0,
  currency: 'ZAR',
  billing_interval: 'month',
  trial_days: 0,
  is_popular: 0,
  sort_order: 9999,
  metadata: {
    fixture: 'ple-publication-acceptance',
    environment: 'local-disposable',
    commercial: false,
  },
};

const exactSubscription = {
  id: 9001,
  owner_type: 'agency',
  owner_id: actors.agencyId,
  plan_id: exactPlan.id,
  status: 'active',
  current_period_start: '2099-01-01 00:00:00',
  current_period_end: '2099-02-01 00:00:00',
  cancel_at_period_end: 0,
  created_by: actors.administratorUserId,
  updated_by: actors.administratorUserId,
  metadata: {
    fixture: 'ple-publication-acceptance',
    environment: 'local-disposable',
    commercial: false,
  },
};

describe('PLE publication entitlement Database Authority adapter', () => {
  it.each([
    ['wrong host', { host: 'localhost' }],
    ['wrong port', { port: '3306' }],
    ['wrong database', { databaseName: 'listify_local' }],
    ['wrong classification', { targetClass: 'production' }],
    [
      'wrong ownership',
      {
        worktree: {
          expectedDatabase: EXPECTED_DATABASE,
          ownershipMatches: false,
        },
      },
    ],
  ])('rejects %s before any fixture operation', (_label, overrides) => {
    expect(() => assertPlePublicationEntitlementTarget(authority(overrides))).toThrow();
  });

  it('accepts any exact-owned localhost disposable PLE worktree target', () => {
    expect(() => assertPlePublicationEntitlementTarget(authority())).not.toThrow();
  });

  it('classifies an absent plan for creation and an exact plan for replay', () => {
    expect(classifyPleFixturePlan([])).toEqual({ state: 'created' });
    expect(classifyPleFixturePlan([exactPlan])).toEqual({ state: 'reused', planId: exactPlan.id });
  });

  it('fails closed for duplicate or conflicting plans', () => {
    expect(() => classifyPleFixturePlan([exactPlan, exactPlan])).toThrow('duplicate fixture plan');
    expect(() => assertPleFixturePlanRow({ ...exactPlan, segment: 'agent' })).toThrow(
      'plan segment',
    );
    expect(() => assertPleFixturePlanRow({ ...exactPlan, metadata: { fixture: 'other' } })).toThrow(
      'plan metadata',
    );
  });

  it('creates capacity two and permits only the recognized capacity-one fixture upgrade', () => {
    expect(classifyPleFixtureEntitlement([], exactPlan.id)).toEqual({ state: 'created' });
    expect(
      classifyPleFixtureEntitlement(
        [{ id: 1, plan_id: exactPlan.id, feature_key: 'max_active_listings', value_json: 1 }],
        exactPlan.id,
      ),
    ).toEqual({ state: 'upgraded' });
    expect(
      classifyPleFixtureEntitlement(
        [{ id: 1, plan_id: exactPlan.id, feature_key: 'max_active_listings', value_json: 2 }],
        exactPlan.id,
      ),
    ).toEqual({ state: 'reused' });
    expect(() =>
      classifyPleFixtureEntitlement(
        [{ id: 1, plan_id: exactPlan.id, feature_key: 'max_active_listings', value_json: 3 }],
        exactPlan.id,
      ),
    ).toThrow('max_active_listings entitlement');
  });

  it('creates only an absent agency subscription and reuses an exact future subscription', () => {
    expect(classifyPleFixtureSubscription([], exactPlan.id, actors)).toEqual({ state: 'created' });
    expect(classifyPleFixtureSubscription([exactSubscription], exactPlan.id, actors)).toEqual({
      state: 'reused',
    });
  });

  it('fails closed for a foreign, conflicting, or expired subscription', () => {
    expect(() =>
      assertPleFixtureSubscriptionRow(
        { ...exactSubscription, owner_id: 123456 },
        exactPlan.id,
        actors,
      ),
    ).toThrow('subscription ownerId');
    expect(() =>
      assertPleFixtureSubscriptionRow(
        { ...exactSubscription, plan_id: 7002 },
        exactPlan.id,
        actors,
      ),
    ).toThrow('subscription plan');
    expect(() =>
      assertPleFixtureSubscriptionRow(
        { ...exactSubscription, current_period_end: '2000-01-01 00:00:00' },
        exactPlan.id,
        actors,
      ),
    ).toThrow('period is not future-dated');
  });

  it('anchors entitlement to the canonical listing-preview publisher identities', () => {
    expect(PLE_PUBLICATION_ENTITLEMENT_IDENTITIES).toMatchObject({
      ownerKind: 'agency',
      agencySlug: 'listing-preview-agency-v1',
      responsibleAgentOpenId: 'listing-preview-agent-v1',
      administratorOpenId: 'listing-preview-agency-admin-v1',
    });
  });
});
