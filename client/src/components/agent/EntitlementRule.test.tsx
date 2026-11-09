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
import { getPublishBlock, isAgentPlanEntitled } from '@/lib/agentJourney';

beforeEach(() => {
  vi.clearAllMocks();
  resetPlanGateForTests();
});
afterEach(() => cleanup());

function renderWith(status: Record<string, unknown>) {
  statusMock.mockReturnValue({ status, isLoading: false, error: null });
  return render(
    <>
      <AgentTopNav />
      <AgentPlanGateLayer />
    </>,
  );
}

describe('single paid rule', () => {
  it.each([
    ['unassigned', true, false],
    ['trial', true, false],
    ['pending_payment', false, false],
    ['payment_under_review', false, false],
    ['active', false, false],
    ['active', true, true],
    ['grace_period', true, true],
    ['expired', true, false],
  ])('subscription %s, fullFeaturesUnlocked=%s -> paid=%s', (subscriptionStatus, full, paid) => {
    expect(isAgentPlanEntitled({ subscriptionStatus, fullFeaturesUnlocked: full })).toBe(paid);
  });

  it.each([
    ['unassigned', true],
    ['trial', true],
    ['active', false],
  ])(
    'unpaid (%s): every visible plan button opens the panel',
    (subscriptionStatus, fullFeaturesUnlocked) => {
      renderWith({
        recommendedNextStep: 'select_package',
        subscriptionStatus,
        fullFeaturesUnlocked,
        profileCompletionScore: 90,
        entitlements: { canPublishListings: true },
      });
      const buttons = screen.queryAllByRole('button', { name: /choose plan|get access/i });
      expect(buttons.length).toBeGreaterThan(0);
      for (const button of buttons) {
        act(() => button.click());
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        act(() => resetPlanGateForTests());
      }
      expect(setLocationMock).not.toHaveBeenCalled();
    },
  );

  it('paid agent with a 65% profile: no plan button or panel, publish shows the reason', () => {
    const status = {
      recommendedNextStep: 'dashboard',
      subscriptionStatus: 'active',
      fullFeaturesUnlocked: true,
      profileCompletionScore: 65,
      entitlements: { canPublishListings: false },
    };
    renderWith(status);
    expect(screen.queryAllByRole('button', { name: /choose plan|get access/i })).toHaveLength(0);
    expect(screen.queryByTestId('agent-preview-banner')).not.toBeInTheDocument();
    expect(getPublishBlock(status)?.title).toBe('Complete your profile (65%) to publish');
    act(() => screen.getByRole('button', { name: 'Complete profile' }).click());
    expect(setLocationMock).toHaveBeenCalledWith('/agent/setup');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('paid agent who can publish: Add Listing, no reason, no panel', () => {
    renderWith({
      recommendedNextStep: 'dashboard',
      subscriptionStatus: 'active',
      fullFeaturesUnlocked: true,
      profileCompletionScore: 90,
      entitlements: { canPublishListings: true },
    });
    expect(screen.getByRole('button', { name: /add listing/i })).toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /choose plan|get access/i })).toHaveLength(0);
  });
});
