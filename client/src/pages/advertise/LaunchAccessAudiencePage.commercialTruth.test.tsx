import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommercialProduct } from '@/hooks/useCommercialCatalog';
import LaunchAccessAudiencePage from './LaunchAccessAudiencePage';

vi.mock('@/hooks/useCommercialCatalog', () => ({
  useCommercialCatalog: vi.fn(),
}));

vi.mock('@/components/EnhancedNavbar', () => ({
  EnhancedNavbar: () => <nav aria-label="Mock navigation" />,
}));

vi.mock('@/components/Footer', () => ({
  Footer: () => <footer>Mock footer</footer>,
}));

vi.mock('@/components/advertise/SEOHead', () => ({
  SEOHead: () => null,
}));

import { useCommercialCatalog } from '@/hooks/useCommercialCatalog';

const useCatalogMock = vi.mocked(useCommercialCatalog);

const agencyProduct = {
  productId: 'plan:agency_launch_access',
  productKey: 'agency_launch_access',
  productType: 'subscription',
  name: 'agency_launch_access',
  displayName: 'Agency Launch Access',
  description: 'Paid 90-day agency launch access.',
  audience: 'agency',
  active: true,
  popular: false,
  benefits: ['Agency inventory management', 'Lead routing'],
  limits: { max_active_listings: 500 },
  entitlements: { max_active_listings: 500 },
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
    basePrice: { amountMinor: 99_900, currency: 'ZAR' },
  },
  promotion: { status: 'not_configured', offer: null },
  action: {
    mode: 'request_invoice',
    target: { kind: 'route', value: '/contact' },
    requiresAuthentication: false,
  },
} as unknown as CommercialProduct;

beforeEach(() => {
  useCatalogMock.mockReturnValue({
    data: {
      authority: {
        products: 'canonical_plans',
        entitlements: 'plan_entitlements',
        prices: 'billingFoundationService',
        paidState: 'canonical_subscriptions_and_verified_billing',
      },
      audience: 'agency',
      products: [agencyProduct],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useCommercialCatalog>);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Launch Access audience gateway', () => {
  it('presents the catalog-driven Agency term and assisted invoice route', () => {
    render(<LaunchAccessAudiencePage audience="agency" />);

    expect(screen.getAllByText('Agency Launch Access').length).toBeGreaterThan(0);
    expect(screen.getByText('R999')).toBeInTheDocument();
    expect(screen.getAllByText('90 days').length).toBeGreaterThan(0);
    expect(screen.getByText('Active Listings: 500')).toBeInTheDocument();

    const invoiceLink = screen.getByRole('link', { name: /Request Launch Access invoice/i });
    expect(invoiceLink).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: 'Contact Property Listify' })).toHaveAttribute(
      'href',
      '/contact',
    );
    expect(screen.getByRole('link', { name: /Agency overview/ })).toHaveAttribute(
      'href',
      '/agency/overview',
    );
    expect(screen.queryByText(/Coming Soon|waitlist|free trial|monthly/i)).not.toBeInTheDocument();
  });
});
