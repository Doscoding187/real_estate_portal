import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AgentLandListings } from './AgentLandListings';

const harness = vi.hoisted(() => ({ navigate: vi.fn(), rows: [] as any[] }));
vi.mock('wouter', () => ({ useLocation: () => ['/agent/listings', harness.navigate] }));
vi.mock('@/lib/trpc', () => ({
  trpc: { land: { myListings: { useQuery: () => ({ data: harness.rows, isLoading: false, error: null }) } } },
}));

describe('AgentLandListings', () => {
  it('shows state, rand price, and opens the listing', () => {
    harness.rows = [
      { listingId: 11, title: 'Stand A', city: 'Pretoria', province: 'Gauteng', askingPrice: '1200000', state: 'submitted' },
      { listingId: 12, title: 'Stand B', city: 'Pretoria', province: 'Gauteng', askingPrice: '900000', state: 'changes_requested' },
    ];
    render(<AgentLandListings />);
    expect(screen.getByTestId('land-state-11').textContent).toBe('Submitted for review');
    expect(screen.getByTestId('land-state-12').textContent).toBe('Changes requested');
    expect(screen.getByText(/R1,200,000/)).toBeVisible();
    fireEvent.click(screen.getAllByRole('button', { name: 'Open' })[0]);
    expect(harness.navigate).toHaveBeenCalledWith('/agent/land/11');
  });

  it('has an empty state', () => {
    harness.rows = [];
    render(<AgentLandListings />);
    expect(screen.getByText(/no Land listings yet/)).toBeVisible();
  });
});
