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
        useQuery: (...args: unknown[]) => developerSubscriptionQueryMock(...args),
      },
    },
    billing: {
      developerWorkspace: {
        useQuery: (...args: unknown[]) => developerWorkspaceQueryMock(...args),
      },
      submitLaunchAccessPaymentNotice: {
        useMutation: (...args: unknown[]) => submitProofMock(...args),
      },
    },
  },
}));

import BillingPanel, { CommercialDeveloperBillingPanel } from './BillingPanel';

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
  it('shows payable bank instructions and submits a Developer notice without storage or an attachment', () => {
    const mutate = vi.fn();
    developerSubscriptionQueryMock.mockReturnValue({
      data: null,
      isLoading: false,
      refetch: vi.fn(),
    });
    developerWorkspaceQueryMock.mockReturnValue({
      data: {
        activeInvoice: {
          id: 17,
          invoiceNumber: 'TEST-DEV-17',
          paymentReference: 'EXACT-DEV-17',
          amountDue: 149900,
          status: 'issued',
        },
        bankDetails: {
          accountName: 'TEST COMPANY',
          bankName: 'TEST BANK',
          accountNumber: '0000000000',
          branchCode: '000000',
          accountType: 'TEST ACCOUNT',
        },
        proofStorage: { configured: false },
        invoices: [],
      },
      isLoading: false,
      refetch: vi.fn(),
    });
    submitProofMock.mockReturnValue({ mutate, isPending: false });
    render(<CommercialDeveloperBillingPanel />);
    expect(screen.getByText('EXACT-DEV-17')).toBeInTheDocument();
    expect(screen.getByText(/0000000000/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Payer / account name'), {
      target: { value: 'Developer payer' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'I’ve paid' }));
    expect(mutate).toHaveBeenCalledWith({
      invoiceId: 17,
      payerName: 'Developer payer',
      paymentDate: expect.any(String),
      requestId: expect.any(String),
    });
  });
});
