import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PartnerSubmitReferralPage, {
  getPartnerSubmitReferralCopy,
  getPartnerSubmitRouteCopy,
  normalizePartnerSubmitTransactionType,
} from './PartnerSubmitReferralPage';

const {
  mockUseAuth,
  mockUseLocation,
  mockListEligibleUseQuery,
  mockSubmitReferralUseMutation,
  mockSetLocation,
  mockMyPipelineUseQuery,
  mockStatusUseQuery,
  mockMyCommissionEntriesUseQuery,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseLocation: vi.fn(),
  mockListEligibleUseQuery: vi.fn(),
  mockSubmitReferralUseMutation: vi.fn(),
  mockSetLocation: vi.fn(),
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
  };
});

vi.mock('@/components/ListingNavbar', () => ({
  ListingNavbar: () => <div data-testid="listing-navbar" />,
}));

vi.mock('@/components/distribution/partner/PayoutRulesDisclosure', () => ({
  PayoutRulesDisclosure: ({ developmentId }: { developmentId: number | null | undefined }) => (
    <div data-testid="payout-disclosure">{developmentId}</div>
  ),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    distribution: {
      partner: {
        listEligibleDevelopmentsForSubmission: {
          useQuery: (input: unknown, opts: unknown) => mockListEligibleUseQuery(input, opts),
        },
        submitReferral: {
          useMutation: (opts: unknown) => mockSubmitReferralUseMutation(opts),
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

describe('PartnerSubmitReferralPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });
    mockUseLocation.mockReturnValue(['/distribution/partner/submit', mockSetLocation]);
    mockMyPipelineUseQuery.mockReturnValue({ data: { stageCounts: {} } });
    mockStatusUseQuery.mockReturnValue({ data: { accessCount: 0 } });
    mockMyCommissionEntriesUseQuery.mockReturnValue({ data: [], isLoading: false, error: null });
    mockListEligibleUseQuery.mockReturnValue({
      data: {
        items: [
          {
            developmentId: 101,
            developmentName: 'Sky City',
            transactionType: 'for_sale',
            city: 'Johannesburg',
            province: 'Gauteng',
            program: {
              isActive: true,
              isReferralEnabled: true,
            },
            requiredDocuments: [
              {
                templateId: 1,
                documentLabel: 'Buyer ID document',
                category: 'client_required_document',
              },
              {
                templateId: 2,
                documentLabel: 'Developer sale agreement',
                category: 'developer_document',
                templateFileUrl: 'https://example.com/sale-agreement.pdf',
                templateFileName: 'sale-agreement.pdf',
              },
            ],
            sourceDocuments: [
              {
                templateId: 3,
                documentLabel: 'Unit / house plans',
                fileUrl: 'https://example.com/plans.pdf',
                fileName: 'plans.pdf',
              },
            ],
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
  });

  it('normalizes transaction-aware submission labels and route copy', () => {
    expect(normalizePartnerSubmitTransactionType('for_rent')).toBe('rent');
    expect(normalizePartnerSubmitTransactionType('auction')).toBe('auction');
    expect(normalizePartnerSubmitTransactionType('for_sale')).toBe('sale');
    expect(getPartnerSubmitReferralCopy('for_rent')).toMatchObject({
      participantLabel: 'Renter',
      pageTitle: 'Submit Renter',
      documentsTitle: 'Renter application documents',
    });
    expect(getPartnerSubmitReferralCopy('auction')).toMatchObject({
      participantLabel: 'Bidder',
      pageTitle: 'Submit Bidder',
      documentsTitle: 'Bidder application documents',
    });
    expect(getPartnerSubmitRouteCopy('cash', 'for_rent')).toMatch(/Deposit-ready renters/i);
    expect(getPartnerSubmitRouteCopy('investor', 'auction')).toMatch(/Investor bidders/i);
  });

  it('calls submit API and shows eligibility blockers when PROGRAM_NOT_ELIGIBLE is returned', async () => {
    const mutateSpy = vi.fn();
    mockSubmitReferralUseMutation.mockImplementation((opts: any) => ({
      isPending: false,
      mutate: (payload: unknown) => {
        mutateSpy(payload);
        opts?.onError?.({
          message: 'Program is not eligible for referral submission.',
          data: {
            errorCode: 'PROGRAM_NOT_ELIGIBLE',
            reasons: [
              {
                code: 'REFERRALS_DISABLED',
                message: 'Referrals are currently disabled for this development.',
              },
            ],
          },
        });
      },
    }));

    render(<PartnerSubmitReferralPage />);

    fireEvent.change(screen.getByPlaceholderText('Buyer full name'), {
      target: { value: 'Jane Buyer' },
    });

    const mainArea = screen.getByRole('main');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(within(mainArea).getByRole('button', { name: 'Submit Buyer' }));

    await waitFor(() =>
      expect(mutateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          developmentId: 101,
          buyerName: 'Jane Buyer',
        }),
      ),
    );
    expect(screen.getByText('Referrals are currently closed for this opportunity.')).toBeInTheDocument();
  });

  it('shows duplicate referral action and links to existing deal', async () => {
    mockSubmitReferralUseMutation.mockImplementation((opts: any) => ({
      isPending: false,
      mutate: () => {
        opts?.onError?.({
          message: 'A similar referral already exists.',
          data: {
            errorCode: 'DUPLICATE_REFERRAL',
            existingDealId: 77,
          },
        });
      },
    }));

    render(<PartnerSubmitReferralPage />);

    fireEvent.change(screen.getByPlaceholderText('Buyer full name'), {
      target: { value: 'John Buyer' },
    });

    const mainArea = screen.getByRole('main');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(within(mainArea).getByRole('button', { name: 'Submit Buyer' }));

    const viewExistingButton = await screen.findByRole('button', {
      name: 'View existing referral',
    });
    fireEvent.click(viewExistingButton);

    expect(mockSetLocation).toHaveBeenCalledWith('/distribution/partner/referrals/77');
  });

  it('only shows submit-ready opportunities in the buyer wizard', () => {
    mockListEligibleUseQuery.mockReturnValue({
      data: {
        items: [
          {
            developmentId: 101,
            developmentName: 'Ready Estate',
            city: 'Johannesburg',
            province: 'Gauteng',
            program: { isActive: true, isReferralEnabled: true },
            requiredDocuments: [],
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
    mockSubmitReferralUseMutation.mockReturnValue({ isPending: false, mutate: vi.fn() });

    render(<PartnerSubmitReferralPage />);

    expect(screen.getByText('Ready Estate')).toBeInTheDocument();
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument();
  });

  it('separates buyer, developer application, and supporting documents in the wizard', () => {
    mockSubmitReferralUseMutation.mockReturnValue({ isPending: false, mutate: vi.fn() });

    render(<PartnerSubmitReferralPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('Buyer application documents')).toBeInTheDocument();
    expect(screen.getByText('Developer application documents')).toBeInTheDocument();
    expect(screen.getByText('Supporting documents')).toBeInTheDocument();
    expect(screen.getByText('Buyer ID document')).toBeInTheDocument();
    expect(screen.getByText('Developer sale agreement')).toBeInTheDocument();
    expect(screen.getByText('Unit / house plans')).toBeInTheDocument();
    expect(screen.getByText(/Bond buyers usually need income proof/i)).toBeInTheDocument();
  });

  it('renders renter submission language for rental opportunities', () => {
    mockListEligibleUseQuery.mockReturnValue({
      data: {
        items: [
          {
            developmentId: 202,
            developmentName: 'Harbour Rentals',
            transactionType: 'for_rent',
            city: 'Cape Town',
            province: 'Western Cape',
            program: { isActive: true, isReferralEnabled: true },
            requiredDocuments: [
              {
                templateId: 11,
                documentLabel: 'Renter ID document',
                category: 'client_required_document',
              },
            ],
            sourceDocuments: [],
            opportunity: {
              status: 'ready',
              reasonCodes: [],
              nextAction: 'submit_referral',
              friendlyMessage: 'Ready for renter referrals.',
            },
          },
        ],
      },
      isLoading: false,
      error: null,
    });
    mockSubmitReferralUseMutation.mockReturnValue({ isPending: false, mutate: vi.fn() });

    render(<PartnerSubmitReferralPage />);

    expect(screen.getAllByText('Submit Renter').length).toBeGreaterThan(0);
    expect(screen.getByText('Renter Submission Wizard')).toBeInTheDocument();
    expect(screen.getByText(/ready for renter submission/i)).toBeInTheDocument();
    expect(screen.getByText(/review, renter contact, qualification/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Renter full name')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Renter route')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deposit ready' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Monthly rent range')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Renter application documents')).toBeInTheDocument();
    expect(screen.getByText('Renter ID document')).toBeInTheDocument();
    expect(screen.getByText(/renter education and sharing/i)).toBeInTheDocument();
  });

  it('renders bidder submission language for auction opportunities', () => {
    mockListEligibleUseQuery.mockReturnValue({
      data: {
        items: [
          {
            developmentId: 303,
            developmentName: 'Auction Yard',
            transactionType: 'auction',
            city: 'Durban',
            province: 'KwaZulu-Natal',
            program: { isActive: true, isReferralEnabled: true },
            requiredDocuments: [
              {
                templateId: 21,
                documentLabel: 'Bidder FICA pack',
                category: 'client_required_document',
              },
            ],
            sourceDocuments: [],
            opportunity: {
              status: 'ready',
              reasonCodes: [],
              nextAction: 'submit_referral',
              friendlyMessage: 'Ready for bidder referrals.',
            },
          },
        ],
      },
      isLoading: false,
      error: null,
    });
    mockSubmitReferralUseMutation.mockReturnValue({ isPending: false, mutate: vi.fn() });

    render(<PartnerSubmitReferralPage />);

    expect(screen.getAllByText('Submit Bidder').length).toBeGreaterThan(0);
    expect(screen.getByText('Bidder Submission Wizard')).toBeInTheDocument();
    expect(screen.getByText(/ready for bidder submission/i)).toBeInTheDocument();
    expect(screen.getByText(/bidder contact, registration, auction readiness/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Bidder full name')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Bidder route')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cash bidder' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Bid range or ceiling')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Bidder application documents')).toBeInTheDocument();
    expect(screen.getByText('Bidder FICA pack')).toBeInTheDocument();
    expect(screen.getByText(/bidder education and sharing/i)).toBeInTheDocument();
  });
});
