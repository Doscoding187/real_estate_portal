import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PartnerReferralDetailPage from './PartnerReferralDetailPage';

const {
  mockUseAuth,
  mockUseLocation,
  mockUseRoute,
  mockGetReferralUseQuery,
  mockExportPackUseMutation,
  mockMyPipelineUseQuery,
  mockStatusUseQuery,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseLocation: vi.fn(),
  mockUseRoute: vi.fn(),
  mockGetReferralUseQuery: vi.fn(),
  mockExportPackUseMutation: vi.fn(),
  mockMyPipelineUseQuery: vi.fn(),
  mockStatusUseQuery: vi.fn(),
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
    useRoute: () => mockUseRoute(),
  };
});

vi.mock('@/components/ListingNavbar', () => ({
  ListingNavbar: () => <div data-testid="listing-navbar" />,
}));

vi.mock('@/components/distribution/partner/PayoutRulesDisclosure', () => ({
  PayoutRulesDisclosure: () => <div data-testid="payout-rules-disclosure" />,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    distribution: {
      partner: {
        getReferral: {
          useQuery: (...args: unknown[]) => mockGetReferralUseQuery(...args),
        },
        exportQualificationPackPdfForReferral: {
          useMutation: (...args: unknown[]) => mockExportPackUseMutation(...args),
        },
      },
      referrer: {
        myPipeline: {
          useQuery: (...args: unknown[]) => mockMyPipelineUseQuery(...args),
        },
        status: {
          useQuery: (...args: unknown[]) => mockStatusUseQuery(...args),
        },
        myCommissionEntries: {
          useQuery: (...args: unknown[]) => mockMyCommissionEntriesUseQuery(...args),
        },
      },
    },
  },
}));

describe('PartnerReferralDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });
    mockUseLocation.mockReturnValue(['/distribution/partner/referrals/42', vi.fn()]);
    mockUseRoute.mockReturnValue([true, { dealId: '42' }]);
    mockMyPipelineUseQuery.mockReturnValue({ data: { stageCounts: {} } });
    mockStatusUseQuery.mockReturnValue({ data: { accessCount: 0 } });
    mockMyCommissionEntriesUseQuery.mockReturnValue({ data: [], isLoading: false, error: null });
    mockGetReferralUseQuery.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        dealId: 42,
        development: {
          developmentId: 100,
          name: 'Sky City',
          city: 'Johannesburg',
          province: 'Gauteng',
        },
        status: 'submitted',
        assessmentId: 'de305d54-75b4-431b-adb2-eb6b9e546014',
        matchSnapshotId: 'de305d54-75b4-431b-adb2-eb6b9e546015',
        createdAt: '2026-03-06 10:00:00',
        updatedAt: '2026-03-06 10:05:00',
        buyer: {
          name: 'Jane Buyer',
          phone: '+27111222333',
          email: 'jane@example.com',
        },
        manager: null,
        affordability: {
          purchasePriceEstimate: 1450000,
          assumptions: {
            interestRateAnnual: 11.75,
            termMonths: 240,
            maxRepaymentRatio: 0.3,
            calcVersion: 'v1',
          },
        },
        docProgress: {
          requiredCount: 3,
          verifiedRequiredCount: 1,
        },
        programTerms: null,
        timeline: [],
      },
    });
  });

  it('shows Qualification Pack download action when attached snapshot exists', () => {
    const mutate = vi.fn();
    mockExportPackUseMutation.mockReturnValue({
      isPending: false,
      mutate,
    });

    render(<PartnerReferralDetailPage />);

    const button = screen.getByRole('button', { name: 'Download Qualification Pack' });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(mutate).toHaveBeenCalledWith({ dealId: 42 });
  });
});
