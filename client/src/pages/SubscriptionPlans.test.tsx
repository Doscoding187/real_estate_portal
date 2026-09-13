import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CommercialProduct } from '@/hooks/useCommercialCatalog';

const { catalogMock, setLocationMock } = vi.hoisted(() => ({
  catalogMock: vi.fn(),
  setLocationMock: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/subscription-plans', setLocationMock],
}));

vi.mock('@/hooks/useCommercialCatalog', () => ({
  useCommercialCatalog: (...args: unknown[]) => catalogMock(...args),
}));

vi.mock('@/layouts/HomeLayout', () => ({
  HomeLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import SubscriptionPlans from './SubscriptionPlans';

const agentLaunchAccess = {
  productId: 'plan:agent_launch_access',
  productType: 'subscription',
  source: { authority: 'canonical_plans', planId: 42, planKey: 'agent_launch_access' },
  name: 'agent_launch_access',
  displayName: 'Agent Launch Access',
  description: 'Prepare a professional presence and private inventory.',
  audience: 'agent',
  active: true,
  popular: false,
  benefits: ['Professional profile'],
  limits: { max_active_listings: 50 },
  entitlements: { max_active_listings: 50 },
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
    target: { kind: 'route', value: '/agent/select-package' },
    requiresAuthentication: false,
    reason: 'Canonical agent onboarding route.',
  },
} as CommercialProduct;

describe('SubscriptionPlans preparation-only onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    catalogMock.mockReturnValue({
      data: { products: [agentLaunchAccess] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it('routes a public commercial CTA into preparation without presenting an invoice action', () => {
    render(<SubscriptionPlans />);

    expect(screen.getByText(/Preparation-only onboarding/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /invoice/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Prepare workspace' }));

    expect(setLocationMock).toHaveBeenCalledWith('/agent/select-package');
  });
});
