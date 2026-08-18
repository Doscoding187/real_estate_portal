import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  query: {} as Record<string, unknown>,
  refetch: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    cataloguePublisher: {
      listPublishers: {
        useQuery: () => testState.query,
      },
    },
  },
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/', vi.fn()],
}));

import { TopDevelopers } from './TopDevelopers';

describe('TopDevelopers request states', () => {
  beforeEach(() => {
    testState.refetch.mockReset();
    testState.refetch.mockResolvedValue(undefined);
    testState.query = {
      data: undefined,
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: testState.refetch,
    };
  });

  it('uses compact horizontal profile skeletons on mobile', () => {
    testState.query = { ...testState.query, isLoading: true };

    render(<TopDevelopers />);

    const loading = screen.getByTestId('developer-feed-loading');
    const skeletons = within(loading).getAllByTestId('developer-profile-skeleton');
    expect(skeletons).toHaveLength(3);
    expect(skeletons[0]).toHaveClass('flex-[0_0_78%]');
    expect(screen.queryByText('Developer profiles are being prepared')).not.toBeInTheDocument();
  });

  it('offers retry when profile retrieval fails instead of claiming the catalogue is empty', () => {
    testState.query = { ...testState.query, isError: true };

    render(<TopDevelopers />);

    expect(screen.getByRole('alert')).toHaveTextContent('Developer profiles could not be loaded');
    expect(screen.queryByText('Developer profiles are being prepared')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(testState.refetch).toHaveBeenCalledTimes(1);
  });

  it('uses the catalogue empty state only for a successful empty response', () => {
    testState.query = { ...testState.query, data: [] };

    render(<TopDevelopers />);

    expect(screen.getByText('Developer profiles are being prepared')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByTestId('developer-feed-loading')).not.toBeInTheDocument();
  });
});
