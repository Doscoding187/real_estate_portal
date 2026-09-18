import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getFollowUpsQueryMock,
  getPipelineQueryMock,
  getStatsQueryMock,
  setShowingsQueryMock,
  getNotificationsQueryMock,
  myListingsQueryMock,
  setLocationMock,
  useOnboardingStatusMock,
} = vi.hoisted(() => ({
  getFollowUpsQueryMock: vi.fn(),
  getPipelineQueryMock: vi.fn(),
  getStatsQueryMock: vi.fn(),
  setShowingsQueryMock: vi.fn(),
  getNotificationsQueryMock: vi.fn(),
  myListingsQueryMock: vi.fn(),
  setLocationMock: vi.fn(),
  useOnboardingStatusMock: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/agent/dashboard', setLocationMock],
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({ user: { name: 'Test Agent', role: 'agent' } }),
}));

vi.mock('@/hooks/useAgentOnboardingStatus', () => ({
  useAgentOnboardingStatus: (...args: unknown[]) => useOnboardingStatusMock(...args),
}));

vi.mock('@/components/agent/AgentPresenceProof', () => ({
  AgentPresenceProof: () => <div>Presence proof</div>,
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    agent: {
      recordSurfaceView: { useMutation: () => ({ mutate: vi.fn() }) },
      getDashboardStats: { useQuery: (...args: unknown[]) => getStatsQueryMock(...args) },
      getLeadsPipeline: { useQuery: (...args: unknown[]) => getPipelineQueryMock(...args) },
      getMyListings: { useQuery: (...args: unknown[]) => myListingsQueryMock(...args) },
      getMyShowings: { useQuery: (...args: unknown[]) => setShowingsQueryMock(...args) },
      getNotifications: { useQuery: (...args: unknown[]) => getNotificationsQueryMock(...args) },
      getMyFollowUps: { useQuery: (...args: unknown[]) => getFollowUpsQueryMock(...args) },
    },
    listing: {
      myListings: { useQuery: (...args: unknown[]) => myListingsQueryMock(...args) },
    },
  },
}));

import { AgentDashboardOverview } from './AgentDashboardOverview';

