import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  completeFollowUpMutationMock,
  getFollowUpsQueryMock,
  getNotificationsQueryMock,
  getShowingsQueryMock,
  getUnreadCountQueryMock,
  setLocationMock,
  useOnboardingStatusMock,
} = vi.hoisted(() => ({
  completeFollowUpMutationMock: vi.fn(),
  getFollowUpsQueryMock: vi.fn(),
  getNotificationsQueryMock: vi.fn(),
  getShowingsQueryMock: vi.fn(),
  getUnreadCountQueryMock: vi.fn(),
  setLocationMock: vi.fn(),
  useOnboardingStatusMock: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/agent/productivity', setLocationMock],
}));

vi.mock('@/components/agent/AgentAppShell', () => ({
  AgentAppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/agent/ShowingsCalendar', () => ({
  ShowingsCalendar: () => <div>Calendar</div>,
}));

vi.mock('@/hooks/useAgentOnboardingStatus', () => ({
  useAgentOnboardingStatus: (...args: unknown[]) => useOnboardingStatusMock(...args),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({
      agent: {
        getActivationMilestones: { invalidate: vi.fn() },
        getLeadsPipeline: { invalidate: vi.fn() },
        getMyFollowUps: { invalidate: vi.fn() },
      },
    }),
    agent: {
      completeLeadFollowUp: { useMutation: () => completeFollowUpMutationMock() },
      getMyFollowUps: { useQuery: (...args: unknown[]) => getFollowUpsQueryMock(...args) },
      getMyShowings: { useQuery: (...args: unknown[]) => getShowingsQueryMock(...args) },
      getNotifications: { useQuery: (...args: unknown[]) => getNotificationsQueryMock(...args) },
      getUnreadNotificationCount: {
        useQuery: (...args: unknown[]) => getUnreadCountQueryMock(...args),
      },
    },
  },
}));

import AgentProductivity from './AgentProductivity';

beforeEach(() => {
  vi.clearAllMocks();
  useOnboardingStatusMock.mockReturnValue({
    status: {
      fullFeaturesUnlocked: false,
      recommendedNextStep: 'select_package',
      subscriptionStatus: 'unassigned',
    },
    isLoading: false,
  });
  completeFollowUpMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: false });
  getFollowUpsQueryMock.mockReturnValue({ data: [], isLoading: false });
  getShowingsQueryMock.mockReturnValue({ data: [], isLoading: false });
  getNotificationsQueryMock.mockReturnValue({ data: [], isLoading: false });
  getUnreadCountQueryMock.mockReturnValue({ data: { count: 0 }, isLoading: false });
});

afterEach(() => cleanup());

describe('AgentProductivity access handoff', () => {
  it('guides an unactivated agent to Launch Access without fetching operational data', () => {
    render(<AgentProductivity />);

    expect(screen.getByText('Activate Launch Access')).toBeInTheDocument();
    for (const queryMock of [
      getShowingsQueryMock,
      getNotificationsQueryMock,
      getUnreadCountQueryMock,
      getFollowUpsQueryMock,
    ]) {
      expect(queryMock.mock.calls[0]?.at(-1)).toEqual(expect.objectContaining({ enabled: false }));
    }
  });
});
