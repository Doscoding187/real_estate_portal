import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { homeQueryMock, refetchMock, setLocationMock, routeParamsMock } = vi.hoisted(() => ({
  homeQueryMock: vi.fn(),
  refetchMock: vi.fn(),
  setLocationMock: vi.fn(),
  routeParamsMock: { developmentId: '42' },
}));

vi.mock('wouter', () => ({
  Link: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
  useLocation: () => ['/developer/developments/42', setLocationMock],
  useRoute: () => [true, routeParamsMock],
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    developer: {
      getDevelopmentHome: {
        useQuery: homeQueryMock,
      },
    },
  },
}));

import DevelopmentHome from './DevelopmentHome';

function homeData(overrides: Record<string, unknown> = {}) {
  const readiness = {
    state: 'live',
    blockers: [],
    latestReview: null,
    recentReviewHistory: [],
  };

  return {
    development: {
      id: 42,
      name: 'Harbour Heights',
      slug: 'harbour-heights',
      location: { address: null, suburb: 'Sea Point', city: 'Cape Town', province: 'Western Cape' },
      transactionType: 'for_sale',
      approvalStatus: 'approved',
      isPublished: true,
      publishedAt: new Date('2026-01-01'),
      publicEligible: true,
      lifecycleState: 'live',
      ...overrides,
    },
    readiness,
    demand: {
      range: '30d',
      capturedLeadCount: 3,
      newLeadCount: 1,
      recentLeads: [
        {
          id: 501,
          name: 'Ayesha Patel',
          source: 'development_detail',
          createdAt: '2026-01-04T10:00:00.000Z',
          stage: 'new',
        },
      ],
      sources: [{ channel: 'development_detail', count: 3 }],
    },
    funnel: {
      stages: {
        new: 1,
        contacted: 1,
        qualified: 0,
        viewing: 0,
        offer: 0,
        dealInProgress: 0,
        closedWon: 1,
        closedLost: 0,
      },
      openLeadCount: 2,
      closedWonCount: 1,
      slaWarningCount: 1,
      slaBreachCount: 0,
    },
    inventory: {
      catalogueState: 'configured',
      activeUnitTypeCount: 2,
      totalUnits: 10,
      availableUnits: 4,
      reservedUnits: 2,
      derivedSoldUnits: 4,
      auctionTermsConfiguredCount: 0,
      pricing: { kind: 'sale', from: 1200000, to: 1800000 },
      warnings: [],
    },
    attention: {
      totalCount: 0,
      items: [],
    },
    distribution: {
      status: 'not_configured',
      eligiblePartnerCount: null,
      manageHref: null,
    },
    range: '30d',
  };
}

