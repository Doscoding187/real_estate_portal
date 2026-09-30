import { fireEvent, render, screen } from '@testing-library/react';
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

import DeveloperPlans from './DeveloperPlans';

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
});
