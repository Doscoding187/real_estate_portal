import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PartnerReferralDetailPage from './PartnerReferralDetailPage';

const { mockUseAuth, mockUseLocation, mockUseRoute, mockGetReferral, mockMyViewings } =
  vi.hoisted(() => ({
    mockUseAuth: vi.fn(),
    mockUseLocation: vi.fn(),
    mockUseRoute: vi.fn(),
    mockGetReferral: vi.fn(),
    mockMyViewings: vi.fn(),
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

vi.mock('@/components/referral/ReferralAppShell', () => ({
  ReferralAppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/distribution/partner/PayoutRulesDisclosure', () => ({
  PayoutRulesDisclosure: () => <div data-testid="payout-rules-disclosure" />,
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    distribution: {
      partner: {
        getReferral: {
          useQuery: (...args: unknown[]) => mockGetReferral(...args),
        },
      },
      referrer: {
        myViewings: {
          useQuery: (...args: unknown[]) => mockMyViewings(...args),
        },
      },
    },
  },
}));

const referralFixture = {
  dealId: 42,
  development: {
    developmentId: 100,
    name: 'Sky City',
    city: 'Johannesburg',
    province: 'Gauteng',
  },
  status: 'application_submitted',
  marketMode: 'sale',
  createdAt: '2026-03-06 10:00:00',
  updatedAt: '2026-03-07 10:05:00',
  buyer: {
    name: 'Jane Buyer',
    phone: '+27111222333',
    email: 'jane@example.com',
  },
  manager: {
    userId: 3,
    displayName: 'Preview Manager',
    email: 'manager@example.com',
  },
  workflowProgress: {
    verified: true,
    steps: [
      {
        stepKey: 's1',
        stepLabel: 'Submit application',
        stepType: 'document',
        isBlocking: true,
        ownerRole: 'partner',
        partnerInstructions: 'Upload the signed application.',
      },
    ],
    progress: [
      {
        stepKey: 's1',
        status: 'waiting',
        partnerUpdate: 'Waiting on buyer documents',
        updatedAt: '2026-03-07T10:00:00.000Z',
      },
    ],
  },
  applicationDocuments: [
    {
      templateId: 11,
      documentCode: 'sale_agreement',
      documentLabel: 'Developer sale agreement',
      category: 'developer_document',
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
  programTermsSnapshot: { requiredDocuments: [] },
  timeline: [
    {
      event: 'stage_transition',
      byRole: 'manager',
      at: '2026-03-07T09:30:00.000Z',
      note: 'Moved to application review.',
    },
  ],
};

describe('PartnerReferralDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, loading: false });
    mockUseLocation.mockReturnValue(['/distribution/partner/referrals/42', vi.fn()]);
    mockUseRoute.mockReturnValue([true, { dealId: '42' }]);
    mockMyViewings.mockReturnValue({ isLoading: false, error: null, data: [] });
    mockGetReferral.mockReturnValue({
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      data: referralFixture,
    });
  });

  it('renders recorded progress, saved steps, documents, and the timeline', () => {
    render(<PartnerReferralDetailPage />);

    expect(screen.getByRole('heading', { name: 'Sky City' })).toBeInTheDocument();
    expect(screen.getByText(/Deal #42/)).toBeInTheDocument();
    expect(screen.getByText('Application submitted')).toBeInTheDocument();

    expect(screen.getByText('Current progress')).toBeInTheDocument();
    expect(
      screen.getByText('Submit application · Waiting: Waiting on buyer documents'),
    ).toBeInTheDocument();
    expect(screen.getByText('Responsible contact: Preview Manager')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Contact the responsible team/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View referral payout' })).not.toBeInTheDocument();

    expect(screen.getByText('Steps for this opportunity')).toBeInTheDocument();
    expect(screen.getByText('Submit application')).toBeInTheDocument();
    expect(screen.getByText('Required to continue')).toBeInTheDocument();
    expect(screen.getByText('Handled by: You')).toBeInTheDocument();
    expect(screen.getByText('Waiting on buyer documents')).toBeInTheDocument();

    expect(screen.getByText('Documents for this referral')).toBeInTheDocument();
    expect(screen.getByText('Developer sale agreement')).toBeInTheDocument();
    expect(screen.getByText('sale_agreement')).toBeInTheDocument();
    expect(screen.getByText('Needed')).toBeInTheDocument();
    expect(screen.getByText('Buyer ID document')).toBeInTheDocument();
    expect(screen.getByText('Verified by our team')).toBeInTheDocument();

    expect(screen.getByText('Timeline')).toBeInTheDocument();
    expect(screen.getByText('Deal progress updated')).toBeInTheDocument();
    expect(screen.getByText('Moved to application review.')).toBeInTheDocument();
  });

  it('shows an honest error state when the referral cannot be loaded', () => {
    mockGetReferral.mockReturnValue({
      isLoading: false,
      error: new Error('Referral deal not found in your referral scope.'),
      refetch: vi.fn(),
      data: undefined,
    });

    render(<PartnerReferralDetailPage />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Referral deal not found in your referral scope.',
    );
  });
});
