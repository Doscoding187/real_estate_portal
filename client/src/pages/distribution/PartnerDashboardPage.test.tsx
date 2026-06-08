import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PartnerDashboardPage, {
  getPartnerDashboardOpportunityCopy,
  getPartnerDashboardPricingContext,
  getPartnerDashboardWorkspaceCopy,
  normalizePartnerDashboardTransactionType,
} from './PartnerDashboardPage';

const TEST_ASSESSMENT_ID = '11111111-1111-1111-1111-111111111111';

const {
  mockUseAuth,
  mockUseLocation,
  mockSetLocation,
  mockCreateAssessmentMutation,
  mockGetAssessmentQuery,
  mockGetMatchesQuery,
  mockReferrerStatusQuery,
  mockReferrerMyAccessQuery,
  mockReferrerMyPipelineQuery,
  mockReferrerMyViewingsQuery,
  mockReferrerMyCommissionEntriesQuery,
  mockPartnerListMyReferralsQuery,
  mockPartnerListEligibleDevelopmentsQuery,
  mockPartnerListProgramTermsQuery,
  state,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseLocation: vi.fn(),
  mockSetLocation: vi.fn(),
  mockCreateAssessmentMutation: vi.fn(),
  mockGetAssessmentQuery: vi.fn(),
  mockGetMatchesQuery: vi.fn(),
  mockReferrerStatusQuery: vi.fn(),
  mockReferrerMyAccessQuery: vi.fn(),
  mockReferrerMyPipelineQuery: vi.fn(),
  mockReferrerMyViewingsQuery: vi.fn(),
  mockReferrerMyCommissionEntriesQuery: vi.fn(),
  mockPartnerListMyReferralsQuery: vi.fn(),
  mockPartnerListEligibleDevelopmentsQuery: vi.fn(),
  mockPartnerListProgramTermsQuery: vi.fn(),
  state: {
    hasAssessment: false,
    hasMatches: false,
  },
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
        createAffordabilityAssessment: {
          useMutation: (...args: unknown[]) => mockCreateAssessmentMutation(...args),
        },
        getAffordabilityAssessment: {
          useQuery: (...args: unknown[]) => mockGetAssessmentQuery(...args),
        },
        getAffordabilityMatches: {
          useQuery: (...args: unknown[]) => mockGetMatchesQuery(...args),
        },
        listMyReferrals: {
          useQuery: (...args: unknown[]) => mockPartnerListMyReferralsQuery(...args),
        },
        listEligibleDevelopmentsForSubmission: {
          useQuery: (...args: unknown[]) => mockPartnerListEligibleDevelopmentsQuery(...args),
        },
        listProgramTerms: {
          useQuery: (...args: unknown[]) => mockPartnerListProgramTermsQuery(...args),
        },
      },
      referrer: {
        status: {
          useQuery: (...args: unknown[]) => mockReferrerStatusQuery(...args),
        },
        myAccess: {
          useQuery: (...args: unknown[]) => mockReferrerMyAccessQuery(...args),
        },
        myPipeline: {
          useQuery: (...args: unknown[]) => mockReferrerMyPipelineQuery(...args),
        },
        myViewings: {
          useQuery: (...args: unknown[]) => mockReferrerMyViewingsQuery(...args),
        },
        myCommissionEntries: {
          useQuery: (...args: unknown[]) => mockReferrerMyCommissionEntriesQuery(...args),
        },
      },
    },
  },
}));

