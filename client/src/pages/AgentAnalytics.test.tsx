import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getListingsQueryMock,
  getPerformanceQueryMock,
  getPipelineQueryMock,
  recordSurfaceViewMutateMock,
  setLocationMock,
  useOnboardingStatusMock,
} = vi.hoisted(() => ({
  getListingsQueryMock: vi.fn(),
  getPerformanceQueryMock: vi.fn(),
  getPipelineQueryMock: vi.fn(),
  recordSurfaceViewMutateMock: vi.fn(),
  setLocationMock: vi.fn(),
  useOnboardingStatusMock: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/agent/analytics', setLocationMock],
}));

vi.mock('@/components/agent/AgentAppShell', () => ({
  AgentAppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/hooks/useAgentOnboardingStatus', () => ({
  useAgentOnboardingStatus: (...args: unknown[]) => useOnboardingStatusMock(...args),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    agent: {
      getPerformanceAnalytics: {
        useQuery: (...args: unknown[]) => getPerformanceQueryMock(...args),
      },
      getLeadsPipeline: {
        useQuery: (...args: unknown[]) => getPipelineQueryMock(...args),
      },
      getMyListings: {
        useQuery: (...args: unknown[]) => getListingsQueryMock(...args),
      },
      recordSurfaceView: {
        useMutation: () => ({ mutate: recordSurfaceViewMutateMock }),
      },
    },
  },
}));

import AgentAnalytics from './AgentAnalytics';

const pipeline = {
  new: [],
  contacted: [],
  viewing: [],
  offer: [],
  closed: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  useOnboardingStatusMock.mockReturnValue({
    status: {
      fullFeaturesUnlocked: true,
      recommendedNextStep: 'dashboard',
      subscriptionStatus: 'active',
    },
    isLoading: false,
  });
  getPerformanceQueryMock.mockReturnValue({
    data: {
      totalLeads: 3,
      convertedLeads: 1,
      conversionRate: 33.3,
      propertiesClosed: 1,
      leadsContacted: 2,
    },
    isLoading: false,
  });
  getPipelineQueryMock.mockReturnValue({ data: pipeline, isLoading: false });
  getListingsQueryMock.mockReturnValue({
    data: [
      {
        id: 1,
        title: 'Rosebank apartment',
        city: 'Johannesburg',
        price: 1900000,
        status: 'active',
        propertyType: 'apartment',
        views: 120,
        enquiries: 4,
      },
    ],
    isLoading: false,
  });
});

afterEach(() => cleanup());

describe('AgentAnalytics', () => {
  it('keeps selected-period leads separate from cumulative current-inventory engagement', () => {
    render(<AgentAnalytics />);

    expect(screen.getByText(/Lead activity for 30 Days/i)).toBeInTheDocument();
    expect(screen.getByText('Current Listing Views')).toBeInTheDocument();
    expect(screen.getByText(/Cumulative across 1 live listing/i)).toBeInTheDocument();
    expect(screen.getByText('Lead Cohort Conversion')).toBeInTheDocument();
    expect(screen.getByText('Properties Closed')).toBeInTheDocument();
    expect(
      screen.getByText(/Views and enquiries are cumulative for the live listings shown/i),
    ).toBeInTheDocument();
  });

  it('moves performance and pipeline data to the same selected lead period', async () => {
    render(<AgentAnalytics />);

    expect(getPerformanceQueryMock).toHaveBeenCalledWith(
      { period: 'month' },
      expect.objectContaining({ enabled: true }),
    );
    expect(getPipelineQueryMock).toHaveBeenCalledWith(
      {
        filters: {
          dateRange: {
            start: expect.any(String),
          },
        },
      },
      expect.objectContaining({ enabled: true }),
    );

    fireEvent.click(screen.getByRole('button', { name: '7 Days' }));

    await waitFor(() => {
      expect(getPerformanceQueryMock).toHaveBeenLastCalledWith(
        { period: 'week' },
        expect.objectContaining({ enabled: true }),
      );
      expect(getPipelineQueryMock).toHaveBeenLastCalledWith(
        {
          filters: {
            dateRange: {
              start: expect.any(String),
            },
          },
        },
        expect.objectContaining({ enabled: true }),
      );
    });
  });
});
