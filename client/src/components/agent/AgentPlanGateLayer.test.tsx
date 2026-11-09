import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { statusMock, setLocationMock } = vi.hoisted(() => ({
  statusMock: vi.fn(),
  setLocationMock: vi.fn(),
}));

vi.mock('wouter', () => ({ useLocation: () => ['/agent/dashboard', setLocationMock] }));
vi.mock('@/hooks/useAgentOnboardingStatus', () => ({
  useAgentOnboardingStatus: () => statusMock(),
}));
vi.mock('@/components/agent/PlanGateDialog', () => ({
  PlanGateDialog: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div role="dialog">
        Plan dialog
        <button onClick={() => onOpenChange(false)}>Close plan dialog</button>
      </div>
    ) : null,
}));

import { AgentPlanGateLayer } from './AgentPlanGateLayer';
import {
  markPlanPromptTrigger,
  openPlanGate,
  resetPlanGateForTests,
} from '@/lib/agentPlanGate';

function setStatus(canPublishListings: boolean) {
  statusMock.mockReturnValue({
    status: { recommendedNextStep: 'select_package', entitlements: { canPublishListings } },
    isLoading: false,
    error: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  resetPlanGateForTests();
});
afterEach(() => cleanup());

describe('AgentPlanGateLayer', () => {
  it('shows the preview banner and no dialog on first render', () => {
    setStatus(false);
    render(<AgentPlanGateLayer />);
    expect(screen.getByTestId('agent-preview-banner')).toHaveTextContent(
      'Preview mode - choose a plan to publish your listings and receive leads',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens from the banner and closing it does not navigate', async () => {
    setStatus(false);
    const user = userEvent.setup();
    render(<AgentPlanGateLayer />);
    await user.click(screen.getByRole('button', { name: 'Choose plan' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close plan dialog' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(setLocationMock).not.toHaveBeenCalled();
  });

  it('opens when a Publish or Leads gate calls openPlanGate', () => {
    setStatus(false);
    render(<AgentPlanGateLayer />);
    act(() => openPlanGate());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(setLocationMock).not.toHaveBeenCalled();
  });

  it('auto-prompts once per session after the trigger, never again after dismissal', async () => {
    setStatus(false);
    markPlanPromptTrigger();
    const user = userEvent.setup();
    const first = render(<AgentPlanGateLayer />);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close plan dialog' }));
    first.unmount();

    markPlanPromptTrigger();
    render(<AgentPlanGateLayer />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not auto-prompt without a trigger (first login)', () => {
    setStatus(false);
    render(<AgentPlanGateLayer />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows no banner and no dialog for an entitled agent', () => {
    setStatus(true);
    markPlanPromptTrigger();
    render(<AgentPlanGateLayer />);
    act(() => openPlanGate());
    expect(screen.queryByTestId('agent-preview-banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
