import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  query: {} as Record<string, unknown>,
  refetch: vi.fn(),
  queryInput: undefined as unknown,
}));

vi.stubGlobal(
  'ResizeObserver',
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

vi.mock('@/lib/trpc', () => ({
  trpc: {
    cataloguePublisher: {
      listPublishersByProvince: {
        useQuery: (input: unknown) => {
          testState.queryInput = input;
          return testState.query;
        },
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
    testState.queryInput = undefined;
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

    render(<TopDevelopers selectedProvince="Gauteng" />);

    const loading = screen.getByTestId('developer-feed-loading');
    const skeletons = within(loading).getAllByTestId('developer-profile-skeleton');
    expect(skeletons).toHaveLength(3);
    expect(skeletons[0]).toHaveClass('flex-[0_0_78%]');
    expect(screen.queryByText('Developer profiles are being prepared')).not.toBeInTheDocument();
  });

  it('offers retry when profile retrieval fails instead of claiming the catalogue is empty', () => {
    testState.query = { ...testState.query, isError: true };

    render(<TopDevelopers selectedProvince="Gauteng" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Developer profiles could not be loaded');
    expect(screen.queryByText('Developer profiles are being prepared')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(testState.refetch).toHaveBeenCalledTimes(1);
  });

  it('uses the catalogue empty state only for a successful empty response', () => {
    testState.query = { ...testState.query, data: [] };

    render(<TopDevelopers selectedProvince="Gauteng" />);

    expect(screen.getByText('No developers are currently building in Gauteng')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByTestId('developer-feed-loading')).not.toBeInTheDocument();
  });

  it('uses the selected province and presents local evidence, not a featured claim', () => {
    testState.query = {
      ...testState.query,
      data: [
        {
          id: 1,
          slug: 'local-builder',
          brandName: 'Local Builder',
          logoUrl: null,
          headOfficeLocation: 'Johannesburg',
          localStats: { activeDevelopments: 3, sellingNow: 2, launchingSoon: 1 },
        },
      ],
    };

    render(<TopDevelopers selectedProvince="Gauteng" />);

    expect(testState.queryInput).toEqual({ province: 'Gauteng', limit: 12 });
    expect(screen.getByRole('heading', { name: 'Developers building in Gauteng' })).toBeInTheDocument();
    expect(screen.getByText('Active in Gauteng')).toBeInTheDocument();
    expect(screen.getByText('Selling now')).toBeInTheDocument();
    expect(screen.queryByText(/featured/i)).not.toBeInTheDocument();
  });
});
