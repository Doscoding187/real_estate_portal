import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { statusMock, statsQueryMock } = vi.hoisted(() => ({
  statusMock: vi.fn(),
  statsQueryMock: vi.fn(),
}));

vi.mock('wouter', () => ({ useLocation: () => ['/agent/training-support', vi.fn()] }));
vi.mock('@/components/agent/AgentAppShell', () => ({
  AgentAppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/hooks/useAgentOnboardingStatus', () => ({
  useAgentOnboardingStatus: () => statusMock(),
}));
vi.mock('@/lib/trpc', () => ({
  trpc: { agent: { getDashboardStats: { useQuery: (...a: unknown[]) => statsQueryMock(...a) } } },
}));

import AgentTrainingSupport from './AgentTrainingSupport';

beforeEach(() => {
  vi.clearAllMocks();
  statsQueryMock.mockReturnValue({ data: undefined, isLoading: false });
});
afterEach(() => cleanup());

describe('AgentTrainingSupport gate', () => {
  it('is locked with Get access for an unpaid agent and fires no data query', () => {
    statusMock.mockReturnValue({
      status: {
        recommendedNextStep: 'select_package',
        dashboardUnlocked: true,
        fullFeaturesUnlocked: false,
        subscriptionStatus: 'unassigned',
      },
      isLoading: false,
      error: null,
      retry: vi.fn(),
    });
    render(<AgentTrainingSupport />);
    expect(screen.getByText('Training and support unlock with a plan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get access' })).toBeInTheDocument();
    for (const call of statsQueryMock.mock.calls) {
      expect(call[1]).toEqual(expect.objectContaining({ enabled: false }));
    }
  });
});
