import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommercialProduct } from '@/hooks/useCommercialCatalog';
import DeveloperProductLandingPage, {
  DeveloperCommercialLandingPage,
} from './DeveloperProductLandingPage';

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

const developerProduct = {
  productId: 'plan:developer_launch_access',
  productKey: 'developer_launch_access',
  productType: 'subscription',
  name: 'developer_launch_access',
  displayName: 'Developer Launch Access',
  description: 'Paid 90-day Developer Launch Access.',
  audience: 'developer',
  active: true,
  popular: false,
  benefits: [
    'Development portfolio organisation',
    'Structured development inventory',
    'Project-linked enquiries',
    'Developer readiness visibility',
  ],
  limits: { max_active_listings: 0, unlimited_development_portfolio: true },
  entitlements: { unlimited_development_portfolio: true },
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
    basePrice: { amountMinor: 149_900, currency: 'ZAR' },
  },
  promotion: { status: 'not_configured', offer: null },
  action: {
    mode: 'request_invoice',
    target: { kind: 'route', value: '/developer/plans' },
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
      audience: 'developer',
      products: [developerProduct],
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

describe('public Developer product landing page', () => {
  it('shows the approved preparation path while normal runtime commercial activation is disabled', () => {
    render(<DeveloperProductLandingPage />);

    expect(
      screen.getByRole('heading', {
        name: 'Establish your Developer organisation and prepare private projects.',
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Preparation-only onboarding')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Commercial activation is not available yet. Complete your profile and prepare private drafts; publishing becomes available after approved commercial activation.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Prepare private development drafts')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Public project presentation and commercial participation follow approval, review, and commercial activation.',
      ),
    ).toBeInTheDocument();

    const preparationLinks = screen.getAllByRole('link', {
      name: /Start Developer preparation/i,
    });
    expect(preparationLinks).toHaveLength(2);
    preparationLinks.forEach(link => {
      expect(link).toHaveAttribute(
        'href',
        '/login?mode=register&next=%2Fdeveloper%2Fsetup&role=property_developer',
      );
    });

    expect(useCatalogMock).not.toHaveBeenCalled();
  });

  it('does not advertise a paid offer, invoice request, or activation period while activation is disabled', () => {
    render(<DeveloperProductLandingPage />);

    expect(screen.queryByText('R1,499')).not.toBeInTheDocument();
    expect(screen.queryByText(/90 days/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Request Launch Access invoice/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/manual EFT/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Contact Property Listify/i }),
    ).not.toBeInTheDocument();
  });

  it('retains the catalog-driven commercial presentation for a separately enabled runtime', () => {
    render(<DeveloperCommercialLandingPage />);

    expect(
      screen.getByRole('heading', {
        name: 'Run your development portfolio from one connected workspace.',
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('developer-workspace-preview')).toHaveLength(2);
    expect(screen.getByTestId('developer-operating-model')).toBeInTheDocument();
    expect(screen.getAllByText('Unit types and availability').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Development-linked enquiries').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Readiness and attention').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('#developer-faq details')).toHaveLength(10);
    expect(screen.getByText('How do I pay and when does access begin?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Explore developments/i })).toHaveAttribute(
      'href',
      '/developer/developments',
    );

    expect(screen.getAllByText('Developer Launch Access').length).toBeGreaterThan(0);
    expect(screen.getAllByText('R1,499').length).toBeGreaterThan(0);
    expect(screen.getAllByText('90 days').length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        /Unlimited legitimate Developer portfolio during the active Launch Access period/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Manual EFT · finance-verified activation/i)).toBeInTheDocument();
    expect(screen.getAllByText(/No automatic renewal/i).length).toBeGreaterThan(0);
    const launchCard = screen.getByTestId('developer-launch-access-card');
    expect(
      within(launchCard).getByRole('link', { name: /Request Launch Access invoice/i }),
    ).toHaveAttribute('href', '/developer/plans');
    expect(
      screen.getByText(/complete your company profile, then request your Launch Access invoice/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: /Contact Property Listify/i }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/free trial|Stripe|Coming Soon|waitlist/i)).not.toBeInTheDocument();
    expect(
      screen.getByText('Put the full Developer workspace to work for 90 days.'),
    ).toBeInTheDocument();
  });

  it('keeps catalog-unavailable Launch Access as an intentional assisted path', () => {
    useCatalogMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCommercialCatalog>);

    render(<DeveloperCommercialLandingPage />);

    const card = screen.getByTestId('developer-launch-access-card');
    expect(within(card).getByRole('heading', { name: 'Assisted access path' })).toBeInTheDocument();
    expect(screen.getByText('Manual EFT activation')).toBeInTheDocument();
    expect(screen.getByText('No automatic renewal')).toBeInTheDocument();
    expect(screen.getByText(/catalog details are unavailable/i)).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: /Contact Property Listify/i })).toHaveAttribute(
      'href',
      '/contact',
    );
    expect(screen.queryByText('R1,499')).not.toBeInTheDocument();
    expect(screen.queryByText('90 days')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Put the full Developer workspace to work during a focused launch period/i),
    ).toBeInTheDocument();
  });
});
