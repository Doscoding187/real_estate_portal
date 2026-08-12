import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommercialProduct } from '@/hooks/useCommercialCatalog';
import AgencyProductLandingPage from './AgencyProductLandingPage';

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
  description: 'Paid 90-day Agency Launch Access.',
  audience: 'agency',
  active: true,
  popular: false,
  benefits: [
    'Agency inventory management',
    'Team and account management',
    'Lead and enquiry access',
    'Lead routing',
    'Agency reporting and analytics',
    'Commission and deal workflows',
  ],
  limits: { max_active_listings: 500 },
  entitlements: {
    max_active_listings: 500,
    has_commission_tracking: true,
    has_revenue_dashboard: true,
    has_team_dashboard: true,
    has_lead_routing: true,
  },
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

describe('public Agency product landing page', () => {
  it('leads with the Agency operating proposition before the commercial decision', () => {
    render(<AgencyProductLandingPage />);

    expect(
      screen.getByRole('heading', {
        name: 'Run more of your agency from one connected operating workspace.',
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('agency-workspace-preview')).toHaveLength(2);
    expect(screen.getByTestId('agency-operating-model')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Run the business behind the listings, not just the listings themselves.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Who owns this opportunity?')).toBeInTheDocument();
    expect(screen.getAllByText('Run the team').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Understand the business').length).toBeGreaterThan(0);
    expect(screen.getByTestId('agency-capability-support')).toBeInTheDocument();
    expect(screen.getByText('Supported Agency workspace')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Explore team tools/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Explore business visibility/i })).toBeInTheDocument();
    expect(screen.getAllByText('Visibility without micromanagement').length).toBeGreaterThan(0);
    expect(
      screen.queryByText(/recruitment|candidate pipeline|interview stage/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Give your Agency 90 days to operate the complete supported workspace.',
      }),
    ).toBeInTheDocument();
  });

  it('renders canonical Agency Launch Access truth and assisted actions', () => {
    render(<AgencyProductLandingPage />);

    expect(screen.getAllByText('Agency Launch Access').length).toBeGreaterThan(0);
    expect(screen.getAllByText('R999').length).toBeGreaterThan(0);
    expect(screen.getAllByText('90 days').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Active Listings: 500/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Request Launch Access invoice/i })).toHaveAttribute(
      'href',
      '/contact',
    );
    expect(
      screen.getAllByRole('link', { name: /Contact Property Listify/i }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/Coming Soon|waitlist|free trial|\/month/i)).not.toBeInTheDocument();
  });

  it('keeps catalog-unavailable Launch Access as an intentional assisted path', () => {
    useCatalogMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommercialCatalog>);

    render(<AgencyProductLandingPage />);

    expect(screen.getByTestId('agency-launch-access-card')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '90-day assisted access path' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Manual EFT activation')).toBeInTheDocument();
    expect(screen.getByText('No automatic renewal')).toBeInTheDocument();
    expect(screen.getByText(/canonical product details are unavailable/i)).toBeInTheDocument();
    expect(
      within(screen.getByTestId('agency-launch-access-card')).getByRole('link', {
        name: /Contact Property Listify/i,
      }),
    ).toHaveAttribute('href', '/contact');
    expect(screen.queryByText('R999')).not.toBeInTheDocument();
  });
});
