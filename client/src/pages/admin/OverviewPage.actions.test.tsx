import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OverviewPage from './OverviewPage';
const navigate = vi.hoisted(() => vi.fn());
vi.mock('wouter', () => ({ useLocation: () => ['/admin/overview', navigate] }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    admin: {
      getAnalytics: { useQuery: () => ({ data: {}, isLoading: false }) },
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
      getPropertiesStats: { useQuery: () => ({ data: {} }) },
    },
  },
}));
describe('dashboard approval actions', () => {
  it('opens the specific category advertised by each action', () => {
    render(<OverviewPage />);
    fireEvent.click(screen.getByRole('button', { name: '3 Agent approvals pending' }));
    expect(navigate).toHaveBeenLastCalledWith('/admin/approvals?tab=agents');
    fireEvent.click(screen.getByRole('button', { name: '2 Listings awaiting review' }));
    expect(navigate).toHaveBeenLastCalledWith('/admin/approvals?tab=listings');
    fireEvent.click(screen.getByRole('button', { name: '1 Developments pending review' }));
    expect(navigate).toHaveBeenLastCalledWith('/admin/approvals?tab=developments');
  });
});
