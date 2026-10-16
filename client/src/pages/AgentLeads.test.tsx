import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  won: [],
  closed: [],
  lost: [],
};

function makeLead(status: string, id: number) {
  return {
    id,
    name: `Walkthrough lead ${id}`,
    email: `walkthrough-${id}@example.test`,
    phone: '+27820000000',
    status,
    source: 'property_detail',
    consent: { capturedAt: null, version: null, source: null },
    delivery: { status: 'delivered', attempts: [], lastAttemptAt: null, lastError: null },
    notes: null,
    createdAt: new Date(),
    property: { id: 996101, title: 'Sample Sandton home', city: 'Sandton', price: 4850000 },
  };
}

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
    expect(screen.getByText(/Continue working leads already assigned to you/i)).toBeInTheDocument();
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

  it('includes Won and Lost in the shared funnel and excludes terminal outcomes from active leads', async () => {
    setOnboardingStatus(true, true);
    getLeadsPipelineQueryMock.mockReturnValue({
      data: {
        ...emptyPipeline,
        new: [makeLead('new', 1)],
        won: [makeLead('converted', 2)],
        lost: [makeLead('lost', 3)],
      },
      isLoading: false,
    });

    render(<AgentLeads />);

    expect(screen.getByText('Active Leads').nextElementSibling).toHaveTextContent('1');

    await userEvent.setup().click(screen.getByRole('tab', { name: /insights/i }));

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Won')).toBeInTheDocument();
    expect(screen.getByText('Lost')).toBeInTheDocument();
  });

  it('reports outreach attempts separately from two-way connections', async () => {
    setOnboardingStatus(true, true);
    getLeadResponseSummaryQueryMock.mockReturnValue({
      data: {
        windowDays: 30,
        totalLeads: 4,
        outreachAttemptedLeads: 3,
        awaitingFirstOutreach: 1,
        medianHoursToFirstOutreach: 0.5,
        connectedLeads: 1,
        awaitingTwoWayConnection: 3,
        medianHoursToConnection: 2,
      },
      isLoading: false,
    });

    render(<AgentLeads />);
    await userEvent.setup().click(screen.getByRole('tab', { name: /insights/i }));

    expect(screen.getByText('First outreach logged')).toBeInTheDocument();
    expect(screen.getByText('Two-way connections')).toBeInTheDocument();
    expect(screen.getByText('1 awaiting first outreach')).toBeInTheDocument();
    expect(screen.getByText('3 awaiting connection')).toBeInTheDocument();
    expect(screen.getByText(/An outreach attempt includes calls or messages logged without a reply/)).toBeInTheDocument();
  });
});
