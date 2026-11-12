import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  query: {} as Record<string, unknown>,
  refetch: vi.fn(),
  queryInput: undefined as unknown,
  queryOptions: undefined as unknown,
  placeId: 'pl-place-01-000000000000000000000001',
  developmentsEnabled: true,
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
      listPublishers: {
        useQuery: (input: unknown, options: unknown) => {
          testState.queryInput = input;
          testState.queryOptions = options;
          return testState.query;
        },
      },
    },
  },
}));

vi.mock('@/components/location/CanonicalPlaceSelector', () => ({
  CanonicalPlaceSelector: ({ value, onChange }: any) => (
    <button
      type="button"
      aria-label="Select canonical Place fixture"
      onClick={() =>
        onChange({
          canonicalPlaceId: testState.placeId,
          label: 'Reviewed Place',
          placeType: 'locality',
          scope: { kind: 'locality', canonicalPlaceId: testState.placeId },
          administrativeContext: null,
        })
      }
    >
      {value?.label || 'Select canonical Place'}
    </button>
  ),
}));

vi.mock('wouter', () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/publicNavigation', () => ({
  isHomepageHeroJourneyEnabled: () => testState.developmentsEnabled,
}));

import { TopDevelopers } from './TopDevelopers';

describe('TopDevelopers canonical Place scope', () => {
  beforeEach(() => {
    testState.refetch.mockReset();
    testState.refetch.mockResolvedValue(undefined);
    testState.queryInput = undefined;
    testState.developmentsEnabled = true;
    testState.query = {
      data: undefined,
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: testState.refetch,
    };
  });

  it('uses compact horizontal profile skeletons while loading', () => {
    testState.query = { ...testState.query, isLoading: true };

    render(<TopDevelopers />);

    const loading = screen.getByTestId('developer-feed-loading');
    const skeletons = within(loading).getAllByTestId('developer-profile-skeleton');
    expect(skeletons).toHaveLength(3);
    expect(skeletons[0]).toHaveClass('flex-[0_0_78%]');
  });

  it('offers retry when profile retrieval fails', () => {
    testState.query = { ...testState.query, isError: true };

    render(<TopDevelopers />);

    expect(screen.getByRole('alert')).toHaveTextContent('Developer profiles could not be loaded');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(testState.refetch).toHaveBeenCalledTimes(1);
  });

  it('shows a designed empty state when the publisher list is empty', () => {
    testState.query = { ...testState.query, data: [] };

    render(<TopDevelopers />);

    expect(screen.getByRole('heading', { name: 'Explore real estate developers' })).toBeInTheDocument();
    expect(screen.getByText('New developments are launching soon.')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Are you a developer\? List your development/ }),
    ).toHaveAttribute('href', '/advertise/sell/developers');
  });

  it('shows the same empty state, with no developer profiles, while developments are held', () => {
    testState.developmentsEnabled = false;
    testState.query = {
      ...testState.query,
      data: [{ id: 1, slug: 'local-builder', brandName: 'Local Builder', developmentCount: 3 }],
    };

    render(<TopDevelopers />);

    expect(screen.getByRole('heading', { name: 'Explore real estate developers' })).toBeInTheDocument();
    expect(screen.getByText('New developments are launching soon.')).toBeInTheDocument();
    expect(screen.queryByText('Local Builder')).not.toBeInTheDocument();
    expect(testState.queryOptions).toEqual({ enabled: false });
  });

  it('filters and carries links by the exact selected Place ID', () => {
    testState.query = {
      ...testState.query,
      data: [
        {
          id: 1,
          slug: 'local-builder',
          brandName: 'Local Builder',
          developmentCount: 3,
        },
      ],
    };

    render(<TopDevelopers />);
    fireEvent.click(screen.getByRole('button', { name: 'Select canonical Place fixture' }));

    expect(testState.queryInput).toEqual({ canonicalPlaceId: testState.placeId, limit: 12 });
    expect(
      screen.getByRole('heading', { name: 'Developers with projects in Reviewed Place' }),
    ).toBeInTheDocument();
    expect(screen.getByText('3 public projects')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View projects' })).toHaveAttribute(
      'href',
      `/developer/local-builder?canonicalPlaceId=${testState.placeId}#developments`,
    );
    expect(screen.getByRole('link', { name: 'Developer profile' })).toHaveAttribute(
      'href',
      `/developer/local-builder?canonicalPlaceId=${testState.placeId}`,
    );
    expect(screen.getByRole('link', { name: /Explore developers/ })).toHaveAttribute(
      'href',
      `/developers?canonicalPlaceId=${testState.placeId}`,
    );
  });
});