describe('PartnerDashboardPage pricing helpers', () => {
  it('normalizes unsupported transaction types to sale', () => {
    expect(normalizePartnerDashboardTransactionType('for_rent')).toBe('rent');
    expect(normalizePartnerDashboardTransactionType('rental')).toBe('rent');
    expect(normalizePartnerDashboardTransactionType('auction')).toBe('auction');
    expect(normalizePartnerDashboardTransactionType('on_auction')).toBe('auction');
    expect(normalizePartnerDashboardTransactionType('leasehold')).toBe('sale');
  });

  it('summarizes dashboard copy for mixed transaction lanes', () => {
    expect(getPartnerDashboardOpportunityCopy('for_rent')).toMatchObject({
      participantLabel: 'Renter',
      submitLabel: 'Submit Renter',
    });
    expect(getPartnerDashboardOpportunityCopy('auction')).toMatchObject({
      participantLabel: 'Bidder',
      submitLabel: 'Submit Bidder',
    });
    expect(getPartnerDashboardWorkspaceCopy(['for_sale', 'for_rent', 'auction'])).toMatchObject({
      title: 'My Referral Hub',
      submitLabel: 'Submit Referral',
      matchLabel: 'Match Client',
      participantKpiLabel: 'My Referrals',
      rewardEstimateLabel: 'Est. referral reward',
      fitMatchesEmpty:
        'Enter client details and run pre-qualification to see matching stock and estimated reward.',
      readySectionDescription:
        'Ready opportunities your buyers, renters, and bidders can be submitted to now.',
    });
    expect(getPartnerDashboardWorkspaceCopy(['for_rent'])).toMatchObject({
      rewardEstimateLabel: 'Est. rental reward',
      fitMatchesEmpty:
        'Enter renter details and run pre-qualification to see matching stock and estimated reward.',
    });
    expect(getPartnerDashboardWorkspaceCopy(['auction'])).toMatchObject({
      rewardEstimateLabel: 'Est. auction reward',
      fitMatchesEmpty:
        'Enter bidder details and run pre-qualification to see matching stock and estimated reward.',
    });
  });

  it('labels rental and auction prices without purchase-price copy', () => {
    const rentContext = getPartnerDashboardPricingContext({
      transactionType: 'rent',
      priceFrom: 13500,
      priceTo: 16000,
    });
    expect({
      ...rentContext,
      displayText: rentContext.displayText.replace(/\s/g, ' '),
      shareText: rentContext.shareText.replace(/\s/g, ' '),
    }).toMatchObject({
      label: 'Monthly rent',
      displayText: 'R 13 500 - R 16 000 / month',
      shareText: 'Rent from R 13 500 / month',
      referencePrice: 13500,
    });

    const auctionContext = getPartnerDashboardPricingContext({
      transactionType: 'auction',
      priceFrom: 900000,
    });
    expect({
      ...auctionContext,
      displayText: auctionContext.displayText.replace(/\s/g, ' '),
      shareText: auctionContext.shareText.replace(/\s/g, ' '),
    }).toMatchObject({
      label: 'Starting bid',
      displayText: 'Bid from R 900 000',
      shareText: 'Bid from R 900 000',
      referencePrice: 900000,
    });
  });
});

