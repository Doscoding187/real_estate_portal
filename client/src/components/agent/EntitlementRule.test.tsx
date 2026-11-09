import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { statusMock, setLocationMock } = vi.hoisted(() => ({
  statusMock: vi.fn(),
  setLocationMock: vi.fn(),
}));

vi.mock('wouter', () => ({ useLocation: () => ['/agent/dashboard', setLocationMock] }));
vi.mock('@/_core/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 7, role: 'agent' } }) }));
vi.mock('@/hooks/useAgentOnboardingStatus', () => ({
  useAgentOnboardingStatus: () => statusMock(),
}));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    agent: {
      getMyListings: { useQuery: () => ({ data: [], isLoading: false }) },
      getLeadsPipeline: { useQuery: () => ({ data: undefined, isLoading: false }) },
      getMyShowings: { useQuery: () => ({ data: [], isLoading: false }) },
    },
  },
}));
vi.mock('./NotificationCenter', () => ({ NotificationCenter: () => null }));
vi.mock('@/components/agent/PlanGateDialog', () => ({
  PlanGateDialog: ({ open }: { open: boolean }) => (open ? <div role="dialog">Panel</div> : null),
}));

import { AgentTopNav } from './AgentTopNav';
import { AgentPlanGateLayer } from './AgentPlanGateLayer';
import { resetPlanGateForTests } from '@/lib/agentPlanGate';
import { isAgentPlanEntitled } from '@/lib/agentJourney';

beforeEach(() => {
  vi.clearAllMocks();
  resetPlanGateForTests();
});
afterEach(() => cleanup());

describe('single entitlement rule', () => {
  it.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ])(
    'fullFeaturesUnlocked=%s canPublishListings=%s: a visible plan button opens the panel or is absent',
    (fullFeaturesUnlocked, canPublishListings) => {
      const status = {
        recommendedNextStep: 'select_package',
        subscriptionStatus: 'unassigned',
        fullFeaturesUnlocked,
        entitlements: { canPublishListings },
      };
      statusMock.mockReturnValue({ status, isLoading: false, error: null });
      render(
        <>
          <AgentTopNav />
          <AgentPlanGateLayer />
        </>,
      );
      const entitled = isAgentPlanEntitled(status);
      expect(entitled).toBe(fullFeaturesUnlocked && canPublishListings);
      const buttons = screen.queryAllByRole('button', { name: /choose plan|get access/i });
      if (entitled) {
        expect(buttons).toHaveLength(0);
        expect(screen.getByRole('button', { name: /add listing/i })).toBeInTheDocument();
        return;
      }
      expect(buttons.length).toBeGreaterThan(0);
      for (const button of buttons) {
        act(() => button.click());
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        act(() => resetPlanGateForTests());
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      }
      expect(setLocationMock).not.toHaveBeenCalled();
    },
  );
});
