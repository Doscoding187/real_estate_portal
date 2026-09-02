import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getListingsQueryMock,
  getPipelineQueryMock,
  getShowingsQueryMock,
  notificationCenterMock,
  setLocationMock,
  useAuthMock,
  useOnboardingStatusMock,
} = vi.hoisted(() => ({
  getListingsQueryMock: vi.fn(),
  getPipelineQueryMock: vi.fn(),
  getShowingsQueryMock: vi.fn(),
  notificationCenterMock: vi.fn(),
  setLocationMock: vi.fn(),
  useAuthMock: vi.fn(),
  useOnboardingStatusMock: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/agent/dashboard', setLocationMock],
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}));

vi.mock('@/hooks/useAgentOnboardingStatus', () => ({
  useAgentOnboardingStatus: (...args: unknown[]) => useOnboardingStatusMock(...args),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    agent: {
      getMyListings: { useQuery: (...args: unknown[]) => getListingsQueryMock(...args) },
      getLeadsPipeline: { useQuery: (...args: unknown[]) => getPipelineQueryMock(...args) },
      getMyShowings: { useQuery: (...args: unknown[]) => getShowingsQueryMock(...args) },
    },
  },
}));

vi.mock('./NotificationCenter', () => ({
  NotificationCenter: (props: { enabled?: boolean }) => {
    notificationCenterMock(props);
    return <span data-testid="notification-center" data-enabled={String(props.enabled)} />;
  },
}));

import { AgentTopNav } from './AgentTopNav';

beforeEach(() => {
  vi.clearAllMocks();
  useAuthMock.mockReturnValue({ user: { id: 7, role: 'agent' } });
  useOnboardingStatusMock.mockReturnValue({
    status: {
      fullFeaturesUnlocked: false,
      recommendedNextStep: 'select_package',
      subscriptionStatus: 'unassigned',
    },
    isLoading: false,
  });
  getListingsQueryMock.mockReturnValue({ data: [], isLoading: false });
  getPipelineQueryMock.mockReturnValue({
    data: { new: [], contacted: [], viewing: [], offer: [], closed: [] },
    isLoading: false,
  });
  getShowingsQueryMock.mockReturnValue({ data: [], isLoading: false });
});

afterEach(() => cleanup());

describe('AgentTopNav access handoff', () => {
  it('does not pretend that locked workspace records are searchable or notify-ready', () => {
    render(<AgentTopNav />);

    const search = screen.getByRole('textbox', { name: 'Search your agent workspace' });
    expect(search).toBeDisabled();
    expect(search).toHaveAttribute(
      'placeholder',
      'Activate Launch Access to search your workspace',
    );
    expect(screen.getByTestId('notification-center')).toHaveAttribute('data-enabled', 'false');
    expect(getListingsQueryMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ enabled: false }),
    );
    expect(getPipelineQueryMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ enabled: false }),
    );
    expect(getShowingsQueryMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ enabled: false }),
    );
  });

  it('does not turn an unavailable status into a misleading activation prompt', () => {
    useOnboardingStatusMock.mockReturnValue({
      status: null,
      isLoading: false,
      error: 'Unable to load workspace status',
      retry: vi.fn(),
    });

    render(<AgentTopNav />);

    expect(screen.getByRole('textbox', { name: 'Search your agent workspace' })).toHaveAttribute(
      'placeholder',
      'Workspace status unavailable — retry on this page',
    );
    expect(screen.getByRole('button', { name: 'Status unavailable' })).toBeDisabled();
    expect(screen.getByTestId('notification-center')).toHaveAttribute('data-enabled', 'false');
  });
});
