import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PartnerCommissionsPage from './PartnerCommissionsPage';

const {
  mockUseAuth,
  mockUseLocation,
  mockSetLocation,
  mockCommissionEntriesQuery,
  mockMyViewingsQuery,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseLocation: vi.fn(),
  mockSetLocation: vi.fn(),
  mockCommissionEntriesQuery: vi.fn(),
  mockMyViewingsQuery: vi.fn(),
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    useLocation: () => mockUseLocation(),
  };
});

vi.mock('@/components/referral/ReferralAppShell', () => ({
  ReferralAppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    distribution: {
      referrer: {
        myViewings: {
          useQuery: (...args: unknown[]) => mockMyViewingsQuery(...args),
        },
        myCommissionEntries: {
          useQuery: (...args: unknown[]) => mockCommissionEntriesQuery(...args),
        },
      },
    },
  },
}));

const pendingRecord = {
  id: 1,
  dealId: 42,
  developmentName: 'Hillside Gardens',
  buyerName: 'Jane Buyer',
  dealStage: 'bond_approved',
  entryStatus: 'pending',
  triggerStage: 'bond_approved',
  commissionAmount: 24000,
  currency: 'ZAR',
  updatedAt: '2026-04-01T10:00:00.000Z',
};

const paidRecord = {
  id: 2,
  dealId: 43,
  developmentName: 'Ridge View Estate',
  buyerName: null,
  dealStage: 'commission_paid',
  entryStatus: 'paid',
  triggerStage: 'bond_approved',
  commissionAmount: 18000,
  currency: 'ZAR',
  approvedAt: '2026-05-01T10:00:00.000Z',
  paidAt: '2026-05-15T10:00:00.000Z',
  paymentReference: 'PAY-0001',
  updatedAt: '2026-05-15T10:00:00.000Z',
};

describe('PartnerCommissionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, loading: false });
    mockUseLocation.mockReturnValue(['/distribution/partner/commissions', mockSetLocation]);
    mockCommissionEntriesQuery.mockReturnValue({
      isLoading: false,
      error: null,
      data: [pendingRecord],
    });
    mockMyViewingsQuery.mockReturnValue({ isLoading: false, error: null, data: [] });
  });

  it('uses referral payout language while showing recorded payout states', () => {
    render(<PartnerCommissionsPage />);

    expect(screen.getByText('Referral payouts')).toBeInTheDocument();
    expect(screen.getByText('Track every referral payout')).toBeInTheDocument();
    expect(screen.getByText('Recorded payout totals')).toBeInTheDocument();
    expect(screen.getByText('Referral payout records')).toBeInTheDocument();
    expect(screen.getByText('Showing 1 payout record')).toBeInTheDocument();
    expect(screen.getAllByText(/R 24\s000/)).not.toHaveLength(0);
    expect(screen.getByText('Potential referral payout')).toBeInTheDocument();
    expect(screen.getByText('Awaiting eligibility trigger')).toBeInTheDocument();
  });

  it('renders paid records with recorded payment details and navigates to the deal', () => {
    mockCommissionEntriesQuery.mockReturnValue({
      isLoading: false,
      error: null,
      data: [pendingRecord, paidRecord],
    });

    render(<PartnerCommissionsPage />);

    expect(screen.getByText('Showing 2 payout records')).toBeInTheDocument();
    expect(screen.getAllByText('Paid').length).toBeGreaterThan(1);
    expect(screen.getAllByText(/R\s18\s000/).length).toBeGreaterThan(0);
    expect(screen.getByText('Ref: PAY-0001')).toBeInTheDocument();
    expect(screen.getAllByText(/Paid:/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText('Ridge View Estate').closest('button')!);

    expect(mockSetLocation).toHaveBeenCalledWith('/distribution/partner/referrals/43');
  });

  it('filters records by status and offers a reset when the filter is empty', () => {
    render(<PartnerCommissionsPage />);

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'paid' } });

    expect(screen.getByText('Showing 0 payout records')).toBeInTheDocument();
    expect(screen.getByText('No payout records for this filter')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show all records' }));

    expect(screen.getByText('Showing 1 payout record')).toBeInTheDocument();
    expect(screen.getByText('Hillside Gardens')).toBeInTheDocument();
  });

  it('keeps an honest error state when payout records cannot be loaded', () => {
    mockCommissionEntriesQuery.mockReturnValue({
      isLoading: false,
      error: new Error('payouts unavailable'),
      data: undefined,
    });

    render(<PartnerCommissionsPage />);

    expect(
      screen.getByText('We could not load your referral payout records. Refresh and try again.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Showing 0 payout records')).toBeInTheDocument();
  });
});
