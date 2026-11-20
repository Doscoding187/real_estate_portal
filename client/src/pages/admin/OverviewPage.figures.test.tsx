import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OverviewPage from './OverviewPage';

const q = (over: Record<string, unknown> = {}) => ({
  data: undefined as any,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
  ...over,
});
const state = vi.hoisted(() => ({
  analytics: {} as any,
  launch: {} as any,
  inbox: {} as any,
  activity: {} as any,
  growth: {} as any,
  navigate: vi.fn(),
}));

vi.mock('wouter', () => ({ useLocation: () => ['/admin/overview', state.navigate] }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    admin: {
      getAnalytics: { useQuery: () => state.analytics },
      getLaunchDashboardStats: { useQuery: () => state.launch },
      getDailyInbox: { useQuery: () => state.inbox },
      getRecentAdminActivity: { useQuery: () => state.activity },
      getWeeklyGrowth: { useQuery: () => state.growth },
    },
  },
}));

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString();

const weeks = Array.from({ length: 8 }, (_, i) => ({
  weekStart: new Date(Date.UTC(2026, 9, 1 + i * 7)).toISOString().slice(0, 10),
  signups: i,
  paidAccounts: 0,
  enquiries: 0,
}));

describe('daily inbox dashboard', () => {
  beforeEach(() => {
    state.analytics = q();
    state.launch = q();
    state.inbox = q({ data: [] });
    state.activity = q({ data: [] });
    state.growth = q({ data: weeks });
    state.navigate = vi.fn();
  });

  it('renders pulse figures from query data and no invented trends', () => {
    state.analytics = q({ data: { paidSubscriptions: 4, userGrowth: 17, monthlyRevenue: 999999 } });
    state.launch = q({
      data: {
        eftAwaitingReview: 2,
        approvedThisMonthCount: 3,
        approvedThisMonthRand: 1500,
        newLeads30d: 9,
      },
    });
    const { container } = render(<OverviewPage />);
    expect(screen.getByText('17')).toBeTruthy();
    expect(screen.getByText('9')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(container.textContent).toMatch(/1\s500/);
    expect(container.textContent).not.toContain('+12%');
    expect(container.textContent).not.toContain('999');
  });

  it('shows honest unavailable and empty states', () => {
    state.launch = q({ isError: true });
    state.analytics = q({ isError: true });
    const { container } = render(<OverviewPage />);
    expect(container.textContent).toContain('Unavailable');
    expect(container.textContent).toContain('Nothing waiting. All clear.');
    expect(container.textContent).toContain('No recorded admin activity yet.');
  });

  it('merges items, tags age, filters by tab and hides tabs with no source', () => {
    state.inbox = q({
      data: [
        {
          id: 'listing-1',
          kind: 'listing',
          title: 'Listing to approve: House',
          subtitle: 'x',
          waitingSince: hoursAgo(3),
          href: '/admin/approvals?tab=listings',
        },
        {
          id: 'payment-1',
          kind: 'payment',
          title: 'EFT proof, ZAR 499',
          subtitle: 'y',
          waitingSince: hoursAgo(60),
          href: '/admin/finance',
        },
        {
          id: 'agent-1',
          kind: 'agent',
          title: 'Agent to approve: Sam',
          subtitle: 'z',
          waitingSince: hoursAgo(30),
          href: '/admin/approvals?tab=agents',
        },
      ],
    });
    render(<OverviewPage />);
    const rows = screen.getAllByRole('listitem').slice(0, 3);
    expect(rows[0].textContent).toContain('EFT proof');
    expect(rows[0].textContent).toContain('2 d 12 h');
    expect(rows[2].textContent).toContain('Listing to approve');
    expect(screen.queryByRole('tab', { name: /Support/ })).toBeNull();
    expect(screen.queryByRole('tab', { name: /Applications/ })).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: /Payments/ }));
    expect(screen.queryByText('Agent to approve: Sam')).toBeNull();
    expect(screen.getByText('EFT proof, ZAR 499')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Open' })[0]);
    expect(state.navigate).toHaveBeenLastCalledWith('/admin/finance');
  });

  it('offers retry when the inbox fails', () => {
    const refetch = vi.fn();
    state.inbox = q({ isError: true, refetch });
    render(<OverviewPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('chart can be viewed as a table and carries only returned data', () => {
    render(<OverviewPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Show as table' }));
    const cells = screen.getAllByRole('cell').filter((_, i) => i % 2 === 1);
    expect(cells.map(c => c.textContent)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7']);
    fireEvent.click(screen.getByRole('button', { name: 'Paid accounts' }));
    expect(screen.getAllByRole('cell').filter((_, i) => i % 2 === 1).every(c => c.textContent === '0')).toBe(true);
  });

  it('quick actions open the existing pages', () => {
    render(<OverviewPage />);
    fireEvent.click(screen.getByRole('button', { name: /New curated development/ }));
    expect(state.navigate).toHaveBeenLastCalledWith('/admin/publisher/developments/new');
    fireEvent.click(screen.getByRole('button', { name: /Review EFT proofs/ }));
    expect(state.navigate).toHaveBeenLastCalledWith('/admin/finance');
  });
});
