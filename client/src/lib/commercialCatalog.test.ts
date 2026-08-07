import { describe, expect, it } from 'vitest';
import type { CommercialProduct } from '@/hooks/useCommercialCatalog';
import {
  formatCommercialPrice,
  getCommercialActionPresentation,
  getCommercialPricePresentation,
} from './commercialCatalog';

function makeProduct(overrides: Partial<CommercialProduct> = {}) {
  return {
    productId: 'plan:1',
    productType: 'subscription',
    source: { authority: 'canonical_plans', planId: 1, planKey: 'agency_growth' },
    name: 'agency_growth',
    displayName: 'Agency Growth',
    description: 'A canonical agency plan.',
    audience: 'agency',
    active: true,
    popular: false,
    benefits: [],
    limits: {},
    entitlements: {},
    trial: { days: 0, available: false },
    pricing: {
      mode: 'fixed',
      currency: 'ZAR',
      billingInterval: 'monthly',
      basePrice: { amountMinor: 99_000, currency: 'ZAR' },
      monthly: { amountMinor: 99_000, currency: 'ZAR' },
      annual: null,
      taxTreatment: 'not_configured',
      displayIncludesVat: null,
      priceSource: 'canonical_plans_and_billing_calculation',
      unavailableReason: null,
    },
    promotion: {
      status: 'not_configured',
      offer: null,
      reason: 'No offer configured.',
    },
    action: {
      mode: 'manual_eft',
      target: { kind: 'procedure', value: 'billing.startManualEftCheckout' },
      requiresAuthentication: true,
      reason: 'Existing manual-EFT workflow.',
    },
    ...overrides,
  } as CommercialProduct;
}

describe('commercial catalog client formatting', () => {
  it('formats canonical minor-unit ZAR prices without changing the amount', () => {
    expect(formatCommercialPrice({ amountMinor: 99_000, currency: 'ZAR' })).toContain('990');
  });

  it('formats a fixed product with its authoritative billing interval', () => {
    expect(getCommercialPricePresentation(makeProduct())).toEqual({
      label: expect.stringContaining('990'),
      period: '/month',
      kind: 'fixed',
    });
  });

  it('does not fabricate a price for assisted or unavailable products', () => {
    expect(
      getCommercialPricePresentation(
        makeProduct({
          pricing: { ...makeProduct().pricing, mode: 'contact_sales', basePrice: null },
        }),
      ),
    ).toEqual({ label: 'Contact sales', period: null, kind: 'contact_sales' });

    expect(
      getCommercialPricePresentation(
        makeProduct({
          pricing: { ...makeProduct().pricing, mode: 'unavailable', basePrice: null },
        }),
      ),
    ).toEqual({ label: 'Pricing unavailable', period: null, kind: 'unavailable' });
  });

  it('maps canonical action modes to truthful public actions', () => {
    expect(getCommercialActionPresentation(makeProduct())).toEqual({
      label: 'Start agency onboarding',
      href: '/agency/onboarding',
      disabled: false,
    });

    expect(
      getCommercialActionPresentation(
        makeProduct({
          action: {
            mode: 'contact_sales',
            target: { kind: 'route', value: '/contact' },
            requiresAuthentication: false,
            reason: 'Assisted product.',
          },
        }),
      ),
    ).toEqual({ label: 'Contact sales', href: '/contact', disabled: false });
  });
});
