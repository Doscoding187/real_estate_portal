import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PartnerReferralDetailPage, { getReferralAffordabilityDisplay } from './PartnerReferralDetailPage';

const {
  mockUseAuth,
  mockUseLocation,
  mockUseRoute,
  mockGetReferralUseQuery,
  mockExportPackUseMutation,
  mockPresignUseMutation,
  mockSubmitReferralDocumentUseMutation,
  mockMyPipelineUseQuery,
  mockStatusUseQuery,
  mockMyCommissionEntriesUseQuery,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseLocation: vi.fn(),
  mockUseRoute: vi.fn(),
  mockGetReferralUseQuery: vi.fn(),
  mockExportPackUseMutation: vi.fn(),
  mockPresignUseMutation: vi.fn(),
  mockSubmitReferralDocumentUseMutation: vi.fn(),
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
        submitReferralDocument: {
          useMutation: (...args: unknown[]) => mockSubmitReferralDocumentUseMutation(...args),
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
    upload: {
      presign: {
        useMutation: (...args: unknown[]) => mockPresignUseMutation(...args),
      },
    },
  },
}));

describe('PartnerReferralDetailPage affordability display', () => {
  it('uses matched listing labels for rent and auction attachments', () => {
    const rent = getReferralAffordabilityDisplay({
      transactionType: 'rent',
      purchasePriceEstimate: 1_500_000,
      listingPriceFrom: 12_500,
      listingPriceTo: 14_000,
    });
    expect(rent?.label).toBe('Matched monthly rent');
    expect(rent?.value.replace(/\s/g, ' ')).toBe('R12 500 - R14 000 / month');

    const auction = getReferralAffordabilityDisplay({
      transactionType: 'auction',
      purchasePriceEstimate: 1_500_000,
      listingPriceFrom: 850_000,
      listingPriceTo: 900_000,
    });
    expect(auction?.label).toBe('Matched starting bid');
    expect(auction?.value.replace(/\s/g, ' ')).toBe('R850 000 - R900 000');
  });

  it('falls back to purchase price estimate for legacy sale attachments', () => {
    expect(
      getReferralAffordabilityDisplay({
        purchasePriceEstimate: 1_450_000,
      }),
    ).toMatchObject({
      label: 'Purchase price estimate',
    });
  });
});

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
    mockPresignUseMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockSubmitReferralDocumentUseMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockGetReferralUseQuery.mockReturnValue({
      isLoading: false,
      error: null,
      refetch: vi.fn(),
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
        applicationDocuments: [
          {
            templateId: 11,
            documentCode: 'sale_agreement',
            documentLabel: 'Developer sale agreement',
            category: 'developer_document',
            templateFileUrl: 'https://example.com/template.pdf',
            templateFileName: 'sale-agreement.pdf',
            isRequired: true,
            sortOrder: 1,
            status: 'pending',
          },
          {
            templateId: 12,
            documentCode: 'id_document',
            documentLabel: 'Buyer ID document',
            category: 'client_required_document',
            isRequired: true,
            sortOrder: 2,
            status: 'verified',
          },
        ],
        programTerms: {
          sourceDocuments: [
            {
              templateId: 20,
              documentLabel: 'Unit / house plans',
              fileUrl: 'https://example.com/plans.pdf',
              fileName: 'plans.pdf',
            },
          ],
        },
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

  it('shows application upload and supporting document sections', () => {
    mockExportPackUseMutation.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
    });

    render(<PartnerReferralDetailPage />);

    expect(screen.getByText('Application and Supporting Documents')).toBeInTheDocument();
    expect(screen.getByText('Developer sale agreement')).toBeInTheDocument();
    expect(screen.getByText('Buyer ID document')).toBeInTheDocument();
    expect(screen.getByText('Unit / house plans')).toBeInTheDocument();
    expect(screen.getByText('Upload signed copy')).toBeInTheDocument();
  });

  it('shows transaction-aware affordability labels for rental referrals', () => {
    mockExportPackUseMutation.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
    });
    const current = mockGetReferralUseQuery().data;
    mockGetReferralUseQuery.mockReturnValue({
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      data: {
        ...current,
        affordability: {
          ...current.affordability,
          transactionType: 'rent',
          listingPriceFrom: 12500,
          listingPriceTo: 14000,
        },
      },
    });

    render(<PartnerReferralDetailPage />);

    expect(screen.getByText('Matched monthly rent:')).toBeInTheDocument();
    expect(screen.getByText(/\/ month/)).toBeInTheDocument();
    expect(screen.queryByText('Purchase price estimate:')).not.toBeInTheDocument();
  });
});
