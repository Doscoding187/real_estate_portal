import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  developerSubscriptionQueryMock,
  developerWorkspaceQueryMock,
  setLocationMock,
  submitProofMock,
} = vi.hoisted(() => ({
  developerSubscriptionQueryMock: vi.fn(),
  developerWorkspaceQueryMock: vi.fn(),
  setLocationMock: vi.fn(),
  submitProofMock: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/developer/subscription', setLocationMock],
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    developer: {
      getSubscription: {
        useQuery: (...args: unknown[]) => developerSubscriptionQueryMock(...args),
      },
    },
    billing: {
      developerWorkspace: {
        useQuery: (...args: unknown[]) => developerWorkspaceQueryMock(...args),
      },
      submitDeveloperPaymentProof: {
        useMutation: (...args: unknown[]) => submitProofMock(...args),
      },
    },
  },
}));

import BillingPanel from './BillingPanel';

describe('Developer billing preparation containment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the authenticated subscription route in private preparation without loading commercial data', () => {
    render(<BillingPanel />);

    expect(screen.getByTestId('developer-billing-preparation')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Prepare your Developer workspace before commercial activation.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Preparation-only onboarding')).toBeInTheDocument();
    expect(screen.getByText('Private developments')).toBeInTheDocument();
    expect(screen.queryByText('Billing History')).not.toBeInTheDocument();
    expect(screen.queryByText('Developer Launch Access invoice')).not.toBeInTheDocument();
    expect(screen.queryByText('Manual EFT instructions')).not.toBeInTheDocument();
    expect(developerSubscriptionQueryMock).not.toHaveBeenCalled();
    expect(developerWorkspaceQueryMock).not.toHaveBeenCalled();
    expect(submitProofMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Prepare a development' }));
    fireEvent.click(screen.getByRole('button', { name: 'Resume private drafts' }));

    expect(setLocationMock).toHaveBeenNthCalledWith(1, '/developer/create-development');
    expect(setLocationMock).toHaveBeenNthCalledWith(2, '/developer/drafts');
  });
});
