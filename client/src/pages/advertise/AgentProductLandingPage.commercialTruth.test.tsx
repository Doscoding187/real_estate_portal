import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommercialProduct } from '@/hooks/useCommercialCatalog';
import AgentProductLandingPage from './AgentProductLandingPage';

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
  ],
  limits: { max_active_listings: 50 },
  entitlements: {
    max_active_listings: 50,
    has_commission_tracking: false,
    has_revenue_dashboard: false,
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
  it('leads with the Agent product story before the canonical commercial decision', () => {
    render(<AgentProductLandingPage />);

    expect(
      screen.getByRole('heading', {
        name: 'Run your listings, enquiries and follow-ups from one place.',
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('agent-workspace-preview')).toHaveLength(2);
    expect(
      screen.getByRole('heading', {
        name: 'There is more work behind every listing than publishing it.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Keep interest connected')).toBeInTheDocument();
    expect(screen.getByText('Keep follow-up visible')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Experience the complete supported Agent workspace.' }),
    ).toBeInTheDocument();
  });

  it('renders canonical Agent Launch Access truth and assisted actions', () => {
    render(<AgentProductLandingPage />);

    expect(screen.getAllByText('R499').length).toBeGreaterThan(0);
    expect(screen.getAllByText('90 days').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Active Listings: 50/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Get Agent Launch Access/i })).toHaveAttribute(
      'href',
      '/agent/select-package',
    );
    expect(screen.getByRole('link', { name: /See agent presences/i })).toHaveAttribute(
      'href',
      '/agents',
    );
    expect(
      screen.getAllByRole('link', { name: /Contact Property Listify/i }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/free trial|\/month/i)).not.toBeInTheDocument();
  });
});