describe('PartnerDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.hasAssessment = false;
    state.hasMatches = false;

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });
    mockUseLocation.mockReturnValue(['/distribution/partner', mockSetLocation]);

    mockReferrerStatusQuery.mockReturnValue({
      data: { accessCount: 3 },
      isLoading: false,
      error: null,
    });
    mockReferrerMyAccessQuery.mockReturnValue({
      data: [
        {
          developmentId: 10,
          developmentName: 'Waterfall Estate',
          city: 'Midrand',
          province: 'Gauteng',
          priceFrom: 850000,
          priceTo: 1200000,
          transactionType: 'for_sale',
          accessStatus: 'active',
          commissionModel: 'flat_amount',
          defaultCommissionAmount: 25000,
          defaultCommissionPercent: null,
          unitTypes: [],
        },
      ],
      isLoading: false,
      error: null,
    });
    mockReferrerMyPipelineQuery.mockReturnValue({
      data: {
        stageOrder: ['lead', 'viewing_scheduled', 'commission_paid'],
        stageCounts: { lead: 1, viewing_scheduled: 0, commission_paid: 0 },
        deals: [
          {
            id: 88,
            developmentName: 'Waterfall Estate',
            buyerName: 'Jane Doe',
            currentStage: 'lead',
            commissionStatus: 'pending',
            documentsComplete: false,
            updatedAt: '2026-04-10T10:00:00.000Z',
          },
        ],
      },
      isLoading: false,
      error: null,
    });
    mockReferrerMyViewingsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    mockReferrerMyCommissionEntriesQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    mockPartnerListMyReferralsQuery.mockReturnValue({
      data: { items: [] },
      isLoading: false,
      error: null,
    });
    mockPartnerListEligibleDevelopmentsQuery.mockReturnValue({
      data: {
        items: [
          {
            developmentId: 10,
            developmentName: 'Waterfall Estate',
            city: 'Midrand',
            province: 'Gauteng',
            transactionType: 'for_sale',
          program: {
            commissionModel: 'flat_amount',
            defaultCommissionAmount: 25000,
            defaultCommissionPercent: null,
          },
          opportunity: {
            status: 'ready',
            reasonCodes: [],
            nextAction: 'submit_referral',
            friendlyMessage: 'Ready for buyer referrals.',
          },
        },
      ],
      },
      isLoading: false,
      error: null,
    });
    mockPartnerListProgramTermsQuery.mockReturnValue({
      data: {
        items: [
          {
            developmentId: 10,
            developmentName: 'Waterfall Estate',
            city: 'Midrand',
            province: 'Gauteng',
            transactionType: 'for_sale',
          program: {
            commissionModel: 'flat_amount',
            defaultCommissionAmount: 25000,
            defaultCommissionPercent: null,
          },
          opportunity: {
            status: 'ready',
            reasonCodes: [],
            nextAction: 'submit_referral',
            friendlyMessage: 'Ready for buyer referrals.',
          },
        },
      ],
      },
      isLoading: false,
      error: null,
    });

    mockCreateAssessmentMutation.mockImplementation((opts: any) => ({
      isPending: false,
      mutate: () => {
        state.hasAssessment = true;
        opts?.onSuccess?.({ assessmentId: TEST_ASSESSMENT_ID });
      },
    }));

    mockGetAssessmentQuery.mockImplementation((input: any) => ({
      data:
        state.hasAssessment && input?.assessmentId === TEST_ASSESSMENT_ID
          ? {
              assessmentId: TEST_ASSESSMENT_ID,
              outputs: {
                maxMonthlyRepayment: 12000,
                purchasePrice: 950000,
                confidenceLabel: 'Strong Match',
              },
            }
          : null,
      isLoading: false,
      error: null,
    }));

    mockGetMatchesQuery.mockImplementation((input: any) => ({
      data:
        state.hasMatches && input?.assessmentId === TEST_ASSESSMENT_ID
          ? {
              matchSnapshotId: '22222222-2222-2222-2222-222222222222',
              matches: [
                {
                  developmentId: 10,
                  developmentName: 'Waterfall Estate',
                  area: 'Midrand',
                  purchasePrice: 850000,
                  bestFitRatio: 0.92,
                },
              ],
            }
          : null,
      isFetching: false,
      error: null,
      refetch: vi.fn(async () => {
        state.hasMatches = true;
        return { data: null } as any;
      }),
    }));
  });

  it('shows WhatsApp share action after pre-qual and match fetch', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    const rendered = render(<PartnerDashboardPage />);

    fireEvent.change(screen.getByPlaceholderText('Gross income monthly (required)'), {
      target: { value: '45000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run Pre-Qualification' }));

    await waitFor(() => expect(state.hasAssessment).toBe(true));
    rendered.rerender(<PartnerDashboardPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Get Matched Developments' }));
    await waitFor(() => expect(state.hasMatches).toBe(true));
    rendered.rerender(<PartnerDashboardPage />);

    const shareBtn = screen.getByRole('button', { name: 'Share via WhatsApp' });
    expect(shareBtn).toBeInTheDocument();

    fireEvent.click(shareBtn);
    expect(openSpy).toHaveBeenCalled();
    expect(openSpy.mock.calls[0]?.[0]).toContain('wa.me');
  });

  it('renders mixed Sale, Rental, and Auction stock with transaction-native dashboard copy', () => {
    mockReferrerMyAccessQuery.mockReturnValue({
      data: [
        {
          developmentId: 10,
          developmentName: 'Sales Estate',
          city: 'Midrand',
          province: 'Gauteng',
          priceFrom: 850000,
          priceTo: 1200000,
          transactionType: 'for_sale',
          accessStatus: 'active',
          commissionModel: 'flat_amount',
          defaultCommissionAmount: 25000,
          defaultCommissionPercent: null,
          unitTypes: [],
        },
        {
          developmentId: 20,
          developmentName: 'Harbour Rentals',
          city: 'Cape Town',
          province: 'Western Cape',
          priceFrom: 12500,
          priceTo: 15000,
          transactionType: 'for_rent',
          accessStatus: 'active',
          commissionModel: 'flat_amount',
          defaultCommissionAmount: 9000,
          defaultCommissionPercent: null,
          unitTypes: [],
        },
        {
          developmentId: 30,
          developmentName: 'Auction Yard',
          city: 'Durban',
          province: 'KwaZulu-Natal',
          priceFrom: 850000,
          priceTo: null,
          transactionType: 'auction',
          accessStatus: 'active',
          commissionModel: 'flat_amount',
          defaultCommissionAmount: 18000,
          defaultCommissionPercent: null,
          unitTypes: [],
        },
      ],
      isLoading: false,
      error: null,
    });

    render(<PartnerDashboardPage />);

    expect(screen.getByText('My Referral Hub')).toBeInTheDocument();
    expect(screen.getByText(/Add a buyer, renter, or bidder/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Referral' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Match Client' })).toBeInTheDocument();
    expect(screen.getByText('Help Me Match My Client')).toBeInTheDocument();
    expect(screen.getByText('Client Fit Matches')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Enter client details and run pre-qualification to see matching stock and estimated reward.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/estimated commission/i)).not.toBeInTheDocument();
    expect(screen.getByText('Referral Progress Funnel')).toBeInTheDocument();
    expect(screen.getByText('Submitted Referrals')).toBeInTheDocument();
    expect(
      screen.getByText('Ready opportunities your buyers, renters, and bidders can be submitted to now.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Buyer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Renter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Bidder' })).toBeInTheDocument();
    expect(screen.getByText('R 12 500 - R 15 000 / month')).toBeInTheDocument();
    expect(screen.getByText('Bid from R 850 000')).toBeInTheDocument();
  });
});
