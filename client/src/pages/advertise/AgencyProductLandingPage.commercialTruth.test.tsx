import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommercialProduct } from '@/hooks/useCommercialCatalog';
const { commercialActivationMock } = vi.hoisted(() => ({
  commercialActivationMock: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    billing: {
      commercialActivation: {
        useQuery: (...args: unknown[]) => commercialActivationMock(...args),
      },
    },
  },
}));

import AgencyProductLandingPage, { AgencyCommercialLandingPage } from './AgencyProductLandingPage';

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
  commercialActivationMock.mockReturnValue({
    data: {
      enabled: false,
      productAvailability: {
        agent_launch_access: false,
        agency_launch_access: false,
        developer_launch_access: false,
      },
    },
    isError: false,
    refetch: vi.fn(),
  });
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
  it('shows the approved preparation path while normal runtime commercial activation is disabled', () => {
    render(<AgencyProductLandingPage />);

    expect(
      screen.getByRole('heading', {
        name: 'Establish your Agency workspace and prepare private inventory.',
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Preparation-only onboarding')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Commercial activation is not available yet. Complete your profile and prepare private drafts; publishing becomes available after approved commercial activation.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Publishing, marketplace participation and team activation follow approval and commercial activation.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Prepare private inventory')).toBeInTheDocument();

    const preparationLinks = screen.getAllByRole('link', { name: /Start Agency preparation/i });
    expect(preparationLinks).toHaveLength(2);
    preparationLinks.forEach(link => {
      expect(link).toHaveAttribute(
        'href',
        '/login?mode=register&next=%2Fagency%2Fsetup&role=agency_admin',
      );
    });

    expect(useCatalogMock).not.toHaveBeenCalled();
  });

  it('does not advertise a paid offer, invoice request, or activation period while activation is disabled', () => {
    render(<AgencyProductLandingPage />);

    expect(screen.queryByText('R999')).not.toBeInTheDocument();
    expect(screen.queryByText(/90 days/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Request Launch Access invoice/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/manual EFT/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Contact Property Listify/i }),
    ).not.toBeInTheDocument();
  });

  it('uses the exact Agency product decision instead of another paid product', () => {
    commercialActivationMock.mockReturnValue({
      data: {
        enabled: true,
        productAvailability: {
          agent_launch_access: true,
          agency_launch_access: false,
          developer_launch_access: true,
        },
      },
      isError: false,
      refetch: vi.fn(),
    });

    render(<AgencyProductLandingPage />);

    expect(screen.getByText('Preparation-only onboarding')).toBeInTheDocument();
    expect(screen.queryByText('R999')).not.toBeInTheDocument();
    expect(useCatalogMock).not.toHaveBeenCalled();
  });

  it('shows the commercial Agency path only when the exact Agency product is available', () => {
    commercialActivationMock.mockReturnValue({
      data: {
        enabled: true,
        productAvailability: {
          agent_launch_access: false,
          agency_launch_access: true,
          developer_launch_access: false,
        },
      },
      isError: false,
      refetch: vi.fn(),
    });

    render(<AgencyProductLandingPage />);

    expect(screen.getAllByText('R999').length).toBeGreaterThan(0);
    expect(useCatalogMock).toHaveBeenCalled();
  });

  it('fails closed when availability cannot be read', () => {
    commercialActivationMock.mockReturnValue({
      data: undefined,
      isError: true,
      refetch: vi.fn(),
    });

    render(<AgencyProductLandingPage />);

    expect(screen.getByText('Preparation-only onboarding')).toBeInTheDocument();
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText('R999')).not.toBeInTheDocument();
  });

  it('retains the catalog-driven commercial presentation for a separately enabled runtime', () => {
    render(<AgencyCommercialLandingPage />);

    expect(screen.getAllByText('Agency Launch Access').length).toBeGreaterThan(0);
    expect(screen.getAllByText('R999').length).toBeGreaterThan(0);
    expect(screen.getAllByText('90 days').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Active Listings: 500/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Request Launch Access invoice/i })).toHaveAttribute(
      'href',
      '/agency/setup',
    );
  });

  it('derives enabled-runtime commercial copy and capacity from the catalog rather than hardcoded offer values', () => {
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

    render(<AgencyCommercialLandingPage />);

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

  it('retains the enabled-runtime owner account start and commercial proposition', () => {
    render(<AgencyCommercialLandingPage />);

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

  it('keeps catalog-unavailable Launch Access as an intentional assisted path when separately enabled', () => {
    useCatalogMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommercialCatalog>);

    render(<AgencyCommercialLandingPage />);

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
