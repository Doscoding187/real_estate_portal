import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const leadsInputs: Array<Record<string, unknown>> = [];
const dashboardData = {
  windowDays: 30,
  totalLeads: 6,
  activePipeline: 3,
  conversionRate: 40,
  byStatus: { new: 2, accepted: 1, quoted: 1, won: 2, lost: 0, expired: 0 },
  bySource: { directory: 4, journey_injection: 2 },
};
const responseFixtures = {
  ready: {
    windowDays: 90,
    measuredLeads: 5,
    medianResponseSeconds: 7200,
    sampleReady: true,
  },
  lowSample: {
    windowDays: 90,
    measuredLeads: 1,
    medianResponseSeconds: 3600,
    sampleReady: false,
  },
  none: {
    windowDays: 90,
    measuredLeads: 0,
    medianResponseSeconds: 0,
    sampleReady: false,
  },
};
let responseFixture = responseFixtures.ready;
let leadsFixture: Array<Record<string, unknown>> = [
  {
    id: 11,
    serviceCategory: 'moving',
    serviceCode: 'home_move',
    requesterName: 'Amina Nkosi',
    requesterEmail: 'amina@example.com',
    requesterPhone: null,
    geoSuburb: 'Sandton',
    geoCity: 'Johannesburg',
    geoProvince: 'Gauteng',
    notes: 'Two-bedroom move.',
    propertyId: 7,
    listingId: 8,
    developmentId: 9,
    status: 'quoted',
    createdAt: '2026-10-20 09:00:00',
  },
];

vi.mock('@/lib/trpc', () => ({
  trpc: {
    servicesEngine: {
      myProviderDashboard: {
        useQuery: () => ({ data: dashboardData, isLoading: false, error: null }),
      },
      myProviderResponsePerformance: {
        useQuery: () => ({ data: responseFixture, isLoading: false, error: null }),
      },
      myProviderLeads: {
        useQuery: (input: Record<string, unknown>) => {
          leadsInputs.push(input);
          return { data: leadsFixture, isLoading: false, error: null, refetch: vi.fn() };
        },
      },
      updateMyLeadStatus: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
          onSuccess: undefined,
          onError: undefined,
        }),
      },
    },
  },
}));

vi.mock('@/_core/hooks/useAuth', () => ({ useAuth: () => ({}) }));

vi.mock('@/hooks/useServiceProviderOnboardingStatus', () => ({
  useServiceProviderOnboardingStatus: () => ({
    status: {
      dashboardUnlocked: true,
      fullFeaturesUnlocked: true,
      profileConfigured: true,
      servicesConfigured: true,
      locationsConfigured: true,
      provider: { isPublished: true },
    },
    isLoading: false,
  }),
}));

vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    useLocation: () => ['/service/dashboard', vi.fn()],
  };
});

vi.mock('@/components/services/ProNavigation', () => ({ ProNavigation: () => null }));

vi.mock('@/lib/seo', () => ({ applySeo: vi.fn() }));

import ProDashboardPage from '../ProDashboardPage';

describe('ProDashboardPage workspace upgrades', () => {
  beforeEach(() => {
    leadsInputs.length = 0;
    leadsFixture = [
      {
        id: 11,
        serviceCategory: 'moving',
        serviceCode: 'home_move',
        requesterName: 'Amina Nkosi',
        status: 'quoted',
        createdAt: '2026-10-20 09:00:00',
      },
    ];
    responseFixture = responseFixtures.ready;
  });

  afterEach(() => {
    cleanup();
  });

  it('surfaces the measured request mix over the dashboard window', () => {
    render(<ProDashboardPage />);

    expect(screen.getByText(/new 2/i)).toBeInTheDocument();
    expect(screen.getByText(/won 2/i)).toBeInTheDocument();
    expect(screen.getByText(/directory requests 4/i)).toBeInTheDocument();
    expect(screen.getByText(/property journey requests 2/i)).toBeInTheDocument();
    expect(screen.getByText(/request mix · last 30 days/i)).toBeInTheDocument();
  });

  it('reports the provider-first response median with its measured basis', () => {
    render(<ProDashboardPage />);

    expect(screen.getByText(/within 2 hours/i)).toBeInTheDocument();
    expect(screen.getByText(/median across 5 requests, last 90 days/i)).toBeInTheDocument();
    expect(screen.queryByText(/fewer than 3 measured responses/i)).not.toBeInTheDocument();
  });

  it('flags when the sample is too small for a public claim but stays honest with the provider', () => {
    responseFixture = responseFixtures.lowSample;
    render(<ProDashboardPage />);

    expect(screen.getByText(/within 60 minutes/i)).toBeInTheDocument();
    expect(screen.getByText(/fewer than 3 measured responses/i)).toBeInTheDocument();
  });

  it('states honestly when nothing is measured yet', () => {
    responseFixture = responseFixtures.none;
    render(<ProDashboardPage />);

    expect(screen.getByText(/not measured yet/i)).toBeInTheDocument();
  });

  it('filters the inbox through the canonical status vocabulary', () => {
    render(<ProDashboardPage />);

    fireEvent.click(screen.getByRole('button', { name: /^quoted$/i }));

    expect(leadsInputs.at(-1)).toMatchObject({ status: 'quoted' });
    expect(leadsInputs.at(-2)?.status).toBeUndefined();
  });

  it('keeps the unfiltered inbox when All is selected', () => {
    render(<ProDashboardPage />);

    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));

    expect(leadsInputs.at(-1)).toMatchObject({ limit: 50 });
    expect(leadsInputs.at(-1)?.status).toBeUndefined();
  });

  it('states the filtered empty result instead of the unfiltered empty copy', async () => {
    leadsFixture = [];
    render(<ProDashboardPage />);

    fireEvent.click(screen.getByRole('button', { name: /^quoted$/i }));

    expect(await screen.findByText(/no quoted requests yet/i)).toBeInTheDocument();
  });
});
