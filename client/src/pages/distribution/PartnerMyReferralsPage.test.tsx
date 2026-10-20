import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PartnerMyReferralsPage from './PartnerMyReferralsPage';

const {
  mockUseAuth,
  mockUseLocation,
  mockSetLocation,
  mockListMyReferrals,
  mockMyViewings,
  mockMyPayouts,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseLocation: vi.fn(),
  mockSetLocation: vi.fn(),
  mockListMyReferrals: vi.fn(),
  mockMyViewings: vi.fn(),
  mockMyPayouts: vi.fn(),
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
          useQuery: (...args: unknown[]) => mockListMyReferrals(...args),
        },
      },
      referrer: {
        myViewings: {
          useQuery: (...args: unknown[]) => mockMyViewings(...args),
        },
        myCommissionEntries: {
          useQuery: (...args: unknown[]) => mockMyPayouts(...args),
        },
      },
    },
  },
}));

const scheduledDeal = {
  dealId: 42,
  development: { developmentId: 1, name: 'Preview Ridge Estate' },
  status: 'viewing_scheduled',
  marketMode: 'sale',
  updatedAt: '2026-10-18T10:00:00.000Z',
  manager: { userId: 3, displayName: 'Preview Sales Manager', email: 'manager@example.com' },
  docProgress: { requiredCount: 2, verifiedRequiredCount: 1 },
  workflowProgress: null,
};

const paidDeal = {
  dealId: 43,
  development: { developmentId: 2, name: 'Hillside Gardens' },
  status: 'commission_paid',
  marketMode: 'rent',
  updatedAt: '2026-10-10T10:00:00.000Z',
  manager: null,
  docProgress: { requiredCount: 0, verifiedRequiredCount: 0 },
  workflowProgress: null,
};

const recordedViewings = [
  { id: 1, dealId: 42, status: 'scheduled', scheduledStartAt: '2027-02-01T09:00:00.000Z' },
];

const payoutRecords = [
  {
    id: 1,
    dealId: 42,
    entryStatus: 'pending',
    dealStage: 'viewing_scheduled',
    commissionAmount: 25000,
    currency: 'ZAR',
  },
  {
    id: 2,
    dealId: 43,
    entryStatus: 'paid',
    dealStage: 'commission_paid',
    commissionAmount: 18000,
    currency: 'ZAR',
  },
];

function cardFor(name: string) {
  const heading = screen.getByRole('heading', { name });
  const card = heading.closest('article');
  if (!card) throw new Error(`No card found for ${name}`);
  return within(card);
}

describe('PartnerMyReferralsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, loading: false, user: { id: 7 } });
    mockUseLocation.mockReturnValue(['/distribution/partner/referrals', mockSetLocation]);
    mockListMyReferrals.mockReturnValue({
      isLoading: false,
      error: null,
      data: { items: [scheduledDeal, paidDeal] },
    });
    mockMyViewings.mockReturnValue({ isLoading: false, error: null, data: recordedViewings });
    mockMyPayouts.mockReturnValue({ isLoading: false, error: null, data: payoutRecords });
  });

  it('renders recorded deal cards with viewing, documents, and payout panels', () => {
    render(<PartnerMyReferralsPage />);

    expect(screen.getByText('Follow every introduction you make')).toBeInTheDocument();
    expect(screen.getByText('Showing 2 deals')).toBeInTheDocument();

    const scheduledCard = cardFor('Preview Ridge Estate');
    expect(scheduledCard.getByText('Viewing booked')).toBeInTheDocument();
    expect(scheduledCard.getByText(/Viewing booked for/)).toBeInTheDocument();
    expect(scheduledCard.getByText('Documents: 1 of 2 verified')).toBeInTheDocument();
    expect(scheduledCard.getByText('Responsible contact: Preview Sales Manager')).toBeInTheDocument();
    expect(scheduledCard.getByText(/R\s25\s000/)).toBeInTheDocument();
    expect(scheduledCard.getByText('Awaiting eligibility trigger')).toBeInTheDocument();

    const paidCard = cardFor('Hillside Gardens');
    expect(paidCard.getByText('Referral payout paid')).toBeInTheDocument();
    expect(paidCard.getByText(/R\s18\s000/)).toBeInTheDocument();
    expect(paidCard.getByText('Paid')).toBeInTheDocument();
    expect(paidCard.getByText('Responsible contact: Pending assignment')).toBeInTheDocument();
    expect(paidCard.getByText(/Rental/)).toBeInTheDocument();
  });

  it('filters deals by closed state and resets with the chips', () => {
    render(<PartnerMyReferralsPage />);

    fireEvent.click(screen.getByRole('button', { name: /Closed/ }));

    expect(screen.getByText('Showing 1 deal')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hillside Gardens' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Preview Ridge Estate' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /In progress/ }));

    expect(screen.getByRole('heading', { name: 'Preview Ridge Estate' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Hillside Gardens' })).not.toBeInTheDocument();
  });

  it('sorts by payout amount and keeps unrecorded payouts last', () => {
    render(<PartnerMyReferralsPage />);

    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'payout_high' } });

    const cards = screen.getAllByRole('article');
    expect(within(cards[0]).getByRole('heading', { name: 'Preview Ridge Estate' })).toBeInTheDocument();
    expect(within(cards[1]).getByRole('heading', { name: 'Hillside Gardens' })).toBeInTheDocument();
  });

  it('navigates to the deal detail page from a card', () => {
    render(<PartnerMyReferralsPage />);

    fireEvent.click(cardFor('Hillside Gardens').getByRole('button', { name: /View deal/ }));

    expect(mockSetLocation).toHaveBeenCalledWith('/distribution/partner/referrals/43');
  });

  it('shows an honest empty state that points to opportunities', () => {
    mockListMyReferrals.mockReturnValue({ isLoading: false, error: null, data: { items: [] } });

    render(<PartnerMyReferralsPage />);

    expect(screen.getByText('Your introductions will appear here')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Browse opportunities/ }));

    expect(mockSetLocation).toHaveBeenCalledWith('/distribution/partner/developments');
  });

  it('keeps payout panels honest when payout records cannot be loaded', () => {
    mockMyPayouts.mockReturnValue({
      isLoading: false,
      error: new Error('payouts unavailable'),
      data: undefined,
    });

    render(<PartnerMyReferralsPage />);

    expect(
      screen.getByText('We could not load referral payout statuses. Refresh and try again.'),
    ).toBeInTheDocument();

    const scheduledCard = cardFor('Preview Ridge Estate');
    expect(scheduledCard.getByText('Not yet recorded')).toBeInTheDocument();
    expect(scheduledCard.getByText('Payout status could not be loaded.')).toBeInTheDocument();
  });
});
