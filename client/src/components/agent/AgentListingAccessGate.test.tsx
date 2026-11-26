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

  it('unlocks for a server-paid agent even before the profile is complete', () => {
    authMock.mockReturnValue({ user: { role: 'agent' } });
    statusMock.mockReturnValue({
      status: {
        recommendedNextStep: 'publish_profile',
        fullFeaturesUnlocked: false,
        subscriptionStatus: 'active',
        launchAccess: { paid: true, state: 'paid', pendingOrder: null },
        profileCompletionScore: 90,
        entitlements: { canPublishListings: true },
      },
      isLoading: false,
      error: null,
    });
    render(<AgentListingAccessGate>Wizard</AgentListingAccessGate>);
    expect(screen.getByText('Wizard')).toBeInTheDocument();
  });

  it.each([
    [
      'suspended',
      { approvalStatus: 'suspended', recommendedNextStep: 'contact_support' },
      /needs support/,
    ],
    [
      'rejected',
      { approvalStatus: 'rejected', recommendedNextStep: 'contact_support' },
      /needs support/,
    ],
    [
      'rejected before profile steps',
      { approvalStatus: 'rejected', recommendedNextStep: 'publish_profile' },
      /needs support/,
    ],
    [
      'unverified email',
      { approvalStatus: 'pending', recommendedNextStep: 'verify_email' },
      /Verify your email/,
    ],
    [
      'profile unfinished',
      {
        approvalStatus: 'approved',
        recommendedNextStep: 'publish_profile',
        profileCompletionScore: 40,
      },
      /Complete your profile \(40%\)/,
    ],
    [
      'awaiting approval',
      {
        approvalStatus: 'pending',
        recommendedNextStep: 'await_profile_approval',
        profileCompletionScore: 90,
      },
      /under review/,
    ],
  ])(
    'keeps a paid but %s agent out of the wizard and never says choose a plan',
    (_n, extra, title) => {
      authMock.mockReturnValue({ user: { role: 'agent' } });
      statusMock.mockReturnValue({
        status: {
          fullFeaturesUnlocked: false,
          subscriptionStatus: 'active',
          launchAccess: { paid: true, state: 'paid', pendingOrder: null },
          profileCompletionScore: 90,
          entitlements: { canPublishListings: false },
          ...extra,
        },
        isLoading: false,
        error: null,
      });
      render(<AgentListingAccessGate>Wizard</AgentListingAccessGate>);
      expect(screen.queryByText('Wizard')).not.toBeInTheDocument();
      expect(screen.queryByText('Listings unlock with a plan')).not.toBeInTheDocument();
      expect(
        screen.queryByText(/choose a plan|Get access|Activate Launch Access/i),
      ).not.toBeInTheDocument();
      expect(screen.getByText(title)).toBeInTheDocument();
    },
  );

  it('shows payment under review with the reference instead of choose-a-plan copy', () => {
    authMock.mockReturnValue({ user: { role: 'agent' } });
    statusMock.mockReturnValue({
      status: {
        recommendedNextStep: 'await_payment_review',
        fullFeaturesUnlocked: false,
        subscriptionStatus: 'payment_under_review',
        launchAccess: {
          paid: false,
          state: 'under_review',
          pendingOrder: { reference: 'PLAN990101-8344DC' },
        },
        entitlements: { canPublishListings: false },
      },
      isLoading: false,
      error: null,
    });
    render(<AgentListingAccessGate>Wizard</AgentListingAccessGate>);
    expect(screen.queryByText('Wizard')).not.toBeInTheDocument();
    expect(screen.queryByText('Listings unlock with a plan')).not.toBeInTheDocument();
    expect(screen.getByText('Payment under review')).toBeInTheDocument();
    expect(screen.getByText(/once finance confirms \(ref PLAN990101-8344DC\)/)).toBeInTheDocument();
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
