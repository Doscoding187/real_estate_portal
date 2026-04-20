import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PartnerDashboardPage from './PartnerDashboardPage';

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
            program: {
              commissionModel: 'flat_amount',
              defaultCommissionAmount: 25000,
              defaultCommissionPercent: null,
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
            program: {
              commissionModel: 'flat_amount',
              defaultCommissionAmount: 25000,
              defaultCommissionPercent: null,
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
});
