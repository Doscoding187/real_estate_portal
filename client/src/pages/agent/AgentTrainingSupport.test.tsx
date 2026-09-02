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
  it('keeps operational metrics private until Launch Access is active', () => {
    render(<AgentTrainingSupport />);

    expect(screen.getByText('Activate your Agent workspace')).toBeInTheDocument();
    expect(screen.getByText('Activate Launch Access')).toBeInTheDocument();
    expect(getDashboardStatsQueryMock.mock.calls[0]?.at(-1)).toEqual(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('keeps guidance and support available while activation is under review', async () => {
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

    expect(screen.getByRole('heading', { name: 'Training & Support' })).toBeInTheDocument();
    expect(screen.getByText('Your payment proof is under review')).toBeInTheDocument();
    const supportTab = screen.getByRole('tab', { name: 'Support' });
    fireEvent.mouseDown(supportTab, { button: 0, ctrlKey: false });
    expect(supportTab).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('Support Desk')).toBeInTheDocument();
    expect(screen.queryByText('Active Listings')).not.toBeInTheDocument();
    expect(getDashboardStatsQueryMock.mock.calls[0]?.at(-1)).toEqual(
      expect.objectContaining({ enabled: false }),
    );
  });
});
