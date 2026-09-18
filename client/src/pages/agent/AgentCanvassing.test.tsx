import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getWorkspaceAccessQueryMock, setLocationMock, useOnboardingStatusMock } = vi.hoisted(
  () => ({
    getWorkspaceAccessQueryMock: vi.fn(),
    setLocationMock: vi.fn(),
    useOnboardingStatusMock: vi.fn(),
  }),
);

vi.mock('wouter', () => ({
  useLocation: () => ['/agent/canvassing', setLocationMock],
}));

vi.mock('@/components/agent/AgentAppShell', () => ({
  AgentAppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/canvassing/CanvassingWorkspace', () => ({
  CanvassingWorkspace: ({ mode }: { mode: string }) => <div>Canvassing workspace: {mode}</div>,
}));

vi.mock('@/hooks/useAgentOnboardingStatus', () => ({
  useAgentOnboardingStatus: (...args: unknown[]) => useOnboardingStatusMock(...args),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    canvassing: {
      getWorkspaceAccess: {
        useQuery: (...args: unknown[]) => getWorkspaceAccessQueryMock(...args),
      },
    },
  },
}));

import AgentCanvassing from './AgentCanvassing';

const unlockedAgentStatus = {
  dashboardUnlocked: true,
  fullFeaturesUnlocked: true,
  recommendedNextStep: 'dashboard',
};

describe('AgentCanvassing role-aware handoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOnboardingStatusMock.mockReturnValue({
      status: unlockedAgentStatus,
      isLoading: false,
      error: null,
      retry: vi.fn(),
    });
  });

  afterEach(() => cleanup());

  it('gives an independent agent an honest growth plan with live workplace exits', async () => {
    const user = userEvent.setup();
    getWorkspaceAccessQueryMock.mockReturnValue({
      data: { mode: 'independent_growth' },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<AgentCanvassing />);

    expect(screen.getByText('Independent agent plan')).toBeTruthy();
    expect(
      screen.getByText(
        /Shared seller prospect records and mandate workflows are intentionally kept inside agency teams\./,
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Canvassing workspace: agent')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Open Leads & CRM' }));
    expect(setLocationMock).toHaveBeenCalledWith('/agent/leads');
    expect(getWorkspaceAccessQueryMock.mock.calls[0]?.at(-1)).toEqual(
      expect.objectContaining({ enabled: true }),
    );
  });

  it('opens the existing canvassing workspace for an eligible agency agent', () => {
    getWorkspaceAccessQueryMock.mockReturnValue({
      data: { mode: 'agency_team', scope: 'agent', agencyId: 42 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<AgentCanvassing />);

    expect(screen.getByText('Canvassing workspace: agent')).toBeTruthy();
    expect(screen.queryByText('Independent agent plan')).toBeNull();
  });
});
