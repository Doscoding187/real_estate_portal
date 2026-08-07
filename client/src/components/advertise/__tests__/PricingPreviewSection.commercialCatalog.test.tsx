import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CommercialCatalog,
  CommercialProduct,
  useCommercialCatalog,
} from '@/hooks/useCommercialCatalog';
import { PricingPreviewSection } from '../PricingPreviewSection';

vi.mock('@/hooks/useCommercialCatalog', () => ({
  useCommercialCatalog: vi.fn(),
}));

import { useCommercialCatalog as useCommercialCatalogMocked } from '@/hooks/useCommercialCatalog';

const useCatalogMock = vi.mocked(useCommercialCatalogMocked);

const agencyProduct = {
  productId: 'plan:1',
  productType: 'subscription',
  source: { authority: 'canonical_plans', planId: 1, planKey: 'agency_growth' },
  name: 'agency_growth',
  displayName: 'Agency Growth',
  description: 'A canonical agency plan.',
  audience: 'agency',
  active: true,
  popular: true,
  benefits: ['Canonical listing publication access'],
  limits: { max_active_listings: 25 },
  entitlements: { max_active_listings: 25 },
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
} as CommercialProduct;

const catalog = {
  authority: {
    products: 'canonical_plans',
    entitlements: 'plan_entitlements',
    prices: 'billingFoundationService',
    paidState: 'canonical_subscriptions_and_verified_billing',
  },
  audience: null,
  products: [agencyProduct],
} as CommercialCatalog;

function setQueryState(state: Partial<ReturnType<typeof useCommercialCatalogMocked>> = {}) {
  useCatalogMock.mockReturnValue({
    data: catalog,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...state,
  } as unknown as ReturnType<typeof useCommercialCatalog>);
}

afterEach(() => {
  cleanup();
});

describe('PricingPreviewSection canonical catalog integration', () => {
  beforeEach(() => {
    setQueryState();
  });

  it('renders the canonical price, benefits, limits, and assisted CTA', () => {
    render(<PricingPreviewSection />);

    expect(screen.getByText('Agency Growth')).toBeInTheDocument();
    expect(screen.getByTestId('commercial-product-price').textContent).toContain('990');
    expect(screen.getByText('Canonical listing publication access')).toBeInTheDocument();
    expect(screen.getByText('Active Listings')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start agency onboarding' })).toHaveAttribute(
      'href',
      '/agency/onboarding',
    );
    expect(screen.queryByText('Priority Algorithm Placement')).not.toBeInTheDocument();
    expect(screen.queryByText('R999')).not.toBeInTheDocument();
    expect(screen.queryByText('R2,499')).not.toBeInTheDocument();
  });

  it('does not expose a stale price while the catalog is loading', () => {
    setQueryState({ data: undefined, isLoading: true });
    render(<PricingPreviewSection />);

    expect(screen.getByTestId('commercial-catalog-loading')).toBeInTheDocument();
    expect(screen.queryByText('R999')).not.toBeInTheDocument();
    expect(screen.queryByText('R2,499')).not.toBeInTheDocument();
  });

  it('fails safely without falling back to the old price', () => {
    setQueryState({ data: undefined, isError: true });
    render(<PricingPreviewSection />);

    expect(screen.getByTestId('commercial-catalog-error')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contact us' })).toHaveAttribute('href', '/contact');
    expect(screen.queryByText('R999')).not.toBeInTheDocument();
    expect(screen.queryByText('R2,499')).not.toBeInTheDocument();
  });

  it('does not invent a product or price when the catalog is empty', () => {
    setQueryState({ data: { ...catalog, products: [] } });
    render(<PricingPreviewSection />);

    expect(screen.getByTestId('commercial-catalog-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('commercial-product-price')).not.toBeInTheDocument();
    expect(screen.queryByText('R999')).not.toBeInTheDocument();
  });
});
