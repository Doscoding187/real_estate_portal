import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PartnerDevelopmentsPage, {
  getPartnerDevelopmentOpportunityCopy,
  getPartnerDevelopmentPricingContext,
  normalizePartnerDevelopmentTransactionType,
} from './PartnerDevelopmentsPage';

const {
  mockUseAuth,
  mockUseLocation,
  mockListProgramTermsUseQuery,
  mockSetLocation,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseLocation: vi.fn(),
  mockListProgramTermsUseQuery: vi.fn(),
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

vi.mock('@/components/referral/ReferralAppShell', () => ({
  ReferralAppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    distribution: {
      partner: {
        listProgramTerms: {
          useQuery: (...args: unknown[]) => mockListProgramTermsUseQuery(...args),
        },
      },
    },
  },
}));

describe('PartnerDevelopmentsPage transaction helpers', () => {
  it('normalizes and labels Sale, Rental, and Auction opportunity lanes', () => {
    expect(normalizePartnerDevelopmentTransactionType('for_rent')).toBe('rent');
    expect(normalizePartnerDevelopmentTransactionType('auction')).toBe('auction');
    expect(normalizePartnerDevelopmentTransactionType('for_sale')).toBe('sale');
    expect(getPartnerDevelopmentOpportunityCopy('for_rent')).toMatchObject({
      readyLabel: 'Open for renters',
      submitLabel: 'Submit Renter',
      preQualifyLabel: 'Pre-Qualify Renter',
    });
    expect(getPartnerDevelopmentOpportunityCopy('auction')).toMatchObject({
      readyLabel: 'Open for bidders',
      submitLabel: 'Submit Bidder',
      preQualifyLabel: 'Pre-Qualify Bidder',
    });
  });

  it('keeps pricing language transaction-aware on opportunity cards', () => {
    const rentPricing = getPartnerDevelopmentPricingContext({
      transactionType: 'for_rent',
      priceFrom: 12000,
      priceTo: 14000,
    });
    expect({
      ...rentPricing,
      priceText: rentPricing.priceText.replace(/\s/g, ' '),
    }).toMatchObject({
      priceLabel: 'Monthly rent',
      priceText: 'R 12 000 - R 14 000 / month',
      monthlyCostLabel: 'Monthly rent',
      incomeLabel: 'Suggested income',
    });
    const auctionPricing = getPartnerDevelopmentPricingContext({
      transactionType: 'auction',
      priceFrom: 850000,
    });
    expect({
      ...auctionPricing,
      priceText: auctionPricing.priceText.replace(/\s/g, ' '),
    }).toMatchObject({
      priceLabel: 'Starting bid',
      priceText: 'Bid from R 850 000',
      incomeLabel: 'Indicative income',
    });
  });
});

describe('PartnerDevelopmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });
    mockUseLocation.mockReturnValue(['/distribution/partner/developments', mockSetLocation]);
    mockListProgramTermsUseQuery.mockReturnValue({
      data: {
        items: [
          {
            developmentId: 101,
            developmentName: 'Sales Estate',
            transactionType: 'for_sale',
            city: 'Johannesburg',
            province: 'Gauteng',
            priceFrom: 900000,
            priceTo: 1100000,
            unitTypes: [],
            opportunity: {
              status: 'ready',
              friendlyMessage: 'Ready for buyer referrals.',
            },
          },
          {
            developmentId: 202,
            developmentName: 'Harbour Rentals',
            transactionType: 'for_rent',
            city: 'Cape Town',
            province: 'Western Cape',
            priceFrom: 12500,
            priceTo: 15000,
            unitTypes: [],
            opportunity: {
              status: 'ready',
              friendlyMessage: 'Ready for renter referrals.',
            },
          },
          {
            developmentId: 303,
            developmentName: 'Auction Yard',
            transactionType: 'auction',
            city: 'Durban',
            province: 'KwaZulu-Natal',
            priceFrom: 850000,
            priceTo: null,
            unitTypes: [],
            opportunity: {
              status: 'ready',
              friendlyMessage: 'Ready for bidder referrals.',
            },
          },
        ],
      },
      isLoading: false,
      error: null,
    });
  });

  it('renders transaction-native opportunity labels and submit CTAs', () => {
    render(<PartnerDevelopmentsPage />);

    expect(screen.getByText('Open for buyers')).toBeInTheDocument();
    expect(screen.getByText('Open for renters')).toBeInTheDocument();
    expect(screen.getByText('Open for bidders')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Buyer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Renter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Bidder' })).toBeInTheDocument();
    expect(screen.getByText('R 12 500 - R 15 000 / month')).toBeInTheDocument();
    expect(screen.getByText('Bid from R 850 000')).toBeInTheDocument();
    expect(screen.getByText(/buyer, renter, or bidder referrals now/i)).toBeInTheDocument();
  });
});
