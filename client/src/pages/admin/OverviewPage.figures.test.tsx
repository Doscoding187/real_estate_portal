import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OverviewPage from './OverviewPage';

const state = vi.hoisted(() => ({
  analytics: { data: undefined as any, isLoading: false, isError: false },
  launch: { data: undefined as any, isLoading: false, isError: false },
  actions: { data: undefined as any, isLoading: false },
}));

vi.mock('wouter', () => ({ useLocation: () => ['/admin/overview', vi.fn()] }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    admin: {
      getAnalytics: { useQuery: () => state.analytics },
      getLaunchDashboardStats: { useQuery: () => state.launch },
      getAdminActionItems: { useQuery: () => state.actions },
    },
  },
}));

describe('honest launch dashboard', () => {
  beforeEach(() => {
    state.analytics = { data: undefined, isLoading: false, isError: false };
    state.launch = { data: undefined, isLoading: false, isError: false };
    state.actions = { data: undefined, isLoading: false };
  });

  it('renders figures from query data and no invented trends', () => {
    state.analytics.data = { paidSubscriptions: 4, userGrowth: 17, monthlyRevenue: 999999 };
    state.launch.data = {
      eftAwaitingReview: 2,
      approvedThisMonthCount: 3,
      approvedThisMonthRand: 1500,
      newLeads30d: 9,
    };
    state.actions.data = {
      pendingAgentApprovals: 0,
      pendingListingApprovals: 0,
      pendingDevelopmentApprovals: 0,
    };
    const { container } = render(<OverviewPage />);
    expect(screen.getByText('EFT payments awaiting review')).toBeTruthy();
    expect(screen.getByText('17')).toBeTruthy();
    expect(screen.getByText('9')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(container.textContent).toContain('1 500');
    expect(container.textContent).not.toContain('+12%');
    expect(container.textContent).not.toContain('Revenue (30d)');
    expect(container.textContent).not.toContain('999');
  });

  it('shows honest empty states when data is unavailable', () => {
    state.launch.isError = true;
    state.analytics.isError = true;
    const { container } = render(<OverviewPage />);
    expect(container.textContent).toContain('Unavailable');
    expect(container.textContent).not.toContain('+12%');
    expect(container.textContent).toContain('The approval queue is empty.');
  });
});
