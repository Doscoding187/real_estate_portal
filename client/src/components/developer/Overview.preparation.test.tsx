import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  setLocation: vi.fn(),
  home: {
    developments: [
      {
        identity: {
          id: 41,
          name: 'Harbour View',
          location: { city: 'Cape Town', province: 'Western Cape' },
        },
        lifecycle: { state: 'approved_private', latestReview: null },
        readiness: { status: 'ready', blockerCount: 0 },
        inventory: { totalUnits: 12, availableUnits: 12 },
        leads: { openLeadCount: 0, slaBreachCount: 0 },
        nextAction: null,
      },
    ],
    commercialAccess: { eligible: false, reason: 'missing_launch_access', expiresAt: null },
    portfolio: {
      developmentCount: 1,
      readiness: { readyDevelopmentCount: 1 },
      inventory: { availableUnits: 12 },
      leads: { openLeadCount: 0 },
      attentionCount: 0,
      nextAction: null,
    },
    attention: [],
  },
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({ user: { role: 'property_developer' } }),
}));

vi.mock('@/hooks/useDeveloperOnboardingStatus', () => ({
  useDeveloperOnboardingStatus: () => ({
    status: { hasProfile: true, dashboardUnlocked: true },
    isLoading: false,
  }),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/developer/dashboard', state.setLocation],
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    developer: {
      getProfile: {
        useQuery: () => ({ data: { status: 'approved' }, isLoading: false }),
      },
      getOperatingHome: {
        useQuery: () => ({ data: state.home, isLoading: false, error: null }),
      },
    },
  },
}));

import Overview from './Overview';

describe('Developer workspace preparation boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('takes an ineligible developer to private work instead of offering unavailable activation', () => {
    render(<Overview />);

    expect(screen.getByText('Launch Access required for public publication')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage private developments' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Activate Launch Access' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Manage private developments' }));

    expect(state.setLocation).toHaveBeenCalledWith('/developer/developments');
  });
});
