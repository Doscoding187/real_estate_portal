import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PartnerMyReferralsPage from './PartnerMyReferralsPage';

const {
  mockUseAuth,
  mockUseLocation,
  mockSetLocation,
  mockListMyReferralsUseQuery,
  mockMyCommissionEntriesUseQuery,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseLocation: vi.fn(),
  mockSetLocation: vi.fn(),
  mockListMyReferralsUseQuery: vi.fn(),
  mockMyCommissionEntriesUseQuery: vi.fn(),
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
      partner: {
        listMyReferrals: {
          useQuery: (...args: unknown[]) => mockListMyReferralsUseQuery(...args),
        },
      },
      referrer: {
        myCommissionEntries: {
          useQuery: (...args: unknown[]) => mockMyCommissionEntriesUseQuery(...args),
        },
      },
    },
  },
}));

describe('PartnerMyReferralsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });
    mockUseLocation.mockReturnValue(['/distribution/partner/referrals', mockSetLocation]);
    mockListMyReferralsUseQuery.mockReturnValue({
      data: { items: [] },
      isLoading: false,
      error: null,
    });
    mockMyCommissionEntriesUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
  });

  it('uses transaction-neutral journey wording for referral rewards', () => {
    render(<PartnerMyReferralsPage />);

    expect(
      screen.getByText('Every buyer moves from review to site visit, agreement, and payout.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Every buyer moves from review to site visit, sale, and payout.')).not.toBeInTheDocument();
  });
});
