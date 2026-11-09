import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, statusMock } = vi.hoisted(() => ({ authMock: vi.fn(), statusMock: vi.fn() }));

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

beforeEach(() => closePlanGate());
afterEach(() => cleanup());

function status(canPublishListings: boolean) {
  statusMock.mockReturnValue({
    status: { recommendedNextStep: 'select_package', entitlements: { canPublishListings } },
    isLoading: false,
    error: null,
  });
}

describe('AgentListingAccessGate', () => {
  it('locks draft creation for a non-entitled agent and opens the panel', () => {
    authMock.mockReturnValue({ user: { role: 'agent' } });
    status(false);
    const gate = renderHook(() => usePlanGateOpen());
    render(<AgentListingAccessGate>Wizard</AgentListingAccessGate>);
    expect(screen.queryByText('Wizard')).not.toBeInTheDocument();
    expect(screen.getByText('Listings unlock with a plan')).toBeInTheDocument();
    expect(gate.result.current).toBe(true);
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
