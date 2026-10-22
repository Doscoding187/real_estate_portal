import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getDashboardStatsQueryMock, getLeadsPipelineQueryMock, setLocationMock } = vi.hoisted(
  () => ({
    getDashboardStatsQueryMock: vi.fn(),
    getLeadsPipelineQueryMock: vi.fn(),
    setLocationMock: vi.fn(),
  }),
);

vi.mock('wouter', () => ({
  useLocation: () => ['/agent/dashboard', setLocationMock],
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { role: 'agent', name: 'Test Agent', email: 'test@example.com' },
    logout: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAgentOnboardingStatus', () => ({
  useAgentOnboardingStatus: () => ({
    status: { fullFeaturesUnlocked: true },
    isLoading: false,
  }),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    agent: {
      getDashboardStats: {
        useQuery: (...args: unknown[]) => getDashboardStatsQueryMock(...args),
      },
      getLeadsPipeline: {
        useQuery: (...args: unknown[]) => getLeadsPipelineQueryMock(...args),
      },
    },
  },
}));

import { AgentSidebar } from './AgentSidebar';

describe('AgentSidebar workplace navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDashboardStatsQueryMock.mockReturnValue({ data: { activeListings: 2 } });
    getLeadsPipelineQueryMock.mockReturnValue({
      data: { new: [], contacted: [], viewing: [], offer: [], closed: [] },
    });
  });

  afterEach(() => cleanup());

  it('presents the core operating areas in workplace order and opens Productivity', async () => {
    const user = userEvent.setup();
    render(<AgentSidebar />);

    const buttons = screen.getAllByRole('button');
    const workplaceButtons = [
      screen.getByRole('button', { name: 'Overview' }),
      screen.getByRole('button', { name: /Leads & CRM/ }),
      screen.getByRole('button', { name: 'Contacts' }),
      screen.getByRole('button', { name: 'Productivity' }),
      screen.getByRole('button', { name: 'Listings' }),
      screen.getByRole('button', { name: 'Seller Growth' }),
    ];
    const workplaceIndexes = workplaceButtons.map(button => buttons.indexOf(button));
    expect(workplaceIndexes).toEqual([...workplaceIndexes].sort((left, right) => left - right));
    expect(screen.queryByRole('button', { name: 'Calendar' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Productivity' }));
    expect(setLocationMock).toHaveBeenCalledWith('/agent/productivity');
  });
});
