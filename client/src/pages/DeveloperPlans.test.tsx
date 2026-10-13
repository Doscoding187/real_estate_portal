import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '@/lib/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { catalogMock, invoiceMutationMock, setLocationMock, subscriptionQueryMock } = vi.hoisted(
  () => ({
    catalogMock: vi.fn(),
    invoiceMutationMock: vi.fn(),
    setLocationMock: vi.fn(),
    subscriptionQueryMock: vi.fn(),
  }),
);

vi.mock('wouter', () => ({
  useLocation: () => ['/developer/plans', setLocationMock],
}));

vi.mock('@/hooks/useCommercialCatalog', () => ({
  useCommercialCatalog: (...args: unknown[]) => catalogMock(...args),
}));

vi.mock('@/hooks/useCommercialProductAvailability', () => ({
  useCommercialProductAvailability: () => ({
    isAvailable: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    developer: {
      getSubscription: {
        useQuery: (...args: unknown[]) => subscriptionQueryMock(...args),
      },
    },
    billing: {
      requestDeveloperLaunchAccessInvoice: {
        useMutation: (...args: unknown[]) => invoiceMutationMock(...args),
      },
    },
  },
}));

import DeveloperPlans, { CommercialDeveloperPlans } from './DeveloperPlans';

vi.mock('@/lib/api', () => ({ apiFetch: vi.fn() }));

describe('DeveloperPlans preparation-only containment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the authenticated direct route in private preparation without loading commercial data', () => {
    render(<DeveloperPlans />);

    expect(screen.getByTestId('developer-plans-preparation')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Prepare your development portfolio before commercial activation.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Preparation-only onboarding')).toBeInTheDocument();
    expect(screen.getByText('Private preparation is available')).toBeInTheDocument();
    expect(screen.queryByText('Developer Launch Access')).not.toBeInTheDocument();
    expect(screen.queryByText(/Paid Launch Access/i)).not.toBeInTheDocument();
    expect(catalogMock).not.toHaveBeenCalled();
    expect(subscriptionQueryMock).not.toHaveBeenCalled();
    expect(invoiceMutationMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Prepare a development' }));
    fireEvent.click(screen.getByRole('button', { name: 'Resume private drafts' }));

    expect(setLocationMock).toHaveBeenNthCalledWith(1, '/developer/create-development');
    expect(setLocationMock).toHaveBeenNthCalledWith(2, '/developer/drafts');
  });
  it('requires purchase consent and the displayed Developer quote before requesting an invoice', async () => {
    const mutate = vi.fn();
    invoiceMutationMock.mockReturnValue({ mutate, isPending: false });
    subscriptionQueryMock.mockReturnValue({ data: null });
    catalogMock.mockReturnValue({
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      data: {
        products: [
          {
            productId: 'test-developer',
            productKey: 'developer_launch_access',
            displayName: 'Developer Launch Access',
            audience: 'developer',
            benefits: [],
            limits: {},
            popular: false,
            source: { planId: 43 },
            term: { kind: 'paid_launch_access', durationDays: 90, autoRenews: false },
            trial: { available: false, days: 0 },
            pricing: {
              mode: 'fixed',
              billingInterval: 'once',
              basePrice: { amountMinor: 149900, currency: 'ZAR' },
            },
            action: { mode: 'request_invoice', target: { kind: 'route', value: '/contact' } },
          },
        ],
      },
    });
    vi.mocked(apiFetch).mockResolvedValue({
      bundleId: 'synthetic-paid-test',
      terms: { version: 'test-terms' },
      privacy: { version: 'test-privacy' },
    });
    render(<CommercialDeveloperPlans />);
    fireEvent.click(screen.getByRole('button', { name: /Request.*invoice/i }));
    const continueButton = await screen.findByRole('button', { name: 'Continue' });
    expect(continueButton).toBeDisabled();
    fireEvent.click(await screen.findByRole('checkbox'));
    await waitFor(() => expect(continueButton).toBeEnabled());
    fireEvent.click(continueButton);
    expect(mutate).toHaveBeenCalledWith({
      legalAcceptance: {
        bundleId: 'synthetic-paid-test',
        termsAccepted: true,
        purchaseAccepted: true,
        quote: { planId: 43, amountDue: 149900, currency: 'ZAR' },
      },
    });
  });
});
