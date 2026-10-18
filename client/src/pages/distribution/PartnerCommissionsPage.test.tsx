import { render, screen } from '@testing-library/react';
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

describe('PartnerCommissionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, loading: false });
    mockUseLocation.mockReturnValue(['/distribution/partner/commissions', mockSetLocation]);
    mockCommissionEntriesQuery.mockReturnValue({
      isLoading: false,
      error: null,
      data: [
        {
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
        },
      ],
    });
    mockMyViewingsQuery.mockReturnValue({ isLoading: false, error: null, data: [] });
  });

  it('uses referral payout language while showing recorded payout states', () => {
    render(<PartnerCommissionsPage />);

    expect(screen.getByText('My referral payouts')).toBeInTheDocument();
    expect(screen.getByText('Recorded payout totals')).toBeInTheDocument();
    expect(screen.getByText('Referral Payout Records')).toBeInTheDocument();
    expect(screen.getAllByText(/R 24\s000/)).not.toHaveLength(0);
    expect(screen.getByText('Potential referral payout')).toBeInTheDocument();
  });
});
