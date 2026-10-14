import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ListingOversight from './ListingOversight';
const harness = vi.hoisted(() => ({
  navigate: vi.fn(),
  query: vi.fn(),
  remove: vi.fn(),
  sourceId: 996112 as number | null,
}));
vi.mock('wouter', () => ({ useLocation: () => ['/admin/listing-approvals', harness.navigate] }));
vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({ user: { role: 'super_admin' }, isAuthenticated: true }),
}));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    listing: {
      getApprovalQueue: {
        useQuery: (input: unknown) => {
          harness.query(input);
          return {
            data: [
              {
                id: 31,
                listingId: harness.sourceId,
                status: 'pending',
                listingTitle: 'Fixture submitted home',
                listingPropertyType: 'house',
                listingAction: 'sell',
                submittedAt: '2026-10-14',
                submittedBy: 101,
              },
            ],
            isLoading: false,
            refetch: vi.fn(),
          };
        },
      },
      approve: { useMutation: () => ({ mutate: vi.fn() }) },
      reject: { useMutation: () => ({ mutate: vi.fn() }) },
      delete: { useMutation: () => ({ mutate: harness.remove }) },
    },
  },
}));
beforeEach(() => {
  harness.sourceId = 996112;
});
describe('listing approval navigation (mocked APIs)', () => {
  it('opens pending reviews by default and navigates by source listing ID', () => {
    render(<ListingOversight />);
    expect(harness.query).toHaveBeenCalledWith({ status: 'pending' });
    fireEvent.click(screen.getByRole('button', { name: 'Review', exact: true }));
    expect(harness.navigate).toHaveBeenCalledWith('/admin/review/996112');
    expect(harness.navigate).not.toHaveBeenCalledWith('/admin/review/31');
  });
  it('confirms deletion against the source listing, preserving the confirmation step', () => {
    render(<ListingOversight />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete listing Fixture submitted home' }));
    expect(harness.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }));
    expect(harness.remove).toHaveBeenCalledWith({ id: 996112 });
  });
  it('disables source actions when a queue item has no usable source ID', () => {
    harness.sourceId = null;
    render(<ListingOversight />);
    expect(screen.getByRole('button', { name: 'Review', exact: true })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Delete listing Fixture submitted home' }),
    ).toBeDisabled();
  });
});
