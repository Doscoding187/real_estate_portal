import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getDashboardStatsQueryMock, setLocationMock, useOnboardingStatusMock } = vi.hoisted(() => ({
  getDashboardStatsQueryMock: vi.fn(),
  setLocationMock: vi.fn(),
  useOnboardingStatusMock: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/agent/training-support', setLocationMock],
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
      getDashboardStats: {
        useQuery: (...args: unknown[]) => getDashboardStatsQueryMock(...args),
      },
    },
  },
}));

import AgentTrainingSupport from './AgentTrainingSupport';

beforeEach(() => {
  vi.clearAllMocks();
  useOnboardingStatusMock.mockReturnValue({
    status: {
      dashboardUnlocked: false,
      fullFeaturesUnlocked: false,
      recommendedNextStep: 'select_package',
      subscriptionStatus: 'unassigned',
    },
    isLoading: false,
  });
  getDashboardStatsQueryMock.mockReturnValue({ data: null, isLoading: false });
});

afterEach(() => cleanup());

describe('AgentTrainingSupport access handoff', () => {
  // Behaviour intentionally changed: training and support are a paid feature, so an
  // unpaid agent (including one whose payment is under review) is locked with Get access.
  it('locks training and keeps operational metrics private for an unpaid agent', () => {
    render(<AgentTrainingSupport />);

    expect(screen.getByText('Training and support unlock with a plan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get access' })).toBeInTheDocument();
    expect(getDashboardStatsQueryMock.mock.calls[0]?.at(-1)).toEqual(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('stays locked while the payment is under review and loads nothing', () => {
    useOnboardingStatusMock.mockReturnValue({
      status: {
        dashboardUnlocked: true,
        fullFeaturesUnlocked: false,
        recommendedNextStep: 'await_payment_review',
        subscriptionStatus: 'payment_under_review',
      },
      isLoading: false,
    });

    render(<AgentTrainingSupport />);

    expect(screen.queryByRole('heading', { name: 'Training & Support' })).not.toBeInTheDocument();
    expect(screen.getByText('Training and support unlock with a plan')).toBeInTheDocument();
    expect(getDashboardStatsQueryMock.mock.calls[0]?.at(-1)).toEqual(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('opens guidance and support for a paid agent', async () => {
    useOnboardingStatusMock.mockReturnValue({
      status: {
        dashboardUnlocked: true,
        fullFeaturesUnlocked: true,
        recommendedNextStep: 'dashboard',
        subscriptionStatus: 'active',
        entitlements: { canPublishListings: true },
      },
      isLoading: false,
    });

    render(<AgentTrainingSupport />);

    expect(screen.getByRole('heading', { name: 'Training & Support' })).toBeInTheDocument();
    const supportTab = screen.getByRole('tab', { name: 'Support' });
    fireEvent.mouseDown(supportTab, { button: 0, ctrlKey: false });
    expect(supportTab).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('Support Desk')).toBeInTheDocument();
  });
});
