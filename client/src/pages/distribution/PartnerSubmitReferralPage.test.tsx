import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PartnerSubmitReferralPage from './PartnerSubmitReferralPage';

const {
  mockUseAuth,
  mockUseLocation,
  mockListEligibleUseQuery,
  mockSubmitReferralUseMutation,
  mockSetLocation,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseLocation: vi.fn(),
  mockListEligibleUseQuery: vi.fn(),
  mockSubmitReferralUseMutation: vi.fn(),
  mockSetLocation: vi.fn(),
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
    },
  },
}));

describe('PartnerSubmitReferralPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });
    mockUseLocation.mockReturnValue(['/distribution/partner/submit', mockSetLocation]);
    mockListEligibleUseQuery.mockReturnValue({
      data: {
        items: [
          {
            developmentId: 101,
            developmentName: 'Sky City',
            city: 'Johannesburg',
            province: 'Gauteng',
            program: {
              isActive: true,
              isReferralEnabled: true,
            },
          },
        ],
      },
      isLoading: false,
      error: null,
    });
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
    fireEvent.click(screen.getByRole('button', { name: 'Submit Referral' }));

    await waitFor(() =>
      expect(mutateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          developmentId: 101,
          buyerName: 'Jane Buyer',
        }),
      ),
    );
    expect(
      screen.getByText('Referrals are currently disabled for this development.'),
    ).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: 'Submit Referral' }));

    const viewExistingButton = await screen.findByRole('button', {
      name: 'View existing referral',
    });
    fireEvent.click(viewExistingButton);

    expect(mockSetLocation).toHaveBeenCalledWith('/distribution/partner/referrals/77');
  });
});
