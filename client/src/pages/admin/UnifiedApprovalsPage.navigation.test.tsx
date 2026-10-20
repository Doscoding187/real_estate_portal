import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UnifiedApprovalsPage from './UnifiedApprovalsPage';
const harness = vi.hoisted(() => ({ search: '', navigate: vi.fn() }));
vi.mock('wouter', () => ({
  useLocation: () => ['/admin/approvals', harness.navigate],
  useSearch: () => harness.search,
}));
vi.mock('./AgentApprovals', () => ({ default: () => <div>Agent review queue</div> }));
vi.mock('./ListingOversight', () => ({ default: () => <div>Listing review queue</div> }));
vi.mock('./DevelopmentOversight', () => ({ default: () => <div>Development review queue</div> }));
describe('approvals category routing', () => {
  it.each([
    ['', 'Listing review queue'],
    ['?tab=listings', 'Listing review queue'],
    ['?tab=agents', 'Agent review queue'],
    ['?tab=developments', 'Development review queue'],
    ['?tab=unrecognised', 'Listing review queue'],
  ])('opens the intended category for %s', (search, queue) => {
    harness.search = search;
    render(<UnifiedApprovalsPage />);
    expect(screen.getByText(queue)).toBeVisible();
  });
  it('keeps a changed category in the URL', () => {
    harness.search = '?tab=agents';
    render(<UnifiedApprovalsPage />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Listing Approvals' }), { key: 'Enter' });
    expect(harness.navigate).toHaveBeenCalledWith('/admin/approvals?tab=listings');
  });
});
