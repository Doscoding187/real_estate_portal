import { fireEvent, render, screen, within } from '@testing-library/react';
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

vi.mock('@/components/location/CanonicalPlaceSelector', () => ({
  CanonicalPlaceSelector: ({
    value,
    onChange,
    label,
  }: {
    value: { label: string } | null;
    onChange: (value: unknown) => void;
    label: string;
  }) => (
    <div>
      <span>{label}</span>
      <button
        type="button"
        aria-label={value ? 'Clear selected Place' : 'Select Johannesburg Place'}
        onClick={() =>
          onChange(
            value
              ? null
              : {
                  canonicalPlaceId: 'pl-place-01-000000000000000000000001',
                  label: 'Johannesburg',
                  placeType: 'city',
                  scope: 'metro_city',
                  administrativeContext: 'City of Johannesburg',
                },
          )
        }
      >
        {value?.label ?? 'Choose canonical Place'}
      </button>
      <button
        type="button"
        onClick={() =>
          onChange({
            canonicalPlaceId: 'city:12',
            label: 'Johannesburg',
            placeType: 'city',
            scope: 'metro_city',
            administrativeContext: 'City of Johannesburg',
          })
        }
      >
        Inject malformed Place
      </button>
    </div>
  ),
}));

vi.mock('@/components/distribution/partner/ProgramRequirementsDialog', () => ({
  ProgramRequirementsDialog: ({ open }: { open: boolean }) =>
    open ? <div>Referral process dialog</div> : null,
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

function buildItem(overrides: Record<string, unknown> = {}) {
  return {
    developmentId: 101,
    developmentName: 'Hillside Gardens',
    canonicalPlaceId: 'pl-place-01-000000000000000000000001',
    developmentFactsAvailable: true,
    locationLabels: ['Johannesburg'],
    description: 'Secure estate living close to schools and retail.',
    amenities: null,
    features: null,
    imageUrl: null,
    campaign: {
      name: 'Hillside Gardens',
      tagline: 'Secure estate living',
      description: 'Secure estate living close to schools and retail.',
      developmentType: 'residential',
      images: [],
    },
    inventory: {
      phaseScope: 'unscoped-hidden',
      modes: {
        sale: {
          availableCount: 4,
          priceFrom: 1000000,
          priceTo: 1500000,
          priceBasis: 'purchase_price',
        },
        rent: {
          availableCount: 2,
          priceFrom: 12000,
          priceTo: 15000,
          priceBasis: 'monthly_rent',
        },
      },
    },
    contacts: [],
    programPromotion: { headline: null, description: null, highlightBullets: [] },
    brand: null,
    program: {
      programId: 10,
      isActive: true,
      isReferralEnabled: true,
      submissionAllowed: true,
      tierAccessPolicy: 'restricted',
      commissionModel: 'flat_percentage',
      defaultCommissionPercent: 1,
      defaultCommissionAmount: 25000,
      referrerCommissionType: 'percentage',
      referrerCommissionValue: 1,
      referrerCommissionBasis: 'sale_price',
      currencyCode: 'ZAR',
      payoutMilestone: 'bond_approval',
      payoutMilestoneNotes: null,
    },
    unitTypes: [
      {
        id: 1,
        name: '2 Bed Apartment',
        description: null,
        bedrooms: 2,
        bathrooms: 1,
        size: 62,
        imageUrl: null,
        modes: {
          sale: {
            availableCount: 1,
            priceFrom: 1000000,
            priceTo: 1200000,
            priceBasis: 'purchase_price',
          },
          rent: null,
        },
      },
    ],
    affordability: {
      policyVersion: 'checkfit_v1',
      available: true,
      annualInterestRate: 10.5,
      rateSource: 'sarb_prime_rate',
      rateSourceLabel: 'SARB prime rate (platform settings)',
      rateUpdatedAt: null,
      termMonths: 240,
      repaymentAllowanceRatio: 0.3,
      disclaimers: [],
    },
    requiredDocuments: [],
    sourceDocuments: [],
    developerProjectionRevision: 'rev-1',
    developerProjectionObservedAt: '2026-10-01T08:00:00.000Z',
    computed: {
      commissionDisplay: '1% referral payout of sale price',
      payoutTriggerDisplay: 'Home finance approval',
      payoutTriggerNotes: null,
      requiredDocsSummary: 'No referral documents required',
    },
    opportunity: {
      status: 'ready',
      distributionActive: true,
      partnerEntitled: true,
      campaignVisibility: 'visible',
      openForReferral: true,
      marketability: 'marketable',
      reasonCodes: [],
      nextAction: 'submit_referral',
      friendlyMessage: 'Ready for buyer referrals.',
    },
    ...overrides,
  };
}

const activeItem = buildItem();

const pausedItem = buildItem({
  developmentId: 202,
  developmentName: 'Ridge View Estate',
  canonicalPlaceId: 'pl-place-01-000000000000000000000002',
  locationLabels: ['Midrand'],
  imageUrl: null,
  campaign: {
    name: 'Ridge View Estate',
    tagline: 'Modern living in Midrand',
    description: 'Modern rentals and sales near the business district.',
    developmentType: 'residential',
    images: [],
  },
  inventory: {
    phaseScope: 'unscoped-hidden',
    modes: {},
  },
  unitTypes: [],
  opportunity: {
    status: 'watchlist',
    distributionActive: true,
    partnerEntitled: true,
    campaignVisibility: 'visible',
    openForReferral: false,
    marketability: 'not_marketable',
    reasonCodes: ['submission_paused'],
    nextAction: 'contact_partner_manager',
    friendlyMessage: 'Referrals are paused while the developer updates its availability.',
  },
});

function cardFor(name: string) {
  const heading = screen.getByRole('heading', { name });
  const card = heading.closest('article');
  if (!card) throw new Error(`No card found for ${name}`);
  return within(card);
}

describe('PartnerDevelopmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, loading: false, user: { id: 7 } });
    mockUseLocation.mockReturnValue(['/distribution/partner/developments', mockSetLocation]);
    mockListProgramTermsQuery.mockReturnValue({
      isLoading: false,
      error: null,
      data: { items: [activeItem, pausedItem] },
    });
  });

  it('renders honest development cards with separate availability and referral states', () => {
    render(<PartnerDevelopmentsPage />);

    expect(screen.getByText('Find the right property for someone you know')).toBeInTheDocument();
    expect(screen.getByText('Showing 2 opportunities')).toBeInTheDocument();

    const activeCard = cardFor('Hillside Gardens');
    expect(activeCard.getByText('Available to explore')).toBeInTheDocument();
    expect(activeCard.getByText('4 homes available')).toBeInTheDocument();
    expect(activeCard.getByText(/R 1M – R 1,5M/)).toBeInTheDocument();
    expect(activeCard.getByText('Open for referral')).toBeInTheDocument();
    expect(activeCard.getByText(/Minimum qualifying income/)).toBeInTheDocument();
    expect(activeCard.getByText(/R\s?33\s279/)).toBeInTheDocument();
    expect(activeCard.getByRole('button', { name: /View details/ })).toBeInTheDocument();
    expect(activeCard.getByRole('button', { name: /Brochure/ })).toBeInTheDocument();
    expect(activeCard.queryByRole('button', { name: /shortlist/i })).not.toBeInTheDocument();

    const pausedCard = cardFor('Ridge View Estate');
    expect(pausedCard.getByText('Awaiting availability')).toBeInTheDocument();
    expect(pausedCard.getByText('Current price not yet published')).toBeInTheDocument();
    expect(pausedCard.getByText('Referral access: check programme')).toBeInTheDocument();
    expect(pausedCard.queryByText(/Minimum qualifying income/)).not.toBeInTheDocument();
  });

  it('filters by exact Place ID and keeps typed area text out of matching', () => {
    const mismatchedItem = buildItem({
      developmentId: 303,
      developmentName: 'Ridge View Estate',
      canonicalPlaceId: 'pl-place-01-000000000000000000000002',
      locationLabels: ['Johannesburg'],
    });
    const unassignedItem = buildItem({
      developmentId: 404,
      developmentName: 'Unassigned Homes',
      canonicalPlaceId: null,
    });
    const malformedItem = buildItem({
      developmentId: 505,
      developmentName: 'Malformed Homes',
      canonicalPlaceId: 'city:12',
    });
    mockListProgramTermsQuery.mockReturnValue({
      isLoading: false,
      error: null,
      data: { items: [activeItem, mismatchedItem, unassignedItem, malformedItem] },
    });

    render(<PartnerDevelopmentsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Select Johannesburg Place' }));

    expect(screen.getByRole('heading', { name: 'Hillside Gardens' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Ridge View Estate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Unassigned Homes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Malformed Homes' })).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1 opportunity')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear selected Place' }));
    fireEvent.change(screen.getByPlaceholderText('Search development names'), {
      target: { value: 'Johannesburg' },
    });
    expect(screen.getByText('Showing 0 opportunities')).toBeInTheDocument();
  });

  it('fails closed when the selected Place ID is malformed', () => {
    render(<PartnerDevelopmentsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Inject malformed Place' }));

    expect(screen.queryByRole('heading', { name: 'Hillside Gardens' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Ridge View Estate' })).not.toBeInTheDocument();
    expect(screen.getByText('Showing 0 opportunities')).toBeInTheDocument();
  });

  it('opens the units dialog with published units and starts a referral', () => {
    render(<PartnerDevelopmentsPage />);

    fireEvent.click(cardFor('Hillside Gardens').getByRole('button', { name: /View details/ }));

    expect(screen.getAllByText('Hillside Gardens')).not.toHaveLength(0);
    expect(screen.getByText('2 Bed Apartment')).toBeInTheDocument();
    expect(screen.getByText('2 beds · 1 bath · 62 m²')).toBeInTheDocument();
    expect(screen.getByText(/R1\s000\s000 – R1\s200\s000/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Start a referral/ }));

    expect(mockSetLocation).toHaveBeenCalledWith(
      '/distribution/partner/submit?developmentId=101&marketMode=sale',
    );
  });

  it('shows an honest units state and a disabled referral action for unavailable developments', () => {
    render(<PartnerDevelopmentsPage />);

    fireEvent.click(cardFor('Ridge View Estate').getByRole('button', { name: /View details/ }));

    expect(
      screen.getByText(
        'The developer has not published current sale availability for this development yet.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'The developer has not published unit-level details for this development yet.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start a referral/ })).toBeDisabled();
  });

  it('filters by bedrooms without discarding unknown availability', () => {
    render(<PartnerDevelopmentsPage />);

    fireEvent.change(screen.getByLabelText('Bedrooms'), { target: { value: '3' } });

    expect(screen.queryByRole('heading', { name: 'Hillside Gardens' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ridge View Estate' })).toBeInTheDocument();
    expect(screen.getByText('Showing 1 opportunity')).toBeInTheDocument();
  });

  it('hides the minimum qualifying income when the affordability rate is unavailable', () => {
    mockListProgramTermsQuery.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        items: [
          buildItem({
            affordability: {
              policyVersion: 'checkfit_v1',
              available: false,
              annualInterestRate: null,
              rateSource: 'sarb_prime_rate',
              rateSourceLabel: 'SARB prime rate (platform settings)',
              rateUpdatedAt: null,
              termMonths: 240,
              repaymentAllowanceRatio: 0.3,
              disclaimers: [],
            },
          }),
        ],
      },
    });

    render(<PartnerDevelopmentsPage />);

    expect(screen.queryByText(/Minimum qualifying income/)).not.toBeInTheDocument();
    expect(cardFor('Hillside Gardens').getByText(/R 1M – R 1,5M/)).toBeInTheDocument();
  });

  it('removes the shortlist workflow from the partner developments page', () => {
    render(<PartnerDevelopmentsPage />);

    expect(screen.queryByText(/Your shortlist/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /shortlist/i })).not.toBeInTheDocument();
  });

  it('sends the referrer to the live check fit instead of a disabled panel', () => {
    render(<PartnerDevelopmentsPage />);

    expect(screen.queryByLabelText('Monthly income')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'I have a prospect' })).toBeInTheDocument();
    expect(screen.getByText(/gross monthly income only/)).toBeInTheDocument();
  });
});
