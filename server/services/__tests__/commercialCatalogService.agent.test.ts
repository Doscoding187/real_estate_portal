import { describe, expect, it } from 'vitest';
import { buildCommercialProduct } from '../commercialCatalogService';

function agentPlan(overrides: Record<string, unknown> = {}) {
  return {
    id: 101,
    name: 'agent_starter',
    displayName: 'Agent Starter',
    description: 'Canonical agent product.',
    segment: 'agent',
    price: 99_000,
    priceMonthly: 99_000,
    currency: 'ZAR',
    interval: 'month',
    trialDays: 14,
    metadata: null,
    features: JSON.stringify(['Agent profile']),
    limits: null,
    isActive: 1,
    isPopular: 0,
    sortOrder: 1,
    ...overrides,
  } as any;
}

describe('canonical commercial catalog agent products', () => {
  it('uses the canonical plan trial period and exposes a truthful trial action', () => {
    const product = buildCommercialProduct(agentPlan(), {
      max_active_listings: 20,
    });

    expect(product.source).toMatchObject({ authority: 'canonical_plans', planId: 101 });
    expect(product.pricing.basePrice).toEqual({ amountMinor: 99_000, currency: 'ZAR' });
    expect(product.trial).toEqual({ days: 14, available: true });
    expect(product.action).toMatchObject({ mode: 'trial', target: { value: '/role-selection' } });
    expect(product.promotion.offer).toBeNull();
  });

  it('does not expose a trial action when the canonical plan has no trial', () => {
    const product = buildCommercialProduct(agentPlan({ trialDays: 0 }), {});

    expect(product.trial).toEqual({ days: 0, available: false });
    expect(product.action.mode).toBe('contact_sales');
  });
});
