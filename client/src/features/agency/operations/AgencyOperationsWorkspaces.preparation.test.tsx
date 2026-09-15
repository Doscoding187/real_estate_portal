import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkspaceContentProps } from '../workspace/types';

const {
  billingStateQueryMock,
  billingWorkspaceQueryMock,
  cancelSubscriptionMock,
  reactivateSubscriptionMock,
  setLocationMock,
  startCheckoutMock,
  submitProofMock,
  useUtilsMock,
  onNavigateMock,
} = vi.hoisted(() => ({
  billingStateQueryMock: vi.fn(),
  billingWorkspaceQueryMock: vi.fn(),
  cancelSubscriptionMock: vi.fn(),
  reactivateSubscriptionMock: vi.fn(),
  setLocationMock: vi.fn(),
  startCheckoutMock: vi.fn(),
  submitProofMock: vi.fn(),
  useUtilsMock: vi.fn(),
  onNavigateMock: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: (...args: unknown[]) => useUtilsMock(...args),
    agency: {
      getBillingState: {
        useQuery: (...args: unknown[]) => billingStateQueryMock(...args),
      },
    },
    billing: {
      workspace: {
        useQuery: (...args: unknown[]) => billingWorkspaceQueryMock(...args),
      },
      startManualEftCheckout: {
        useMutation: (...args: unknown[]) => startCheckoutMock(...args),
      },
      submitPaymentProof: {
        useMutation: (...args: unknown[]) => submitProofMock(...args),
      },
      cancelSubscription: {
        useMutation: (...args: unknown[]) => cancelSubscriptionMock(...args),
      },
      reactivateSubscription: {
        useMutation: (...args: unknown[]) => reactivateSubscriptionMock(...args),
      },
    },
  },
}));

import { AgencyBillingWorkspace } from './AgencyOperationsWorkspaces';

const billingWorkspaceProps = {
  workspace: 'billing',
  onNavigate: onNavigateMock,
  setLocation: setLocationMock,
} as unknown as WorkspaceContentProps;

describe('Agency billing preparation containment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the authenticated billing route in private preparation without loading commercial data', () => {
    render(<AgencyBillingWorkspace {...billingWorkspaceProps} />);

    expect(screen.getByTestId('agency-billing-preparation')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Prepare your Agency workspace before commercial activation.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Preparation-only onboarding')).toBeInTheDocument();
    expect(screen.getByText('Private inventory')).toBeInTheDocument();
    expect(screen.queryByText('Available Plans')).not.toBeInTheDocument();
    expect(screen.queryByText('Proof Of Payment')).not.toBeInTheDocument();
    expect(screen.queryByText('Manual verification')).not.toBeInTheDocument();
    expect(useUtilsMock).not.toHaveBeenCalled();
    expect(billingStateQueryMock).not.toHaveBeenCalled();
    expect(billingWorkspaceQueryMock).not.toHaveBeenCalled();
    expect(startCheckoutMock).not.toHaveBeenCalled();
    expect(submitProofMock).not.toHaveBeenCalled();
    expect(cancelSubscriptionMock).not.toHaveBeenCalled();
    expect(reactivateSubscriptionMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Continue Agency setup' }));
    fireEvent.click(screen.getByRole('button', { name: 'Prepare private inventory' }));

    expect(setLocationMock).toHaveBeenCalledWith('/agency/setup');
    expect(onNavigateMock).toHaveBeenCalledWith('listings');
  });
});
