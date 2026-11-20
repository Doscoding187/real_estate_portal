import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SidebarNavigation from '@/components/admin/SidebarNavigation';

const loc = vi.hoisted(() => ({ path: '/admin/publisher/developments/new' }));
vi.mock('wouter', () => ({ useLocation: () => [loc.path, vi.fn()] }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    admin: {
      getLaunchDashboardStats: {
        useQuery: () => ({ data: { eftAwaitingReview: 4 }, isLoading: false }),
      },
      getAdminActionItems: {
        useQuery: () => ({
          data: {
            pendingAgentApprovals: 3,
            pendingListingApprovals: 2,
            pendingDevelopmentApprovals: 1,
          },
          isLoading: false,
        }),
      },
    },
  },
}));

describe('admin sidebar', () => {
  it('shows groups, real count badges and keeps Publisher active on nested routes', () => {
    render(<SidebarNavigation />);
    for (const title of ['TODAY', 'CATALOGUE', 'PEOPLE', 'SYSTEM']) {
      expect(screen.getByText(title)).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: /Approvals/ }).textContent).toContain('6');
    expect(screen.getByRole('button', { name: /Finance/ }).textContent).toContain('4');
    expect(screen.getByRole('button', { name: /Publisher/ }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(screen.getByRole('button', { name: /Listings/ }).getAttribute('aria-current')).toBeNull();
    expect(screen.queryByText('Revenue Center')).toBeNull();
  });
});