const fullStatus = {
  dashboardUnlocked: true,
  fullFeaturesUnlocked: true,
  approvalStatus: 'approved',
  onboardingStep: 5,
  profileCompletionScore: 100,
  profileCompletionFlags: [],
  entitlements: { canPublishListings: true },
  profile: { slug: 'test-agent' },
  recommendedNextStep: 'dashboard',
};

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function hoursAhead(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

describe('AgentDashboardOverview follow-up attention surface', () => {
  beforeEach(() => {
    localStorage.clear();
    useOnboardingStatusMock.mockReturnValue({ status: fullStatus, isLoading: false });
    getStatsQueryMock.mockReturnValue({ data: { activeListings: 1, showingsToday: 0 } });
    getPipelineQueryMock.mockReturnValue({
      data: { new: [], contacted: [], viewing: [], offer: [], closed: [] },
    });
    myListingsQueryMock.mockReturnValue({ data: [] });
    setShowingsQueryMock.mockReturnValue({ data: [] });
    getNotificationsQueryMock.mockReturnValue({ data: [] });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('surfaces due follow-ups as the attention metric with a working link into Productivity', async () => {
    const user = userEvent.setup();
    getFollowUpsQueryMock.mockReturnValue({
      data: [
        {
          id: 1,
          name: 'Thabo M',
          nextFollowUp: hoursAgo(3),
          property: { title: '2 Bed Sandton', city: 'Sandton' },
          commercial: null,
        },
        {
          id: 2,
          name: 'A Nkosi',
          nextFollowUp: hoursAgo(1),
          property: null,
          commercial: { listingTitle: 'Office Park A' },
        },
        {
          id: 3,
          name: 'Future Lead',
          nextFollowUp: hoursAhead(48),
          property: null,
          commercial: null,
        },
        {
          id: 4,
          name: 'Third overdue lead',
          nextFollowUp: hoursAgo(0.5),
          property: null,
          commercial: null,
        },
      ],
    });

    render(<AgentDashboardOverview onboardingStatus={fullStatus as never} />);

    expect(await screen.findByText('Leads Needing Follow-up')).toBeTruthy();
    const metricRow = screen.getByText('Leads Needing Follow-up').closest('div.grid');
    expect(metricRow).toBeTruthy();
    expect(within(metricRow as HTMLElement).getByText('3')).toBeTruthy();
    expect(screen.getByText('Overdue or due lead follow-ups')).toBeTruthy();

    const action = screen.getByRole('button', { name: 'Open follow-ups in Productivity' });
    await user.click(action);
    expect(setLocationMock).toHaveBeenCalledWith('/agent/productivity?tab=reminders');
  });

  it('shows the on-track state when nothing is due', () => {
    getFollowUpsQueryMock.mockReturnValue({
      data: [
        {
          id: 9,
          name: 'Later Lead',
          nextFollowUp: hoursAhead(72),
          property: null,
          commercial: null,
        },
      ],
    });

    render(<AgentDashboardOverview onboardingStatus={fullStatus as never} />);

    expect(screen.getByText('On track')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Open follow-ups in Productivity' })).toBeNull();
  });

  it('uses the same UTC interpretation of database timestamps as Productivity', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-17T23:00:00.000Z'));
    getFollowUpsQueryMock.mockReturnValue({
      data: [
        {
          id: 10,
          name: 'UTC follow-up',
          nextFollowUp: '2026-09-18 00:00:00',
          property: null,
          commercial: null,
        },
      ],
    });

    render(<AgentDashboardOverview onboardingStatus={fullStatus as never} />);

    expect(screen.getByText('On track')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Open follow-ups in Productivity' })).toBeNull();
  });

  it('makes the API cap explicit rather than undercounting a full due queue', () => {
    getFollowUpsQueryMock.mockReturnValue({
      data: Array.from({ length: 50 }, (_, index) => ({
        id: index + 1,
        name: `Due lead ${index + 1}`,
        nextFollowUp: hoursAgo(index + 1),
        property: null,
        commercial: null,
      })),
    });

    render(<AgentDashboardOverview onboardingStatus={fullStatus as never} />);

    const metricRow = screen.getByText('Leads Needing Follow-up').closest('div.grid');
    expect(metricRow).toBeTruthy();
    expect(within(metricRow as HTMLElement).getByText('50+')).toBeTruthy();
  });

  it('does not claim the queue is healthy while follow-ups are loading', () => {
    getFollowUpsQueryMock.mockReturnValue({ data: [], isLoading: true });

    render(<AgentDashboardOverview onboardingStatus={fullStatus as never} />);

    expect(screen.getByText('Loading')).toBeTruthy();
    expect(screen.queryByText('On track')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Open follow-ups in Productivity' })).toBeNull();
  });

  it('does not claim the queue is healthy when follow-ups cannot load', () => {
    getFollowUpsQueryMock.mockReturnValue({ data: [], isError: true });

    render(<AgentDashboardOverview onboardingStatus={fullStatus as never} />);

    expect(screen.getByText('Unavailable')).toBeTruthy();
    expect(screen.getByText('Follow-up status could not load')).toBeTruthy();
    expect(screen.queryByText('On track')).toBeNull();
  });

  it('renders the follow-up row as locked when operational data is unavailable', () => {
    const lockedStatus = { ...fullStatus, fullFeaturesUnlocked: false };
    useOnboardingStatusMock.mockReturnValue({
      status: lockedStatus,
      isLoading: false,
    });
    getFollowUpsQueryMock.mockReturnValue({ data: [] });

    render(<AgentDashboardOverview onboardingStatus={lockedStatus as never} />);

    expect(screen.getByText('Leads Needing Follow-up')).toBeTruthy();
    expect(screen.getByText('Locked')).toBeTruthy();
    expect(screen.getByText('Unlock Agent access to work follow-ups')).toBeTruthy();
  });
});
