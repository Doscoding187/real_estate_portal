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
    target: { kind: 'route', value: '/agency/setup' },
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
    expect(screen.getByTestId('agency-value-hierarchy')).toBeInTheDocument();
    expect(screen.getByText('Operate the Agency')).toBeInTheDocument();
    expect(
      screen.getByText('Put eligible inventory into the Property Listify marketplace'),
    ).toBeInTheDocument();
    expect(screen.getByText('Connect to more ways the market is discovered')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Your Agency operates the work. Eligible inventory joins the Property Listify marketplace.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Platform discovery, not outsourced Agency marketing.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Is Property Listify doing our digital marketing for us?'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not a bespoke social-media, advertising or campaign-management service/i),
    ).toBeInTheDocument();
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
      '/agency/setup',
    );
    expect(
      screen.getAllByRole('link', { name: /Contact Property Listify/i }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/Coming Soon|waitlist|free trial|\/month/i)).not.toBeInTheDocument();
  });

  it('derives commercial copy and capacity from the catalog rather than hardcoded offer values', () => {
    const changedProduct = {
      ...agencyProduct,
      limits: { max_active_listings: 275 },
      entitlements: { ...agencyProduct.entitlements, max_active_listings: 275 },
      term: { ...agencyProduct.term, durationDays: 45 },
      pricing: {
        ...agencyProduct.pricing,
        basePrice: { amountMinor: 124_900, currency: 'ZAR' },
      },
    } as unknown as CommercialProduct;

    useCatalogMock.mockReturnValue({
      data: {
        authority: {
          products: 'canonical_plans',
          entitlements: 'plan_entitlements',
          prices: 'billingFoundationService',
          paidState: 'canonical_subscriptions_and_verified_billing',
        },
        audience: 'agency',
        products: [changedProduct],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommercialCatalog>);

    render(<AgencyProductLandingPage />);

    expect(screen.getAllByText('R1,249').length).toBeGreaterThan(0);
    expect(screen.getAllByText('45 days').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Active Listings: 275/i).length).toBeGreaterThan(0);
    expect(screen.getByText('What does R1,249 include?')).toBeInTheDocument();
    expect(screen.getByText('Up to 275 active published listings')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Give your Agency 45 days to operate the complete supported workspace.',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('R999')).not.toBeInTheDocument();
    expect(screen.queryByText('90 days')).not.toBeInTheDocument();
  });

  it('starts the Agency journey with a dedicated owner account and preserves setup intent', () => {
    render(<AgencyProductLandingPage />);

    const accountLinks = screen.getAllByRole('link', {
      name: /Create your Agency owner account/i,
    });
    expect(accountLinks).toHaveLength(2);
    for (const link of accountLinks) {
      expect(link).toHaveAttribute(
        'href',
        '/login?mode=register&next=%2Fagency%2Fsetup&role=agency_admin',
      );
    }
    expect(screen.getAllByText(/not a reduced feature tier/i).length).toBeGreaterThan(0);
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
    expect(screen.getByRole('heading', { name: 'Assisted access path' })).toBeInTheDocument();
    expect(screen.getByText('Assisted commercial confirmation')).toBeInTheDocument();
    expect(screen.getByText('Finance-verified activation')).toBeInTheDocument();
    expect(screen.getByText('No instant checkout')).toBeInTheDocument();
    expect(screen.getByText(/canonical product details are unavailable/i)).toBeInTheDocument();
    expect(
      within(screen.getByTestId('agency-launch-access-card')).getByRole('link', {
        name: /Contact Property Listify/i,
      }),
    ).toHaveAttribute('href', '/contact');
    expect(screen.queryByText('R999')).not.toBeInTheDocument();
    expect(screen.queryByText('90 days')).not.toBeInTheDocument();
  });
});
