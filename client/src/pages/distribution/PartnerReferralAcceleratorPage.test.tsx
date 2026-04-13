import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PartnerReferralAcceleratorPage from './PartnerReferralAcceleratorPage';

const TEST_ASSESSMENT_ID = '11111111-1111-1111-1111-111111111111';

const {
  mockUseAuth,
  mockUseLocation,
  mockSetLocation,
  mockCreateAssessmentMutation,
  mockGetAssessmentQuery,
  mockGetMatchesQuery,
  mockExportPdfMutation,
  mockCreditCheckMutation,
  state,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseLocation: vi.fn(),
  mockSetLocation: vi.fn(),
  mockCreateAssessmentMutation: vi.fn(),
  mockGetAssessmentQuery: vi.fn(),
  mockGetMatchesQuery: vi.fn(),
  mockExportPdfMutation: vi.fn(),
  mockCreditCheckMutation: vi.fn(),
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

vi.mock('@/components/ListingNavbar', () => ({
  ListingNavbar: () => <div data-testid="listing-navbar" />, 
}));

vi.mock('@/components/distribution/partner/AffordabilityForm', () => ({
  AffordabilityForm: ({
    onSubmit,
    onChange,
  }: {
    onSubmit: () => void;
    onChange: (next: Record<string, string>) => void;
  }) => (
    <div>
      <button onClick={() => onChange({ grossIncomeMonthly: '50000' })}>Set Gross Income</button>
      <button onClick={() => onSubmit()}>Calculate Snapshot</button>
    </div>
  ),
}));

vi.mock('@/components/distribution/partner/ResultsPanel', () => ({
  ResultsPanel: ({ onGetMatches }: { onGetMatches: () => void }) => (
    <button onClick={onGetMatches}>Get matches</button>
  ),
}));

vi.mock('@/components/distribution/partner/MatchesGrid', () => ({
  MatchesGrid: () => <div>Matches Ready</div>,
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    distribution: {
      partner: {
        createAffordabilityAssessment: {
          useMutation: (opts: unknown) => mockCreateAssessmentMutation(opts),
        },
        getAffordabilityAssessment: {
          useQuery: (input: unknown, opts: unknown) => mockGetAssessmentQuery(input, opts),
        },
        getAffordabilityMatches: {
          useQuery: (input: unknown, opts: unknown) => mockGetMatchesQuery(input, opts),
        },
        exportQualificationPackPdf: {
          useMutation: (opts: unknown) => mockExportPdfMutation(opts),
        },
        requestCreditCheckPlaceholder: {
          useMutation: (opts: unknown) => mockCreditCheckMutation(opts),
        },
      },
      referrer: {
        myPipeline: {
          useQuery: () => ({
            data: { stageCounts: {} },
            isLoading: false,
            error: null,
          }),
        },
        status: {
          useQuery: () => ({
            data: { accessCount: 0 },
            isLoading: false,
            error: null,
            refetchOnWindowFocus: true,
          }),
        },
      },
    },
  },
}));

describe('PartnerReferralAcceleratorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.hasAssessment = false;
    state.hasMatches = false;

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });
    mockUseLocation.mockReturnValue(['/partner/referrals/accelerator', mockSetLocation]);

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
              subjectName: null,
              subjectPhone: null,
              grossIncomeMonthly: 50000,
              deductionsMonthly: 0,
              depositAmount: 0,
              assumptions: {
                interestRateAnnual: 11.75,
                termMonths: 240,
                maxRepaymentRatio: 0.3,
                calcVersion: 'v1',
              },
              outputs: {
                maxMonthlyRepayment: 15000,
                indicativeLoanAmount: 1500000,
                indicativePurchaseMin: 1500000,
                indicativePurchaseMax: 1500000,
                purchasePrice: 1500000,
                confidenceLabel: 'Indicative — needs credit verification',
                confidenceLevel: 'standard',
              },
              locationFilter: null,
              creditCheck: {
                consentGiven: false,
                requestedAt: null,
              },
              disclaimers: [],
              createdAt: '2026-03-05T00:00:00.000Z',
            }
          : null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }));

    mockGetMatchesQuery.mockImplementation((input: any) => ({
      data:
        state.hasMatches && input?.assessmentId === TEST_ASSESSMENT_ID
          ? {
              assessmentId: TEST_ASSESSMENT_ID,
              matchSnapshotId: '22222222-2222-2222-2222-222222222222',
              createdAt: '2026-03-05T00:00:00.000Z',
              purchasePrice: 1500000,
              matches: [],
              createdNewSnapshot: true,
            }
          : null,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(async () => {
        state.hasMatches = true;
        return { data: null } as any;
      }),
    }));

    mockExportPdfMutation.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
    });

    mockCreditCheckMutation.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
    });
  });

  it('enables PDF CTA after calculate then matches render', async () => {
    const rendered = render(<PartnerReferralAcceleratorPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Set Gross Income' }));
    fireEvent.click(screen.getByRole('button', { name: 'Calculate Snapshot' }));
    await waitFor(() => expect(state.hasAssessment).toBe(true));

    rendered.rerender(<PartnerReferralAcceleratorPage />);
    const pdfButtonBeforeMatches = screen.getByRole('button', {
      name: 'Download Qualification Pack (PDF)',
    });
    expect(pdfButtonBeforeMatches).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Get matches' }));
    await waitFor(() => expect(state.hasMatches).toBe(true));

    rendered.rerender(<PartnerReferralAcceleratorPage />);

    expect(screen.getByText('Matches Ready')).toBeInTheDocument();
    const pdfButtonAfter = screen.getByRole('button', {
      name: 'Download Qualification Pack (PDF)',
    });
    expect(pdfButtonAfter).toBeEnabled();
  });
});