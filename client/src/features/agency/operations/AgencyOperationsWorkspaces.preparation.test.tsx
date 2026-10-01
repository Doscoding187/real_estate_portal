import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkspaceContentProps } from '../workspace/types';

const {
  billingStateQueryMock,
  billingWorkspaceQueryMock,
  commercialActivationMock,
  cancelSubscriptionMock,
  reactivateSubscriptionMock,
  setLocationMock,
  startCheckoutMock,
  submitProofMock,
  useUtilsMock,
  onNavigateMock,
  startCheckoutMutation,
} = vi.hoisted(() => ({
  billingStateQueryMock: vi.fn(),
  billingWorkspaceQueryMock: vi.fn(),
  commercialActivationMock: vi.fn(),
  cancelSubscriptionMock: vi.fn(),
  reactivateSubscriptionMock: vi.fn(),
  setLocationMock: vi.fn(),
  startCheckoutMock: vi.fn(),
  submitProofMock: vi.fn(),
  useUtilsMock: vi.fn(),
  onNavigateMock: vi.fn(),
  startCheckoutMutation: vi.fn(),
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
      commercialActivation: {
        useQuery: (...args: unknown[]) => commercialActivationMock(...args),
      },
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
    expect(commercialActivationMock).toHaveBeenCalled();
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

describe('Agency Launch Access billing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    billingStateQueryMock.mockReturnValue({
      data: {
        accessState: {
          billingStatus: 'pending_payment',
          workspaceAccess: {},
          actionableReason: 'Request the Agency Launch Access invoice.',
        },
        canonicalSubscription: {
          subscription: { status: 'pending_payment' },
          plan: { id: 701, name: 'agency_launch_access', displayName: 'Agency Launch Access' },
        },
      },
      isLoading: false,
    });
    billingWorkspaceQueryMock.mockReturnValue({
      data: {
        plans: [
          {
            id: 701,
            name: 'agency_launch_access',
            displayName: 'Agency Launch Access',
            price: 99_900,
            features: '[]',
          },
        ],
        subscription: { status: 'pending_payment' },
        currentPlan: { id: 701, name: 'agency_launch_access', displayName: 'Agency Launch Access' },
        invoices: [],
        payments: [],
        activeInvoice: null,
        bankDetails: {
          configured: true,
          canIssueInvoices: true,
          bankName: 'Test Bank',
          accountNumber: '1234567890',
          branchCode: '000000',
        },
        proofStorage: {
          configured: false,
          message: 'Proof storage will be configured before submission.',
        },
      },
      isLoading: false,
    });
    startCheckoutMock.mockReturnValue({ mutate: startCheckoutMutation, isPending: false });
    submitProofMock.mockReturnValue({ mutate: vi.fn(), isPending: false });
    useUtilsMock.mockReturnValue({});
  });

  it('keeps a selected pending Agency plan actionable for its first once-off invoice', () => {
    render(<AgencyBillingWorkspace {...billingWorkspaceProps} />);

    expect(screen.getByText('R999 once-off')).toBeInTheDocument();
    expect(screen.getAllByText('90 days').length).toBeGreaterThan(0);
    expect(screen.getAllByText('No automatic renewal').length).toBeGreaterThan(0);
    expect(screen.getByTestId('agency-launch-access-stage')).toHaveTextContent(
      'Selected pending product',
    );
    expect(screen.queryByText('Cancel at period end')).not.toBeInTheDocument();
    expect(screen.queryByText('Reactivate subscription')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'annual' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'monthly' })).not.toBeInTheDocument();

    const requestInvoice = screen.getByRole('button', { name: /Request R999 invoice/i });
    expect(requestInvoice).toBeEnabled();
    fireEvent.click(requestInvoice);

    expect(startCheckoutMutation).toHaveBeenCalledWith({ planId: 701, billingCycle: 'monthly' });
  });
});