describe('DevelopmentHome Slice 2 Market Readiness', () => {
  beforeEach(() => {
    routeParamsMock.developmentId = '42';
    homeQueryMock.mockReturnValue({
      data: homeData(),
      error: null,
      isLoading: false,
      refetch: refetchMock,
    });
  });

  it('renders owned development identity and only supported actions', () => {
    render(<DevelopmentHome />);

    expect(screen.getByRole('heading', { name: 'Development Home' })).toBeInTheDocument();
    expect(screen.getByText('Harbour Heights')).toBeInTheDocument();
    expect(screen.getByText('Sea Point, Cape Town, Western Cape')).toBeInTheDocument();
    expect(screen.getAllByText('Live').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Edit development' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Open leads' })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'View public page' })).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Market Readiness' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Aggregate Inventory' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit development' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Open leads' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'View public page' })[0]);

    expect(setLocationMock).toHaveBeenNthCalledWith(1, '/developer/create-development?id=42');
    expect(setLocationMock).toHaveBeenNthCalledWith(
      2,
      '/developer/leads?developmentId=42&range=30d',
    );
    expect(setLocationMock).toHaveBeenNthCalledWith(3, '/development/harbour-heights');
  });

  it('renders aggregate-only catalogue data, warnings, empty and zero-availability states', () => {
    render(<DevelopmentHome />);
    expect(screen.getByText('Active unit types')).toBeInTheDocument();
    expect(screen.getByText('Aggregate available')).toBeInTheDocument();
    expect(screen.getByText('Derived aggregate sold')).toBeInTheDocument();
    expect(screen.getByText(/Sale pricing:/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit catalogue' })).toBeInTheDocument();
    expect(
      screen.queryByText(/individual unit|sales completed|reservation holder/i),
    ).not.toBeInTheDocument();

    homeQueryMock.mockReturnValue({
      data: {
        ...homeData(),
        inventory: {
          catalogueState: 'not_configured',
          activeUnitTypeCount: 0,
          totalUnits: null,
          availableUnits: null,
          reservedUnits: null,
          derivedSoldUnits: null,
          auctionTermsConfiguredCount: 0,
          pricing: { kind: 'unavailable', from: null, to: null },
          warnings: [
            { code: 'no_active_unit_types', message: 'Aggregate catalogue not configured.' },
          ],
        },
      },
      error: null,
      isLoading: false,
      refetch: refetchMock,
    });
    const { rerender } = render(<DevelopmentHome />);
    expect(screen.getAllByText('Aggregate catalogue not configured.').length).toBeGreaterThan(0);

    homeQueryMock.mockReturnValue({
      data: {
        ...homeData(),
        inventory: {
          ...homeData().inventory,
          availableUnits: 0,
          warnings: [
            {
              code: 'zero_aggregate_availability',
              message: '0 aggregate units are marked available.',
            },
          ],
        },
      },
      error: null,
      isLoading: false,
      refetch: refetchMock,
    });
    rerender(<DevelopmentHome />);
    expect(screen.getAllByText('0 aggregate units are marked available.').length).toBeGreaterThan(
      0,
    );
  });

  it('shows per-unit-type auction configuration without inventing an auction window or reserve', () => {
    homeQueryMock.mockReturnValue({
      data: {
        ...homeData({ transactionType: 'auction' }),
        inventory: {
          ...homeData().inventory,
          auctionTermsConfiguredCount: 1,
          pricing: { kind: 'auction', from: 1000000, to: 1500000 },
        },
      },
      error: null,
      isLoading: false,
      refetch: refetchMock,
    });
    render(<DevelopmentHome />);
    expect(
      screen.getByText('Auction terms are configured for 1 of 2 active unit types.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Starting bids:/)).toBeInTheDocument();
    expect(screen.queryByText(/Auction dates|Reserve from/i)).not.toBeInTheDocument();
  });

  it('does not offer a public link unless the development is publicly eligible', () => {
    homeQueryMock.mockReturnValue({
      data: {
        ...homeData({
          isPublished: false,
          publicEligible: false,
          lifecycleState: 'approved_private',
        }),
        readiness: {
          state: 'approved_private',
          blockers: [],
          latestReview: null,
          recentReviewHistory: [],
        },
      },
      error: null,
      isLoading: false,
      refetch: refetchMock,
    });

    render(<DevelopmentHome />);

    expect(screen.getAllByText('Approved — private').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'View public page' })).not.toBeInTheDocument();
  });

  it('shows the current pending lifecycle state', () => {
    homeQueryMock.mockReturnValue({
      data: {
        ...homeData({
          approvalStatus: 'pending',
          isPublished: false,
          publicEligible: false,
          lifecycleState: 'in_review',
        }),
        readiness: {
          state: 'in_review',
          blockers: [],
          latestReview: {
            status: 'pending',
            submittedAt: '2026-01-01T10:00:00.000Z',
            reviewedAt: null,
            feedback: null,
          },
          recentReviewHistory: [],
        },
      },
      error: null,
      isLoading: false,
      refetch: refetchMock,
    });

    render(<DevelopmentHome />);

    expect(screen.getAllByText('In review').length).toBeGreaterThan(0);
    expect(screen.getByText('Awaiting review')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit|resubmit/i })).not.toBeInTheDocument();
  });

  it.each([
    ['live', 'Live'],
    ['approved_private', 'Approved — private'],
    ['in_review', 'In review'],
    ['changes_required', 'Changes required'],
    ['rejected', 'Rejected'],
    ['draft_ready_to_submit', 'Draft — ready to submit'],
    ['draft_action_required', 'Draft — action required'],
  ])('renders the %s Market Readiness label', (state, label) => {
    homeQueryMock.mockReturnValue({
      data: {
        ...homeData({ lifecycleState: state }),
        readiness: { state, blockers: [], latestReview: null, recentReviewHistory: [] },
      },
      error: null,
      isLoading: false,
      refetch: refetchMock,
    });

    render(<DevelopmentHome />);

    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  });

  it('renders current feedback, exact blockers, and only three review events', () => {
    homeQueryMock.mockReturnValue({
      data: {
        ...homeData({
          approvalStatus: 'draft',
          isPublished: false,
          publicEligible: false,
          lifecycleState: 'changes_required',
        }),
        readiness: {
          state: 'changes_required',
          blockers: [
            {
              field: 'description',
              message: 'Description must contain at least 50 characters.',
              severity: 'critical',
            },
          ],
          latestReview: {
            status: 'changes_requested',
            submittedAt: '2026-01-04T10:00:00.000Z',
            reviewedAt: '2026-01-05T10:00:00.000Z',
            feedback: 'Please provide updated pricing.',
          },
          recentReviewHistory: [
            {
              status: 'changes_requested',
              submittedAt: '2026-01-04T10:00:00.000Z',
              reviewedAt: '2026-01-05T10:00:00.000Z',
              feedback: 'Please provide updated pricing.',
            },
            {
              status: 'pending',
              submittedAt: '2026-01-02T10:00:00.000Z',
              reviewedAt: null,
              feedback: null,
            },
            {
              status: 'approved',
              submittedAt: '2025-12-01T10:00:00.000Z',
              reviewedAt: '2025-12-02T10:00:00.000Z',
              feedback: null,
            },
            {
              status: 'rejected',
              submittedAt: '2025-11-01T10:00:00.000Z',
              reviewedAt: '2025-11-02T10:00:00.000Z',
              feedback: 'Older event',
            },
          ],
        },
      },
      error: null,
      isLoading: false,
      refetch: refetchMock,
    });

    render(<DevelopmentHome />);

    expect(screen.getAllByText('Please provide updated pricing.').length).toBeGreaterThan(0);
    expect(
      screen.getByText('Description must contain at least 50 characters.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Recent review events').parentElement?.querySelectorAll('li'),
    ).toHaveLength(3);
    expect(screen.queryByText('Older event')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open editor' })).toBeInTheDocument();
  });

  it('does not promise approval for a submit-ready draft or invent a republish action', () => {
    homeQueryMock.mockReturnValue({
      data: {
        ...homeData({
          approvalStatus: 'draft',
          isPublished: false,
          publicEligible: false,
          lifecycleState: 'draft_ready_to_submit',
        }),
        readiness: {
          state: 'draft_ready_to_submit',
          blockers: [],
          latestReview: null,
          recentReviewHistory: [],
        },
      },
      error: null,
      isLoading: false,
      refetch: refetchMock,
    });

    render(<DevelopmentHome />);

    expect(screen.getByText(/submission remains subject to review/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open editor to submit' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /republish|publish now/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/readiness score|% ready/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Recent Activity')).not.toBeInTheDocument();
  });

  it('renders bounded server-ordered attention items with existing specialist actions', () => {
    homeQueryMock.mockReturnValue({
      data: {
        ...homeData(),
        attention: {
          totalCount: 6,
          items: [
            {
              type: 'review_rejected',
              severity: 'critical',
              explanation: 'This development is currently rejected.',
              actionLabel: 'Open editor',
              href: '/developer/create-development?id=42',
            },
            {
              type: 'lead_sla_breach',
              severity: 'critical',
              explanation: '1 Listify-captured lead SLA breach in the selected period.',
              actionLabel: 'Work SLA breaches',
              href: '/developer/leads?developmentId=42&range=30d&view=attention&sla=breach',
            },
            {
              type: 'zero_aggregate_availability',
              severity: 'warning',
              explanation: '0 aggregate units are marked available.',
              actionLabel: 'Review catalogue',
              href: '/developer/create-development?id=42',
            },
          ],
        },
      },
      error: null,
      isLoading: false,
      refetch: refetchMock,
    });

    render(<DevelopmentHome />);

    expect(screen.getByRole('heading', { name: 'Requires Attention' })).toBeInTheDocument();
    expect(screen.getAllByText('Critical')).toHaveLength(2);
    expect(screen.getByText('0 aggregate units are marked available.')).toBeInTheDocument();
    expect(screen.getByLabelText('Requires Attention items').querySelectorAll('li')).toHaveLength(
      3,
    );
    expect(
      screen.queryByText(/view all|recent activity|notifications|tasks/i),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Work SLA breaches' }));
    expect(setLocationMock).toHaveBeenCalledWith(
      '/developer/leads?developmentId=42&range=30d&view=attention&sla=breach',
    );
  });

  it('renders the exact clean attention state and truthful compact distribution states', () => {
    render(<DevelopmentHome />);

    expect(screen.getByText('Nothing requires attention right now.')).toBeInTheDocument();
    expect(screen.getByText('Referral distribution not configured')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Manage distribution' })).not.toBeInTheDocument();
    expect(
      screen.queryByText(/partner-ready|distribution health|coverage|campaign/i),
    ).not.toBeInTheDocument();

    homeQueryMock.mockReturnValue({
      data: {
        ...homeData(),
        distribution: { status: 'enabled', eligiblePartnerCount: 3, manageHref: null },
      },
      error: null,
      isLoading: false,
      refetch: refetchMock,
    });
    const { rerender } = render(<DevelopmentHome />);
    expect(
      screen.getByText('Referral distribution enabled — 3 eligible partners'),
    ).toBeInTheDocument();

    homeQueryMock.mockReturnValue({
      data: {
        ...homeData(),
        distribution: { status: 'disabled', eligiblePartnerCount: null, manageHref: null },
      },
      error: null,
      isLoading: false,
      refetch: refetchMock,
    });
    rerender(<DevelopmentHome />);
    expect(screen.getByText('Referral distribution disabled')).toBeInTheDocument();

    homeQueryMock.mockReturnValue({
      data: {
        ...homeData(),
        distribution: { status: 'enabled', eligiblePartnerCount: null, manageHref: null },
      },
      error: null,
      isLoading: false,
      refetch: refetchMock,
    });
    rerender(<DevelopmentHome />);
    expect(screen.getByText('Referral distribution enabled')).toBeInTheDocument();
    expect(screen.queryByText(/eligible partners/)).not.toBeInTheDocument();
  });

  it('shows only selected-period captured demand and routes funnel drill-downs to the CRM', () => {
    render(<DevelopmentHome />);

    expect(screen.getByText('Captured leads — last 30 days')).toBeInTheDocument();
    expect(screen.getByText('New leads — last 30 days')).toBeInTheDocument();
    expect(screen.getByText('Captured channels')).toBeInTheDocument();
    expect(screen.getByText('Ayesha Patel')).toBeInTheDocument();
    expect(screen.getByText(/selected-period listify-captured leads/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/total demand|total pipeline|market demand/i),
    ).not.toBeInTheDocument();

    const closedWonButton = screen.getAllByText('Closed won')[0].closest('button');
    const slaWarningButton = screen
      .getByText('SLA warnings')
      .parentElement?.querySelector('button');
    expect(closedWonButton).not.toBeNull();
    expect(slaWarningButton).not.toBeNull();
    if (!closedWonButton || !slaWarningButton)
      throw new Error('Expected funnel CRM drill-down buttons.');

    fireEvent.click(closedWonButton);
    fireEvent.click(slaWarningButton);

    expect(setLocationMock).toHaveBeenNthCalledWith(
      1,
      '/developer/leads?developmentId=42&range=30d&stage=won',
    );
    expect(setLocationMock).toHaveBeenNthCalledWith(
      2,
      '/developer/leads?developmentId=42&range=30d&view=attention&sla=warning',
    );
  });

  it('shows Unknown source without creating an unsupported CRM source filter', () => {
    const data = homeData();
    data.demand.sources = [
      { channel: 'Unknown source', count: 2 },
      { channel: 'development_detail', count: 1 },
    ];
    homeQueryMock.mockReturnValue({ data, error: null, isLoading: false, refetch: refetchMock });

    render(<DevelopmentHome />);

    expect(screen.getByText('Unknown source · 2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Unknown source/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'development_detail · 1' }));
    expect(setLocationMock).toHaveBeenCalledWith(
      '/developer/leads?developmentId=42&range=30d&source=development_detail',
    );
  });

  it('renders distinct loading, private not-found, and operational-error states', () => {
    homeQueryMock.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
      refetch: refetchMock,
    });
    const { rerender } = render(<DevelopmentHome />);
    expect(screen.getByLabelText('Loading Development Home')).toBeInTheDocument();

    homeQueryMock.mockReturnValue({
      data: undefined,
      error: { data: { code: 'NOT_FOUND' } },
      isLoading: false,
      refetch: refetchMock,
    });
    rerender(<DevelopmentHome />);
    expect(screen.getByRole('heading', { name: 'Development not found' })).toBeInTheDocument();
    expect(screen.queryByText('Harbour Heights')).not.toBeInTheDocument();

    homeQueryMock.mockReturnValue({
      data: undefined,
      error: new Error('Database unavailable'),
      isLoading: false,
      refetch: refetchMock,
    });
    rerender(<DevelopmentHome />);
    expect(
      screen.getByRole('heading', { name: 'Unable to load Development Home' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetchMock).toHaveBeenCalledOnce();
  });
});
