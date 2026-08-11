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

const authority = (overrides: Record<string, unknown> = {}) =>
  ({
    context: {
      targetClass: 'disposable-worktree',
      host: PLE_PUBLICATION_ENTITLEMENT_TARGET.host,
      port: PLE_PUBLICATION_ENTITLEMENT_TARGET.port,
      databaseName: PLE_PUBLICATION_ENTITLEMENT_TARGET.databaseName,
      worktree: {
        expectedDatabase: PLE_PUBLICATION_ENTITLEMENT_TARGET.databaseName,
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
  owner_id: PLE_PUBLICATION_ENTITLEMENT_IDENTITIES.agencyId,
  plan_id: exactPlan.id,
  status: 'active',
  current_period_start: '2099-01-01 00:00:00',
  current_period_end: '2099-02-01 00:00:00',
  cancel_at_period_end: 0,
  created_by: PLE_PUBLICATION_ENTITLEMENT_IDENTITIES.administratorUserId,
  updated_by: PLE_PUBLICATION_ENTITLEMENT_IDENTITIES.administratorUserId,
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
          expectedDatabase: PLE_PUBLICATION_ENTITLEMENT_TARGET.databaseName,
          ownershipMatches: false,
        },
      },
    ],
  ])('rejects %s before any fixture operation', (_label, overrides) => {
    expect(() => assertPlePublicationEntitlementTarget(authority(overrides))).toThrow();
  });

  it('accepts only the exact disposable PLE target', () => {
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

  it('classifies the max_active_listings entitlement without silently changing conflicts', () => {
    expect(classifyPleFixtureEntitlement([], exactPlan.id)).toEqual({ state: 'created' });
    expect(
      classifyPleFixtureEntitlement(
        [{ id: 1, plan_id: exactPlan.id, feature_key: 'max_active_listings', value_json: 1 }],
        exactPlan.id,
      ),
    ).toEqual({ state: 'reused' });
    expect(() =>
      assertPleFixtureEntitlementRow(
        { id: 1, plan_id: exactPlan.id, feature_key: 'max_active_listings', value_json: 2 },
        exactPlan.id,
      ),
    ).toThrow('max_active_listings entitlement');
  });

  it('creates only an absent agency subscription and reuses an exact future subscription', () => {
    expect(classifyPleFixtureSubscription([], exactPlan.id)).toEqual({ state: 'created' });
    expect(classifyPleFixtureSubscription([exactSubscription], exactPlan.id)).toEqual({
      state: 'reused',
    });
  });

  it('fails closed for a foreign, conflicting, or expired subscription', () => {
    expect(() =>
      assertPleFixtureSubscriptionRow({ ...exactSubscription, owner_id: 123456 }, exactPlan.id),
    ).toThrow('subscription ownerId');
    expect(() =>
      assertPleFixtureSubscriptionRow({ ...exactSubscription, plan_id: 7002 }, exactPlan.id),
    ).toThrow('subscription plan');
    expect(() =>
      assertPleFixtureSubscriptionRow(
        { ...exactSubscription, current_period_end: '2000-01-01 00:00:00' },
        exactPlan.id,
      ),
    ).toThrow('period is not future-dated');
  });

  it('requires the authorized fixture identity to remain agency 990002', () => {
    expect(PLE_PUBLICATION_ENTITLEMENT_IDENTITIES).toMatchObject({
      listingId: 1,
      ownerKind: 'agency',
      agencyId: 990002,
      responsibleAgentId: 990002,
      administratorUserId: 990003,
    });
  });
});
