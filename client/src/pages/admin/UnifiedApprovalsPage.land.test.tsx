import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UnifiedApprovalsPage from './UnifiedApprovalsPage';
import { setServerReportedLandEnabled } from '@/lib/landRuntime';

const harness = vi.hoisted(() => ({ search: '' }));
vi.mock('wouter', () => ({
  useLocation: () => ['/admin/approvals', vi.fn()],
  useSearch: () => harness.search,
}));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    admin: {
      getAdminActionItems: {
        useQuery: () => ({
          data: {
            pendingAgentApprovals: 0,
            pendingListingApprovals: 0,
            pendingDevelopmentApprovals: 0,
            pendingLandApprovals: 2,
          },
        }),
      },
    },
  },
}));
vi.mock('./AgentApprovals', () => ({ default: () => <div>Agent review queue</div> }));
vi.mock('./ListingOversight', () => ({ default: () => <div>Listing review queue</div> }));
vi.mock('./DevelopmentOversight', () => ({ default: () => <div>Development review queue</div> }));
vi.mock('./LandReviewWorkspace', () => ({ default: () => <div>Land review queue</div> }));

afterEach(() => setServerReportedLandEnabled(false));

describe('Land Approvals tab', () => {
  it('is hidden, with no count and no deep link, while Land is off', () => {
    harness.search = '?tab=land';
    render(<UnifiedApprovalsPage />);
    expect(screen.queryByRole('tab', { name: 'Land Approvals' })).toBeNull();
    expect(screen.queryByText('Land review queue')).toBeNull();
    expect(screen.getByText('Listing review queue')).toBeVisible();
  });

  it('shows its own count and queue when Land is on', () => {
    setServerReportedLandEnabled(true);
    harness.search = '?tab=land';
    render(<UnifiedApprovalsPage />);
    expect(screen.getByRole('tab', { name: 'Land Approvals' }).textContent).toContain('2');
    expect(screen.getByRole('tab', { name: 'Listing Approvals' }).textContent).toBe('Listing Approvals');
    expect(screen.getByText('Land review queue')).toBeVisible();
  });
});
