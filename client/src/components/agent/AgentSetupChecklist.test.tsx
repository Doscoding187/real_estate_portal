import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('wouter', () => ({ useLocation: () => ['/agent/dashboard', vi.fn()] }));
vi.mock('@/_core/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 1, role: 'agent' } }) }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    billing: { agentWorkspace: { useQuery: () => ({ data: undefined }) } },
  },
}));

import { AgentSetupChecklist } from './AgentSetupChecklist';

afterEach(() => cleanup());

function renderChecklist(status: Record<string, unknown>, hasDraft = false) {
  return render(
    <AgentSetupChecklist
      status={
        {
          onboardingStep: 3,
          fullFeaturesUnlocked: false,
          subscriptionStatus: 'unassigned',
          entitlements: { canPublishListings: false },
          ...status,
        } as never
      }
      hasDraft={hasDraft}
      agentLaunchAccessAvailable
    />,
  );
}

function done(label: RegExp) {
  return screen.getByText(label).closest('li')?.getAttribute('data-done');
}

describe('AgentSetupChecklist', () => {
  it('shows an unpaid agent with nothing past the profile done', () => {
    renderChecklist({});
    expect(done(/Complete your profile/)).toBe('true');
    expect(done(/Choose a plan/)).toBe('false');
    expect(done(/Pay/)).toBe('false');
  });

  it('shows payment under review as not done, with a note and a payment details action', () => {
    renderChecklist({ subscriptionStatus: 'payment_under_review' });
    expect(done(/Choose a plan/)).toBe('true');
    expect(done(/Pay/)).toBe('false');
    expect(screen.getByText('Under review')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View payment details' })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/invoice/i);
  });

  it('does not count a trial as paid', () => {
    renderChecklist({ subscriptionStatus: 'trial', fullFeaturesUnlocked: true });
    expect(done(/Pay/)).toBe('false');
  });

  it('renders nothing once paid and live', () => {
    renderChecklist(
      {
        subscriptionStatus: 'active',
        fullFeaturesUnlocked: true,
        entitlements: { canPublishListings: true },
      },
      true,
    );
    expect(screen.queryByTestId('agent-setup-checklist')).not.toBeInTheDocument();
  });
});
