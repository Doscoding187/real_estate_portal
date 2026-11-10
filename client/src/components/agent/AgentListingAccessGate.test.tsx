import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, statusMock, retryMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  statusMock: vi.fn(),
  retryMock: vi.fn(),
}));

vi.mock('wouter', () => ({ useLocation: () => ['/listings/create', vi.fn()] }));

vi.mock('@/_core/hooks/useAuth', () => ({ useAuth: () => authMock() }));
vi.mock('@/hooks/useAgentOnboardingStatus', () => ({
  useAgentOnboardingStatus: () => statusMock(),
}));
vi.mock('@/components/agent/AgentAppShell', () => ({
  AgentAppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { AgentListingAccessGate } from './AgentListingAccessGate';
import { closePlanGate, usePlanGateOpen } from '@/lib/agentPlanGate';
import { renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

beforeEach(() => closePlanGate());
afterEach(() => cleanup());

function status(canPublishListings: boolean) {
  statusMock.mockReturnValue({
    status: {
      recommendedNextStep: 'select_package',
      fullFeaturesUnlocked: canPublishListings,
      subscriptionStatus: canPublishListings ? 'active' : 'unassigned',
      entitlements: { canPublishListings },
    },
    isLoading: false,
    error: null,
  });
}

describe('AgentListingAccessGate', () => {
  it('locks draft creation for a non-entitled agent without auto-opening the panel', async () => {
    authMock.mockReturnValue({ user: { role: 'agent' } });
    status(false);
    const gate = renderHook(() => usePlanGateOpen());
    render(<AgentListingAccessGate>Wizard</AgentListingAccessGate>);
    expect(screen.queryByText('Wizard')).not.toBeInTheDocument();
    expect(screen.getByText('Listings unlock with a plan')).toBeInTheDocument();
    expect(gate.result.current).toBe(false);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Get access' }));
    expect(gate.result.current).toBe(true);
  });

  it('fails closed with a retry when the status cannot be confirmed', async () => {
    authMock.mockReturnValue({ user: { role: 'agent' } });
    statusMock.mockReturnValue({
      status: null,
      isLoading: false,
      error: 'boom',
      retry: retryMock,
    });
    render(<AgentListingAccessGate>Wizard</AgentListingAccessGate>);
    expect(screen.queryByText('Wizard')).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));
    expect(retryMock).toHaveBeenCalledTimes(1);
  });

  it('lets an entitled agent and other roles through', () => {
    authMock.mockReturnValue({ user: { role: 'agent' } });
    status(true);
    const { unmount } = render(<AgentListingAccessGate>Wizard</AgentListingAccessGate>);
    expect(screen.getByText('Wizard')).toBeInTheDocument();
    unmount();
    authMock.mockReturnValue({ user: { role: 'agency_admin' } });
    status(false);
    render(<AgentListingAccessGate>Wizard</AgentListingAccessGate>);
    expect(screen.getByText('Wizard')).toBeInTheDocument();
  });
});
