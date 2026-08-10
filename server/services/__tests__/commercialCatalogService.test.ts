import { describe, expect, it } from 'vitest';
import {
  buildCommercialProduct,
  filterCommercialPlans,
  isPublicCommercialPlan,
} from '../commercialCatalogService';

type PlanRow = Parameters<typeof buildCommercialProduct>[0];

function plan(overrides: Partial<PlanRow> = {}): PlanRow {
  return {
    id: 41,
    name: 'agency_growth',
    displayName: 'Agency Growth',
    description: 'Canonical agency plan',
    segment: 'agency',
    price: 99_000,
    priceMonthly: 99_000,
    currency: 'ZAR',
    interval: 'month',
    trialDays: 0,
    metadata: null,
    stripePriceId: null,
    features: JSON.stringify(['Agency workspace', 'Lead routing']),
    limits: JSON.stringify({ max_active_listings: 50 }),
    isActive: 1,
    isPopular: 1,
    sortOrder: 10,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  } as PlanRow;
}

describe('commercial catalog projection', () => {
  it('projects canonical agency pricing and entitlements without owning checkout', () => {
    const product = buildCommercialProduct(plan(), {
      max_active_listings: 50,
      has_priority_exposure: true,
    });

    expect(product.source).toEqual({
      authority: 'canonical_plans',
      planId: 41,
      planKey: 'agency_growth',
    });
    expect(product.productId).toBe('plan:41');
    expect(product.pricing).toMatchObject({
      mode: 'fixed',
      currency: 'ZAR',
      billingInterval: 'monthly',
      basePrice: { amountMinor: 99_000, currency: 'ZAR' },
      monthly: { amountMinor: 99_000, currency: 'ZAR' },
      annual: { amountMinor: 1_188_000, currency: 'ZAR' },
      priceSource: 'canonical_plans_and_billing_calculation',
    });
    expect(product.benefits).toEqual(['Agency workspace', 'Lead routing']);
    expect(product.limits).toEqual({ max_active_listings: 50 });
    expect(product.entitlements.has_priority_exposure).toBe(true);
    expect(product.action).toMatchObject({
      mode: 'manual_eft',
      target: { kind: 'procedure', value: 'billing.startManualEftCheckout' },
      requiresAuthentication: true,
    });
    expect(product.promotion).toMatchObject({ status: 'not_configured', offer: null });
  });

  it('does not publish an unbounded early-access override as a public offer', () => {
    const product = buildCommercialProduct(
      plan({ metadata: { early_access_price_monthly: 49_900 } }),
      { max_active_listings: 50 },
    );

    expect(product.pricing.mode).toBe('unavailable');
    expect(product.pricing.monthly).toBeNull();
    expect(product.promotion.status).toBe('unavailable');
    expect(product.promotion.offer).toBeNull();
    expect(product.action.mode).toBe('unavailable');
  });

  it('honestly projects unsupported paid audiences as assisted contact actions', () => {
    const product = buildCommercialProduct(
      plan({
        id: 42,
        name: 'developer_growth',
        displayName: 'Developer Growth',
        segment: 'developer',
        metadata: null,
      }),
      { max_developments: 5 },
    );

    expect(product.pricing.mode).toBe('fixed');
    expect(product.action).toMatchObject({
      mode: 'contact_sales',
      target: { kind: 'route', value: '/contact' },
      requiresAuthentication: false,
    });
  });

  it('projects paid Developer Launch Access without a free-trial or zero-price claim', () => {
    const product = buildCommercialProduct(
      plan({
        id: 43,
        name: 'developer_launch_access',
        displayName: 'Developer Launch Access',
        description: 'Paid 90-day launch access',
        segment: 'developer',
        price: 149_900,
        priceMonthly: 0,
        trialDays: 0,
        metadata: {
          commercial_product_key: 'developer_launch_access',
          commercial_term_kind: 'paid_launch_access',
          commercial_term_duration_days: 90,
          commercial_requires_verified_payment: true,
          commercial_auto_renews: false,
          commercial_pricing_mode: 'fixed',
          commercial_action_mode: 'request_invoice',
          commercial_price_configured: true,
          commercial_launch_fee_minor: 149_900,
          commercial_billing_interval: 'once_off',
          catalogVisibility: 'public',
        },
      }),
      { unlimited_development_portfolio: true },
    );

    expect(product.productKey).toBe('developer_launch_access');
    expect(product.term).toEqual({
      kind: 'paid_launch_access',
      durationDays: 90,
      requiresVerifiedPayment: true,
      autoRenews: false,
    });
    expect(product.trial).toEqual({ days: 0, available: false });
    expect(product.limits).toEqual({ unlimited_development_portfolio: true });
    expect(product.pricing).toMatchObject({
      mode: 'fixed',
      billingInterval: 'once',
      basePrice: { amountMinor: 149_900, currency: 'ZAR' },
      monthly: null,
      annual: null,
    });
    expect(product.action).toMatchObject({
      mode: 'request_invoice',
      target: { kind: 'route', value: '/contact' },
    });
    expect(product.promotion).toMatchObject({ status: 'not_configured', offer: null });
  });

  it('excludes inactive and explicitly local/internal plans from a public catalog', () => {
    expect(isPublicCommercialPlan(plan({ isActive: 0 }))).toBe(false);
    expect(isPublicCommercialPlan(plan({ metadata: { localOnly: true } }))).toBe(false);
    expect(isPublicCommercialPlan(plan({ metadata: { internalOnly: true } }))).toBe(false);
    expect(isPublicCommercialPlan(plan({ metadata: { catalogVisibility: 'private' } }))).toBe(
      false,
    );
    expect(isPublicCommercialPlan(plan({ metadata: { isPublic: false } }))).toBe(false);
    expect(isPublicCommercialPlan(plan({ metadata: { isPublic: true } }))).toBe(true);
  });

  it('filters products by the requested canonical audience', () => {
    const developerPlan = plan({ id: 42, segment: 'developer', name: 'developer_growth' });
    const inactivePlan = plan({ id: 43, isActive: 0 });

    expect(filterCommercialPlans([plan(), developerPlan, inactivePlan], 'agency')).toEqual([
      plan(),
    ]);
    expect(filterCommercialPlans([plan(), developerPlan, inactivePlan], 'developer')).toEqual([
      developerPlan,
    ]);
    expect(filterCommercialPlans([plan(), developerPlan, inactivePlan])).toEqual([
      plan(),
      developerPlan,
    ]);
  });

  it('does not publish retired free-trial products for launch audiences', () => {
    const agentTrial = plan({
      id: 44,
      name: 'agent_trial',
      displayName: 'Agent Trial',
      segment: 'agent',
      trialDays: 14,
    });

    expect(filterCommercialPlans([agentTrial], 'agent')).toEqual([]);
    expect(filterCommercialPlans([agentTrial])).toEqual([]);
  });
});
