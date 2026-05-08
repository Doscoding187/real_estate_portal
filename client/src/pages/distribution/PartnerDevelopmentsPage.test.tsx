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

describe('PartnerDevelopmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, loading: false });
    mockUseLocation.mockReturnValue(['/distribution/partner/developments', mockSetLocation]);
    mockListProgramTermsQuery.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        items: [
          {
            developmentId: 101,
            developmentName: 'Hillside Gardens',
            city: 'Johannesburg',
            suburb: 'Fourways',
            province: 'Gauteng',
            description: 'Secure estate living close to schools, retail, and transport.',
            priceFrom: 1000000,
            priceTo: 1500000,
            brand: {
              brandProfileId: 1,
              brandName: 'Ubuntu Homes',
              publicContactEmail: 'sales@ubuntu.example',
            },
            brochure: {
              contactName: 'Nomsa',
              contactPhone: '071 000 0000',
              contactEmail: 'nomsa@ubuntu.example',
            },
            features: ['Close to schools', 'Secure estate'],
            amenities: ['Fibre ready'],
            program: {
              commissionModel: 'flat_percentage',
              defaultCommissionPercent: 1.5,
              defaultCommissionAmount: null,
              payoutMilestone: 'bond_approval',
              payoutMilestoneNotes: null,
            },
            computed: {
              commissionDisplay: 'R 0',
              payoutDisplay: 'Paid after bond approval',
            },
            opportunity: {
              status: 'ready',
              friendlyMessage: 'Ready for buyer referrals.',
            },
            requiredDocuments: [
              { templateId: 1, documentLabel: 'Buyer ID document', isRequired: true },
            ],
            sourceDocuments: [
              {
                templateId: 2,
                documentLabel: 'Brochure',
                fileUrl: 'https://example.com/brochure.pdf',
                fileName: 'brochure.pdf',
              },
            ],
            unitTypes: [
              {
                name: '2 Bed',
                bedrooms: 2,
                bathrooms: 1,
                unitSize: 62,
                priceFrom: 1000000,
                priceTo: 1200000,
              },
            ],
          },
        ],
      },
    });
  });

  it('shows sales inventory reward, payout, brochure, and submit actions', () => {
    render(<PartnerDevelopmentsPage />);

    expect(screen.getByText('Estimated reward')).toBeInTheDocument();
    expect(screen.getAllByText(/R 15\s000 estimated reward/)).not.toHaveLength(0);
    expect(screen.getByText('Paid after bond approval')).toBeInTheDocument();
    expect(screen.getByText(/Best buyer:/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Buyer' })).toBeEnabled();
    expect(screen.queryByText(/^R 0$/)).not.toBeInTheDocument();
  });

  it('opens a buyer-facing development brochure', () => {
    render(<PartnerDevelopmentsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Open Brochure' }));

    expect(screen.getAllByText('Hillside Gardens')).not.toHaveLength(0);
    expect(screen.getAllByText(/Fourways \| Johannesburg \| Gauteng/)).not.toHaveLength(0);
    expect(screen.getByText(/Secure estate living close to schools/)).toBeInTheDocument();
    expect(screen.getAllByText('Close To Schools')).not.toHaveLength(0);
    expect(screen.getAllByText('Secure Estate')).not.toHaveLength(0);
    expect(screen.getByText('62m2 2 bed 1 bath')).toBeInTheDocument();
    expect(screen.getByText('R 1 000 000 - R 1 200 000')).toBeInTheDocument();
    expect(screen.getAllByText('Estimated Bond Payment')).not.toHaveLength(0);
    expect(screen.getAllByText('Qualifying income')).not.toHaveLength(0);
    expect(screen.queryByText('Contact Nomsa')).not.toBeInTheDocument();
    expect(screen.getByText('Print / Download PDF')).toBeInTheDocument();
    expect(screen.queryByText('Referral Reward')).not.toBeInTheDocument();
    expect(screen.queryByText('Application Documents')).not.toBeInTheDocument();
    expect(screen.queryByText('Buyer ID document')).not.toBeInTheDocument();
  });
});
