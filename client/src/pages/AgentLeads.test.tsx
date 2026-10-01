import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getDashboardStatsQueryMock,
  getLeadResponseSummaryQueryMock,
  getLeadsPipelineQueryMock,
  getNotificationsQueryMock,
  setLocationMock,
  useOnboardingStatusMock,
} = vi.hoisted(() => ({
  getDashboardStatsQueryMock: vi.fn(),
  getLeadResponseSummaryQueryMock: vi.fn(),
  getLeadsPipelineQueryMock: vi.fn(),
  getNotificationsQueryMock: vi.fn(),
  setLocationMock: vi.fn(),
  useOnboardingStatusMock: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/agent/leads', setLocationMock],
}));

vi.mock('@/components/agent/AgentAppShell', () => ({
  AgentAppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/agent/LeadPipeline', () => ({
  LeadPipeline: () => <div>Lead pipeline</div>,
}));

vi.mock('@/hooks/useAgentOnboardingStatus', () => ({
  useAgentOnboardingStatus: (...args: unknown[]) => useOnboardingStatusMock(...args),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    agent: {
      getLeadResponseSummary: {
        useQuery: (...args: unknown[]) => getLeadResponseSummaryQueryMock(...args),
      },
      getDashboardStats: {
        useQuery: (...args: unknown[]) => getDashboardStatsQueryMock(...args),
      },
      getLeadsPipeline: {
        useQuery: (...args: unknown[]) => getLeadsPipelineQueryMock(...args),
      },
      getNotifications: {
        useQuery: (...args: unknown[]) => getNotificationsQueryMock(...args),
      },
    },
  },
}));

import AgentLeads from './AgentLeads';

const emptyPipeline = {
  new: [],
  contacted: [],
  viewing: [],
  offer: [],
  closed: [],
};

function setOnboardingStatus(canAccessExistingLeads: boolean, canReceiveLeads: boolean) {
  useOnboardingStatusMock.mockReturnValue({
    status: {
      recommendedNextStep: 'await_agency_activation',
      entitlements: {
        canAccessExistingLeads,
        canReceiveLeads,
      },
    },
    isLoading: false,
    error: null,
    retry: vi.fn(),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getLeadResponseSummaryQueryMock.mockReturnValue({ data: undefined, isLoading: false });
  getDashboardStatsQueryMock.mockReturnValue({ data: undefined, isLoading: false });
  getLeadsPipelineQueryMock.mockReturnValue({ data: emptyPipeline, isLoading: false });
  getNotificationsQueryMock.mockReturnValue({ data: [], isLoading: false });
});

afterEach(() => cleanup());

describe('AgentLeads', () => {
  it('keeps the CRM available for existing custody when new enquiries are commercially paused', () => {
    setOnboardingStatus(true, false);

    render(<AgentLeads />);

    expect(screen.getByText('New marketplace enquiries are paused')).toBeInTheDocument();
    expect(
      screen.getByText(/Continue working leads already assigned to you/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Lead pipeline')).toBeInTheDocument();
    expect(getLeadsPipelineQueryMock).toHaveBeenCalledWith(
      { filters: { propertyId: undefined } },
      expect.objectContaining({ enabled: true }),
    );
  });

  it('keeps CRM queries locked when there is no current existing-custody authority', () => {
    setOnboardingStatus(false, false);

    render(<AgentLeads />);

    expect(screen.queryByText('Lead pipeline')).not.toBeInTheDocument();
    expect(screen.getByText('Your agency manages Launch Access')).toBeInTheDocument();
    expect(getLeadsPipelineQueryMock).toHaveBeenCalledWith(
      { filters: { propertyId: undefined } },
      expect.objectContaining({ enabled: false }),
    );
  });
});
