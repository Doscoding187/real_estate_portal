import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PartnerReferralDetailPage, {
  getReferralAffordabilityDisplay,
  getReferralDetailStageLabel,
  getReferralDetailTransactionCopy,
  normalizeReferralDetailTransactionType,
} from './PartnerReferralDetailPage';

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
  it('uses transaction-aware detail labels for rental and auction referrals', () => {
    expect(normalizeReferralDetailTransactionType('for_rent')).toBe('rent');
    expect(normalizeReferralDetailTransactionType('auction')).toBe('auction');
    expect(normalizeReferralDetailTransactionType('for_sale')).toBe('sale');
    expect(getReferralDetailStageLabel('application_submitted', 'for_rent')).toBe(
      'Rental application submitted',
    );
    expect(getReferralDetailStageLabel('contract_signed', 'auction')).toBe(
      'Auction terms accepted',
    );
    expect(getReferralDetailTransactionCopy('for_rent')).toMatchObject({
      participantLabel: 'Renter',
      statusTitle: 'Renter Status and Reward Progress',
    });
    expect(getReferralDetailTransactionCopy('auction')).toMatchObject({
      participantLabel: 'Bidder',
      statusTitle: 'Bidder Status and Reward Progress',
    });
  });

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
          transactionType: 'for_sale',
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

    expect(screen.getByText('Referral #42')).toBeInTheDocument();
    expect(screen.queryByText('Deal #42')).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Download Qualification Pack' });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(mutate).toHaveBeenCalledWith({ dealId: 42 });
  });

  it('uses referral and reward labels for payout and manager follow-up actions', () => {
    mockExportPackUseMutation.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
    });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const current = mockGetReferralUseQuery().data;
    mockGetReferralUseQuery.mockReturnValue({
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      data: {
        ...current,
        status: 'commission_pending',
        journey: {
          actionCode: 'track_payout',
          ownerRole: 'manager',
        },
        manager: {
          email: 'manager@example.com',
        },
      },
    });

    render(<PartnerReferralDetailPage />);

    expect(screen.getByText('Referral #42')).toBeInTheDocument();
    expect(screen.queryByText('Deal #42')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Rewards' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open Commissions' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Contact Manager' }));
    const mailtoUrl = String(openSpy.mock.calls[0]?.[0] || '');
    expect(decodeURIComponent(mailtoUrl)).toContain('Referral #42');
    expect(decodeURIComponent(mailtoUrl)).toContain('referral #42');
    expect(decodeURIComponent(mailtoUrl)).not.toContain('Deal #42');
    expect(decodeURIComponent(mailtoUrl)).not.toContain('deal #42');

    openSpy.mockRestore();
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
    expect(screen.getByText('Buyer application documents')).toBeInTheDocument();
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
        development: {
          ...current.development,
          transactionType: 'for_rent',
        },
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

  it('renders rental referral detail with renter journey language', () => {
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
        development: {
          ...current.development,
          transactionType: 'for_rent',
        },
        status: 'application_submitted',
        affordability: {
          ...current.affordability,
          transactionType: 'rent',
          listingPriceFrom: 12500,
          listingPriceTo: 14000,
        },
      },
    });

    render(<PartnerReferralDetailPage />);

    expect(screen.getByText('Rental referral')).toBeInTheDocument();
    expect(screen.getByText('Renter Status and Reward Progress')).toBeInTheDocument();
    expect(screen.getAllByText('Rental application submitted').length).toBeGreaterThan(0);
    expect(screen.getByText('Renter:')).toBeInTheDocument();
    expect(screen.getByText('Renter application documents')).toBeInTheDocument();
    expect(screen.getByText(/renter qualification files/i)).toBeInTheDocument();
  });

  it('renders auction referral detail with bidder journey language', () => {
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
        development: {
          ...current.development,
          transactionType: 'auction',
        },
        status: 'contract_signed',
        affordability: {
          ...current.affordability,
          transactionType: 'auction',
          listingPriceFrom: 850000,
          listingPriceTo: 900000,
        },
      },
    });

    render(<PartnerReferralDetailPage />);

    expect(screen.getByText('Auction referral')).toBeInTheDocument();
    expect(screen.getByText('Bidder Status and Reward Progress')).toBeInTheDocument();
    expect(screen.getAllByText('Auction terms accepted').length).toBeGreaterThan(0);
    expect(screen.getByText('Bidder:')).toBeInTheDocument();
    expect(screen.getByText('Bidder application documents')).toBeInTheDocument();
    expect(screen.getByText(/bidder readiness files/i)).toBeInTheDocument();
  });
});
