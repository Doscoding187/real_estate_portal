import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  listEligibleQueryMock,
  listMyReferralsQueryMock,
  networkStatusQueryMock,
  setLocationMock,
  useOnboardingStatusMock,
} = vi.hoisted(() => ({
  listEligibleQueryMock: vi.fn(),
  listMyReferralsQueryMock: vi.fn(),
  networkStatusQueryMock: vi.fn(),
  setLocationMock: vi.fn(),
  useOnboardingStatusMock: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/agent/referrals', setLocationMock],
}));

vi.mock('@/components/agent/AgentAppShell', () => ({
  AgentAppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/hooks/useAgentOnboardingStatus', () => ({
  useAgentOnboardingStatus: (...args: unknown[]) => useOnboardingStatusMock(...args),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    distribution: {
      partner: {
        listEligibleDevelopmentsForSubmission: {
          useQuery: (...args: unknown[]) => listEligibleQueryMock(...args),
        },
        listMyReferrals: {
          useQuery: (...args: unknown[]) => listMyReferralsQueryMock(...args),
        },
      },
      referrer: {
        status: {
          useQuery: (...args: unknown[]) => networkStatusQueryMock(...args),
        },
      },
    },
  },
}));

import AgentReferrals from './AgentReferrals';

beforeEach(() => {
  vi.clearAllMocks();
  useOnboardingStatusMock.mockReturnValue({
    status: {
      fullFeaturesUnlocked: false,
      recommendedNextStep: 'await_profile_approval',
      subscriptionStatus: 'active',
    },
    isLoading: false,
  });
  listEligibleQueryMock.mockReturnValue({ data: { items: [] }, isLoading: false });
  listMyReferralsQueryMock.mockReturnValue({ data: { items: [] }, isLoading: false });
  networkStatusQueryMock.mockReturnValue({ data: { hasAccess: false }, isLoading: false });
});

afterEach(() => cleanup());

describe('AgentReferrals access handoff', () => {
  it('holds referral opportunities and buyer files until the agent workspace is approved', () => {
    render(<AgentReferrals />);

    expect(screen.getByText('Your professional profile is under review')).toBeInTheDocument();
    expect(screen.getByText('Return to dashboard')).toBeInTheDocument();
    for (const queryMock of [
      listEligibleQueryMock,
      listMyReferralsQueryMock,
      networkStatusQueryMock,
    ]) {
      expect(queryMock.mock.calls[0]?.at(-1)).toEqual(expect.objectContaining({ enabled: false }));
    }
  });
});
