import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PartnerMyReferralsPage, {
  getPartnerReferralStageLabel,
  normalizePartnerReferralTransactionType,
} from './PartnerMyReferralsPage';

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

  it('uses transaction-aware helper labels for rental and auction referrals', () => {
    expect(normalizePartnerReferralTransactionType('for_rent')).toBe('rent');
    expect(normalizePartnerReferralTransactionType('auction')).toBe('auction');
    expect(normalizePartnerReferralTransactionType('for_sale')).toBe('sale');

    expect(getPartnerReferralStageLabel('application_submitted', 'for_rent')).toBe(
      'Rental application submitted',
    );
    expect(getPartnerReferralStageLabel('contract_signed', 'for_rent')).toBe('Lease signed');
    expect(getPartnerReferralStageLabel('application_submitted', 'auction')).toBe(
      'Bidder registered',
    );
    expect(getPartnerReferralStageLabel('contract_signed', 'auction')).toBe(
      'Auction terms accepted',
    );
  });

  it('uses transaction-neutral journey wording for referral rewards', () => {
    render(<PartnerMyReferralsPage />);

    expect(
      screen.getByText(
        'Buyer, renter, and bidder journeys use transaction-aware labels while payout readiness stays governed by programme terms.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Every buyer moves from review to site visit, sale, and payout.')).not.toBeInTheDocument();
  });

  it('renders rental and auction referral rows with transaction-native labels', () => {
    mockListMyReferralsUseQuery.mockReturnValue({
      data: {
        items: [
          {
            dealId: 101,
            development: {
              name: 'Rental Quarter',
              transactionType: 'for_rent',
            },
            status: 'application_submitted',
            docProgress: {
              requiredCount: 2,
              verifiedRequiredCount: 1,
            },
            journey: {},
          },
          {
            dealId: 102,
            development: {
              name: 'Auction Yard',
              transactionType: 'auction',
            },
            status: 'contract_signed',
            docProgress: {
              requiredCount: 3,
              verifiedRequiredCount: 3,
            },
            journey: {},
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    render(<PartnerMyReferralsPage />);

    expect(screen.getByText('Rental application submitted')).toBeInTheDocument();
    expect(screen.getByText('renter')).toBeInTheDocument();
    expect(screen.getByText('Next action: Upload rental docs')).toBeInTheDocument();
    expect(screen.getByText('Auction terms accepted')).toBeInTheDocument();
    expect(screen.getByText('bidder')).toBeInTheDocument();
    expect(screen.getByText('Next action: Track auction reward')).toBeInTheDocument();
  });
});
