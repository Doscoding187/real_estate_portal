import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  query: {} as Record<string, unknown>,
  refetch: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    developer: {
      getHomeTrendingFeed: {
        useQuery: () => testState.query,
      },
    },
  },
}));

import { HomeTrendingSection } from './HomeTrendingSection';

function renderSection() {
  return render(
    <HomeTrendingSection
      selectedProvince="Gauteng"
      onProvinceChange={vi.fn()}
      activeHeroTab="buy"
    />,
  );
}

describe('HomeTrendingSection request states', () => {
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

  it('uses a compact horizontal mobile skeleton while published property is loading', () => {
    testState.query = { ...testState.query, isLoading: true };

    renderSection();

    const loading = screen.getByTestId('home-property-feed-loading');
    const skeletons = within(loading).getAllByTestId('home-property-skeleton');
    expect(skeletons).toHaveLength(3);
    expect(skeletons[0]).toHaveClass('flex-[0_0_77%]', 'p-3');
    expect(screen.queryByText(/No published matches/)).not.toBeInTheDocument();
  });

  it('shows a retryable service error rather than presenting the request as an empty result', () => {
    testState.query = { ...testState.query, isError: true };

    renderSection();

    expect(screen.getByRole('alert')).toHaveTextContent('Property could not be loaded');
    expect(screen.queryByText(/No published matches/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(testState.refetch).toHaveBeenCalledTimes(1);
  });

  it('shows a truthful empty state only after a successful empty response', () => {
    testState.query = { ...testState.query, data: { items: [] } };

    renderSection();

    expect(screen.getByText('No published matches in Gauteng yet')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByTestId('home-property-feed-loading')).not.toBeInTheDocument();
  });
});
