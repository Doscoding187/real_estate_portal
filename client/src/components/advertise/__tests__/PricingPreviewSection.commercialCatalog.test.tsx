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

function launchProduct(input: {
  audience: 'agent' | 'agency' | 'developer';
  displayName: string;
  productKey: string;
  amountMinor: number;
  limit: Record<string, boolean | number>;
  benefits: string[];
  popular?: boolean;
}): CommercialProduct {
  return {
    productId: `plan:${input.productKey}`,
    productKey: input.productKey,
    productType: 'subscription',
    source: {
      authority: 'canonical_plans',
      planId: input.amountMinor,
      planKey: input.productKey,
    },
    name: input.productKey,
    displayName: input.displayName,
    description: `Paid 90-day ${input.audience} launch access.`,
    audience: input.audience,
    active: true,
    popular: input.popular ?? false,
    benefits: input.benefits,
    limits: input.limit,
    entitlements: input.limit,
    trial: { days: 0, available: false },
    term: {
      kind: 'paid_launch_access',
      durationDays: 90,
      requiresVerifiedPayment: true,
      autoRenews: false,
    },
    pricing: {
      mode: 'fixed',
      currency: 'ZAR',
      billingInterval: 'once',
      basePrice: { amountMinor: input.amountMinor, currency: 'ZAR' },
      monthly: null,
      annual: null,
      taxTreatment: 'not_configured',
      displayIncludesVat: null,
      priceSource: 'canonical_plans_and_billing_calculation',
      unavailableReason: null,
    },
    promotion: { status: 'not_configured', offer: null, reason: 'No offer configured.' },
    action: {
      mode: 'request_invoice',
      target: { kind: 'route', value: '/contact' },
      requiresAuthentication: false,
      reason: 'Paid launch access uses an assisted invoice path.',
    },
  };
}

const catalog = {
  authority: {
    products: 'canonical_plans',
    entitlements: 'plan_entitlements',
    prices: 'billingFoundationService',
    paidState: 'canonical_subscriptions_and_verified_billing',
  },
  audience: null,
  products: [
    launchProduct({
      audience: 'agent',
      displayName: 'Agent Launch Access',
      productKey: 'agent_launch_access',
      amountMinor: 49_900,
      limit: { max_active_listings: 50 },
      benefits: ['Agent listing management'],
    }),
    launchProduct({
      audience: 'agency',
      displayName: 'Agency Launch Access',
      productKey: 'agency_launch_access',
      amountMinor: 99_900,
      limit: { max_active_listings: 500 },
      benefits: ['Agency inventory management', 'Lead routing'],
      popular: true,
    }),
    launchProduct({
      audience: 'developer',
      displayName: 'Developer Launch Access',
      productKey: 'developer_launch_access',
      amountMinor: 149_900,
      limit: { unlimited_development_portfolio: true },
      benefits: [],
    }),
  ],
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

describe('PricingPreviewSection canonical Launch Access integration', () => {
  beforeEach(() => {
    setQueryState();
  });

  it('renders all three canonical products from the catalog', () => {
    render(<PricingPreviewSection />);

    expect(screen.getByText('Agent Launch Access')).toBeInTheDocument();
    expect(screen.getByText('Agency Launch Access')).toBeInTheDocument();
    expect(screen.getByText('Developer Launch Access')).toBeInTheDocument();

    const prices = screen.getAllByTestId('commercial-product-price').map(node => node.textContent);
    expect(prices.some(value => value?.includes('499'))).toBe(true);
    expect(prices.some(value => value?.includes('999'))).toBe(true);
    expect(prices.some(value => value?.includes('1,499'))).toBe(true);
    expect(screen.getAllByText('90 days')).toHaveLength(4); // banner plus one card per product
    expect(screen.getAllByRole('link', { name: 'Request Launch Access invoice' })).toHaveLength(3);
    expect(screen.getAllByText('Active Listings')).toHaveLength(2);
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('Included')).toBeInTheDocument();
  });

  it('does not expose stale pricing while the catalog is loading', () => {
    setQueryState({ data: undefined, isLoading: true });
    render(<PricingPreviewSection />);

    expect(screen.getByTestId('commercial-catalog-loading')).toBeInTheDocument();
    expect(screen.queryByText(/R\s?499/)).not.toBeInTheDocument();
    expect(screen.queryByText(/R\s?999/)).not.toBeInTheDocument();
  });

  it('fails safely without falling back to a hard-coded price', () => {
    setQueryState({ data: undefined, isError: true });
    render(<PricingPreviewSection />);

    expect(screen.getByTestId('commercial-catalog-error')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contact us' })).toHaveAttribute('href', '/contact');
    expect(screen.queryByText(/R\s?499/)).not.toBeInTheDocument();
  });

  it('does not invent a product when the catalog is empty', () => {
    setQueryState({ data: { ...catalog, products: [] } });
    render(<PricingPreviewSection />);

    expect(screen.getByTestId('commercial-catalog-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('commercial-product-price')).not.toBeInTheDocument();
  });
});
