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

import AgentProductLandingPage, { AgentCommercialLandingPage } from './AgentProductLandingPage';

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

const agentProduct = {
  productId: 'plan:agent_launch_access',
  productKey: 'agent_launch_access',
  productType: 'subscription',
  name: 'agent_launch_access',
  displayName: 'Agent Launch Access',
  description: 'Paid 90-day Agent Launch Access.',
  audience: 'agent',
  active: true,
  popular: false,
  benefits: [
    'Agent listing management',
    'Lead and enquiry access',
    'Agent profile and directory',
    'Agent analytics and reporting',
    'Commission and earnings tracking',
  ],
  limits: { max_active_listings: 50 },
  entitlements: {
    max_active_listings: 50,
    has_commission_tracking: true,
    has_revenue_dashboard: true,
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
    basePrice: { amountMinor: 49_900, currency: 'ZAR' },
  },
  promotion: { status: 'not_configured', offer: null },
  action: {
    mode: 'request_invoice',
    target: { kind: 'route', value: '/contact' },
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
      audience: 'agent',
      products: [agentProduct],
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

describe('public Agent product landing page', () => {
  it('shows the approved preparation path while normal runtime commercial activation is disabled', () => {
    render(<AgentProductLandingPage />);

    expect(
      screen.getByRole('heading', {
        name: 'Establish your Agent presence and prepare private inventory.',
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Preparation-only onboarding')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Commercial activation is not available yet. Complete your profile and prepare private drafts; publishing becomes available after approved commercial activation.',
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Prepare private listing drafts')).toHaveLength(1);
    expect(
      screen.getByText(
        'Publication and marketplace participation follow approved commercial activation.',
      ),
    ).toBeInTheDocument();

    const preparationLinks = screen.getAllByRole('link', { name: /Start Agent preparation/i });
    expect(preparationLinks).toHaveLength(2);
    preparationLinks.forEach(link => {
      expect(link).toHaveAttribute('href', '/login?mode=register&next=%2Fagent%2Fsetup&role=agent');
    });
    expect(screen.getByRole('link', { name: /See agent presences/i })).toHaveAttribute(
      'href',
      '/agents',
    );

    expect(useCatalogMock).not.toHaveBeenCalled();
  });

  it('does not advertise a paid offer, invoice request, or activation period while activation is disabled', () => {
    render(<AgentProductLandingPage />);

    expect(screen.queryByText('R499')).not.toBeInTheDocument();
    expect(screen.queryByText(/90 days/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Get Agent Launch Access/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Request an invoice/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/manual EFT/i)).not.toBeInTheDocument();
  });

  it('retains the catalog-driven commercial presentation for a separately enabled runtime', () => {
    render(<AgentCommercialLandingPage />);

    expect(screen.getAllByText('R499').length).toBeGreaterThan(0);
    expect(screen.getAllByText('90 days').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Active Listings: 50/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Get Agent Launch Access/i })).toHaveAttribute(
      'href',
      '/agent/select-package',
    );
    const accountStartLinks = screen.getAllByRole('link', { name: /Create your Agent account/i });
    expect(accountStartLinks).toHaveLength(2);
    accountStartLinks.forEach(link => {
      expect(link).toHaveAttribute(
        'href',
        '/login?mode=register&next=%2Fagent%2Fselect-package&role=agent',
      );
    });
  });

  it('uses the effective Agent product decision rather than another product availability', () => {
    commercialActivationMock.mockReturnValue({
      data: {
        enabled: true,
        productAvailability: {
          agent_launch_access: true,
          agency_launch_access: false,
          developer_launch_access: false,
        },
      },
      isError: false,
      refetch: vi.fn(),
    });

    render(<AgentProductLandingPage />);

    expect(screen.getByRole('link', { name: /Get Agent Launch Access/i })).toHaveAttribute(
      'href',
      '/agent/select-package',
    );
  });

  it('keeps the Agent landing in preparation when only another product is available', () => {
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

    render(<AgentProductLandingPage />);

    expect(screen.queryByTestId('agent-launch-access-unavailable-card')).not.toBeInTheDocument();
    expect(screen.getByText('Preparation-only onboarding')).toBeInTheDocument();
  });

  it('keeps account creation primary when the separately enabled commercial catalog is unavailable', () => {
    useCatalogMock.mockReturnValue({
      data: {
        authority: {
          products: 'canonical_plans',
          entitlements: 'plan_entitlements',
          prices: 'billingFoundationService',
          paidState: 'canonical_subscriptions_and_verified_billing',
        },
        audience: 'agent',
        products: [],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommercialCatalog>);

    render(<AgentCommercialLandingPage />);

    const unavailableCard = screen.getByTestId('agent-launch-access-unavailable-card');
    expect(
      within(unavailableCard).getByRole('link', { name: /Create your Agent account/i }),
    ).toHaveAttribute('href', '/login?mode=register&next=%2Fagent%2Fselect-package&role=agent');
    expect(
      within(unavailableCard).getByRole('link', { name: /Contact Property Listify/i }),
    ).toHaveAttribute('href', '/contact');
  });
});
