import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  location: '/developer/developments',
  setLocation: vi.fn((location: string) => {
    state.location = location;
  }),
  home: {
    developments: [
      {
        market: { status: 'selling', transactionType: 'for_sale' },
        identity: {
          id: 41,
          name: 'Harbour View',
          location: { city: 'Cape Town', province: 'Western Cape' },
        },
        lifecycle: { state: 'live', latestReview: null },
        readiness: { status: 'ready', blockerCount: 0 },
        inventory: { totalUnits: 12, availableUnits: 5 },
        leads: { openLeadCount: 2, slaBreachCount: 0, capturedLeadCount: 2 },
        attention: { totalCount: 0 },
        nextAction: null,
      },
      {
        market: { status: 'sold-out', transactionType: 'for_sale' },
        identity: {
          id: 42,
          name: 'Ridge Park',
          location: { city: 'Johannesburg', province: 'Gauteng' },
        },
        lifecycle: { state: 'draft_action_required', latestReview: null },
        readiness: { status: 'blocked', blockerCount: 2 },
        inventory: { totalUnits: 8, availableUnits: 0 },
        leads: { openLeadCount: 0, slaBreachCount: 1, capturedLeadCount: 0 },
        attention: { totalCount: 1 },
        nextAction: null,
      },
      {
        market: { status: 'launching-soon', transactionType: 'for_rent' },
        identity: {
          id: 43,
          name: 'Cedar Mews',
          location: { city: 'Pretoria', province: 'Gauteng' },
        },
        lifecycle: { state: 'live', latestReview: null },
        readiness: { status: 'ready', blockerCount: 0 },
        inventory: { totalUnits: 10, availableUnits: null },
        leads: { openLeadCount: 1, slaBreachCount: 0, capturedLeadCount: 1 },
        attention: { totalCount: 1 },
        nextAction: null,
      },
    ],
  },
  useQueryMock: vi.fn(),
  deleteMutationMock: { mutate: vi.fn(), isPending: false },
}));

vi.mock('wouter', () => ({
  useLocation: () => [state.location, state.setLocation],
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({
      developer: {
        getOperatingHome: { invalidate: vi.fn() },
        getDevelopments: { invalidate: vi.fn() },
      },
    }),
    developer: {
      getOperatingHome: { useQuery: state.useQueryMock },
      deleteDevelopment: { useMutation: () => state.deleteMutationMock },
    },
  },
}));

import DevelopmentsList from './DevelopmentsList';

describe('Developer developments list filters', () => {
  beforeEach(() => {
    state.location = '/developer/developments';
    state.setLocation.mockClear();
    state.useQueryMock.mockReturnValue({ data: state.home, isLoading: false, error: null });
  });

  it.each([
    ['ready', 'Harbour View', 'Ridge Park'],
    ['available', 'Harbour View', 'Ridge Park'],
    ['attention', 'Ridge Park', 'Harbour View'],
  ])('shows only developments matching the %s filter', (filter, shown, hidden) => {
    state.location = `/developer/developments?view=all&filter=${filter}`;

    render(<DevelopmentsList />);

    expect(screen.getByText(shown)).toBeInTheDocument();
    expect(screen.queryByText(hidden)).not.toBeInTheDocument();
  });

  it('sets a shareable filter in the route when a filter is selected', () => {
    render(<DevelopmentsList />);

    fireEvent.click(screen.getByRole('button', { name: /Needs attention/ }));

    expect(state.setLocation).toHaveBeenCalledWith('/developer/developments?filter=attention');
  });
});
