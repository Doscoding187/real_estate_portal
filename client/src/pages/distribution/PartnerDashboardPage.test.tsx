import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PartnerDashboardPage from './PartnerDashboardPage';

const {
  mockUseAuth,
  mockSetLocation,
  mockStatusQuery,
  mockPipelineQuery,
  mockViewingsQuery,
  mockCommissionEntriesQuery,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockSetLocation: vi.fn(),
  mockStatusQuery: vi.fn(),
  mockPipelineQuery: vi.fn(),
  mockViewingsQuery: vi.fn(),
  mockCommissionEntriesQuery: vi.fn(),
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    useLocation: () => ['/distribution/partner/overview', mockSetLocation],
  };
});

vi.mock('@/components/referral/ReferralAppShell', () => ({
  ReferralAppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    distribution: {
      referrer: {
        status: { useQuery: (...args: unknown[]) => mockStatusQuery(...args) },
        myPipeline: { useQuery: (...args: unknown[]) => mockPipelineQuery(...args) },
        myViewings: { useQuery: (...args: unknown[]) => mockViewingsQuery(...args) },
        myCommissionEntries: { useQuery: (...args: unknown[]) => mockCommissionEntriesQuery(...args) },
      },
    },
  },
}));

describe('PartnerDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { id: 1, name: 'Individual Referrer Preview', role: 'visitor' },
    });
    mockStatusQuery.mockReturnValue({
      data: { hasIdentity: true },
      isLoading: false,
      isError: false,
    });
    mockPipelineQuery.mockReturnValue({
      data: { deals: [], stageCounts: {}, stageOrder: [] },
      isLoading: false,
      isError: false,
    });
    mockViewingsQuery.mockReturnValue({ data: [], isLoading: false, isError: false });
    mockCommissionEntriesQuery.mockReturnValue({ data: [], isLoading: false, isError: false });
  });

  it('renders the journey framing with honest empty states', () => {
    render(<PartnerDashboardPage />);

    expect(
      screen.getByRole('heading', { name: 'Turn introductions into property opportunities.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Start with the person you have in mind')).toBeInTheDocument();
    expect(screen.getByText('Understand their needs')).toBeInTheDocument();
    expect(screen.getByText('Find suitable properties')).toBeInTheDocument();
    expect(screen.getByText("Introduce when they're ready")).toBeInTheDocument();

    expect(screen.getByText('Needs your attention')).toBeInTheDocument();
    expect(
      screen.getByText('No outstanding actions. Confirmed requests will appear here.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Your introductions will appear here. Updates appear when recorded.'),
    ).toBeInTheDocument();
    expect(screen.getByText('No confirmed payouts yet.')).toBeInTheDocument();
    expect(screen.getByText('Based on programme terms')).toBeInTheDocument();
  });

  it('sends the referrer to the live check fit instead of a disabled panel', () => {
    render(<PartnerDashboardPage />);

    expect(screen.queryByLabelText('Monthly income')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Deposit')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'I have a prospect' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/gross monthly income only/)).toBeInTheDocument();
  });

  it('surfaces recorded activity without inventing states', () => {
    mockPipelineQuery.mockReturnValue({
      data: {
        deals: [
          { id: 87, currentStage: 'lead' },
          { id: 88, currentStage: 'viewing_scheduled' },
        ],
        stageCounts: { lead: 1, viewing_scheduled: 1 },
        stageOrder: ['lead', 'viewing_scheduled'],
      },
      isLoading: false,
      isError: false,
    });
    mockViewingsQuery.mockReturnValue({
      data: [
        {
          id: 7,
          dealId: 88,
          status: 'scheduled',
          scheduledStartAt: new Date(Date.now() + 86_400_000).toISOString(),
          developmentName: 'Waterfall Estate',
        },
      ],
      isLoading: false,
      isError: false,
    });
    mockCommissionEntriesQuery.mockReturnValue({
      data: [
        {
          entryStatus: 'pending',
          dealStage: 'viewing_scheduled',
          currency: 'ZAR',
          commissionAmount: 25000,
        },
      ],
      isLoading: false,
      isError: false,
    });

    render(<PartnerDashboardPage />);

    const attentionCard = screen.getByRole('button', { name: /Needs your attention/ });
    expect(within(attentionCard).getByText('1')).toBeInTheDocument();
    expect(within(attentionCard).getByText(/Next: Waterfall Estate/)).toBeInTheDocument();

    const dealsCard = screen.getByRole('button', { name: /Deals in progress/ });
    expect(within(dealsCard).getByText('2')).toBeInTheDocument();
    expect(within(dealsCard).getByText(/recorded steps/)).toBeInTheDocument();

    const payoutsCard = screen.getByRole('button', { name: /Referral payouts/ });
    expect(within(payoutsCard).getByText('Potential only — not yet payable.')).toBeInTheDocument();
    expect(within(payoutsCard).getByText(/R ?25.?000/)).toBeInTheDocument();
  });

  it('counts shortlists saved in this browser for this account', () => {
    window.localStorage.setItem(
      'property-listify:distribution-shortlist:v1:partner:1:sale',
      JSON.stringify({ 12: { searchSummary: 'Midrand · Buy · 2 beds' } }),
    );

    render(<PartnerDashboardPage />);

    expect(screen.getByText(/1 saved on this device/)).toBeInTheDocument();
  });

  it('links journey actions to their destinations', () => {
    render(<PartnerDashboardPage />);

    fireEvent.click(screen.getByRole('button', { name: /How it works/ }));
    expect(mockSetLocation).toHaveBeenCalledWith('/distribution/partner/how-it-works');

    fireEvent.click(screen.getByRole('button', { name: /View my deals/ }));
    expect(mockSetLocation).toHaveBeenCalledWith('/distribution/partner/referrals');

    fireEvent.click(screen.getAllByRole('button', { name: /Find opportunities/ })[0]);
    expect(mockSetLocation).toHaveBeenCalledWith('/distribution/partner/developments');
  });
});
