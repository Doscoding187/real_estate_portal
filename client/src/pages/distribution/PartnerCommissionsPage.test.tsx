import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PartnerCommissionsPage from './PartnerCommissionsPage';

const {
  mockUseAuth,
  mockUseLocation,
  mockSetLocation,
  mockCommissionEntriesQuery,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseLocation: vi.fn(),
  mockSetLocation: vi.fn(),
  mockCommissionEntriesQuery: vi.fn(),
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
  });

  it('uses referral payout language while showing recorded payment states', () => {
    render(<PartnerCommissionsPage />);

    expect(screen.getByText('Referral Payouts')).toBeInTheDocument();
    expect(screen.getByText('Recorded Payout Summary')).toBeInTheDocument();
    expect(screen.getByText('Referral Payout Records')).toBeInTheDocument();
    expect(screen.getAllByText(/R 24\s000/)).not.toHaveLength(0);
    expect(screen.getByText('Recorded payout stage: Bond Approved')).toBeInTheDocument();
  });
});
