import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PartnerDevelopmentsPage from './PartnerDevelopmentsPage';

const { mockUseAuth, mockUseLocation, mockSetLocation, mockListProgramTermsQuery } = vi.hoisted(
  () => ({
    mockUseAuth: vi.fn(),
    mockUseLocation: vi.fn(),
    mockSetLocation: vi.fn(),
    mockListProgramTermsQuery: vi.fn(),
  }),
);

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
          useQuery: (...args: unknown[]) => mockListProgramTermsQuery(...args),
        },
      },
    },
  },
}));

const saleMode = {
  availableCount: 5,
  priceFrom: 1_000_000,
  priceTo: 1_500_000,
  priceBasis: 'purchase_price' as const,
};
const rentMode = {
  availableCount: 3,
  priceFrom: 12_000,
  priceTo: 16_000,
  priceBasis: 'monthly_rent' as const,
};

const partnerItem = {
  developmentId: 101,
  developmentName: 'Hillside Gardens',
  city: 'Johannesburg',
  province: 'Gauteng',
  campaign: {
    visible: true,
    lifecycle: 'selling',
    name: 'Hillside Gardens',
    tagline: 'Modern homes near local schools',
    description: 'Secure estate living close to schools, retail, and transport.',
    developmentType: 'residential',
    city: 'Johannesburg',
    province: 'Gauteng',
    images: [],
  },
  inventory: {
    phaseScope: 'phase-released',
    modes: { sale: saleMode, rent: rentMode },
  },
  contacts: [
    {
      id: 1,
      phaseId: null,
      phaseName: null,
      roleTitle: 'Sales contact',
      displayName: 'Nomsa Example',
      organizationName: 'Hillside Sales',
      email: 'sales@example.test',
      phone: '071 000 0000',
      responsibility: null,
    },
  ],
  programPromotion: {
    headline: 'Limited launch offer',
    description: 'Ask the partner manager about current terms.',
    highlightBullets: ['New homes near schools'],
  },
  program: {
    isActive: true,
    currencyCode: 'ZAR',
    commissionModel: 'flat_percentage',
    defaultCommissionPercent: 1.5,
    defaultCommissionAmount: null,
    payoutMilestone: 'bond_approval',
    payoutMilestoneNotes: null,
  },
  computed: {
    commissionDisplay: '1.5% referral payout',
    payoutDisplay: 'Paid after bond approval',
  },
  opportunity: {
    status: 'ready',
    distributionActive: true,
    partnerEntitled: true,
    campaignVisibility: 'visible',
    openForReferral: true,
    marketability: 'marketable',
    friendlyMessage: 'Ready for buyer referrals.',
  },
  requiredDocuments: [
    {
      templateId: 1,
      documentCode: 'id_document',
      documentLabel: 'Buyer ID document',
      category: 'client_required_document' as const,
      isRequired: true,
      sortOrder: 1,
    },
  ],
  sourceDocuments: [],
  unitTypes: [
    {
      id: 'unit-type-1',
      name: '2 Bed',
      description: null,
      bedrooms: 2,
      bathrooms: 1,
      size: 62,
      imageUrl: null,
      modes: { sale: saleMode, rent: rentMode },
    },
  ],
};

describe('PartnerDevelopmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, loading: false });
    mockUseLocation.mockReturnValue(['/distribution/partner/developments', mockSetLocation]);
    mockListProgramTermsQuery.mockReturnValue({
      isLoading: false,
      error: null,
      data: { items: [partnerItem] },
    });
  });

  it('shows separate current sale and rental availability with mode-specific referral actions', () => {
    render(<PartnerDevelopmentsPage />);

    expect(screen.getByText('Hillside Gardens')).toBeInTheDocument();
    expect(screen.getByText('Sale availability')).toBeInTheDocument();
    expect(screen.getByText('Rental availability')).toBeInTheDocument();
    expect(screen.getByText(/5 available/)).toBeInTheDocument();
    expect(screen.getByText(/3 available/)).toBeInTheDocument();
    expect(screen.getByText('1.5% referral payout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refer a buyer' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Refer a renter' })).toBeEnabled();
    expect(screen.getByText(/Developer contacts shared with partners/)).toBeInTheDocument();
  });

  it('keeps Developer resource links empty and shows Distribution process requirements', () => {
    render(<PartnerDevelopmentsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Program process and requirements' }));

    expect(screen.getByText('Developer shared resources are not connected yet.')).toBeInTheDocument();
    expect(screen.getByText('Buyer ID document')).toBeInTheDocument();
  });
});
