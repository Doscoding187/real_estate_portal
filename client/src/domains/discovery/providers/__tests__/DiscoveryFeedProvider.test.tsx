import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DiscoveryFeedProvider, useDiscoveryFeed } from '../DiscoveryFeedProvider';
import { useDiscoveryStore } from '../../store/useDiscoveryStore';

const { useFeedQueryMock } = vi.hoisted(() => ({
  useFeedQueryMock: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    discovery: {
      getFeed: {
        useQuery: useFeedQueryMock,
      },
    },
  },
}));

function Consumer() {
  const { items, hasMore, fetchNextPage, request } = useDiscoveryFeed();

  return (
    <div>
      <div data-testid="count">{items.length}</div>
      <div data-testid="title">{items[0]?.title ?? 'none'}</div>
      <div data-testid="feed-type">{request.feedType}</div>
      <div data-testid="offset">{request.offset}</div>
      <div data-testid="has-more">{String(hasMore)}</div>
      <button onClick={fetchNextPage}>Next</button>
    </div>
  );
}

function resetDiscoveryStore() {
  useDiscoveryStore.persist.clearStorage();
  useDiscoveryStore.setState({
    query: {
      mode: 'feed',
      limit: 20,
    },
    activeItemId: undefined,
  });
}

describe('DiscoveryFeedProvider', () => {
  beforeEach(() => {
    resetDiscoveryStore();
    useFeedQueryMock.mockReset();
    const firstPage = {
      data: {
        items: [
          {
            id: 101,
            title: 'Discovery One',
            contentType: 'short',
            thumbnailUrl: 'https://example.com/one.jpg',
          },
        ],
        hasMore: true,
        offset: 1,
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    };
    const secondPage = {
      data: {
        items: [
          {
            id: 202,
            title: 'Discovery Two',
            contentType: 'short',
            thumbnailUrl: 'https://example.com/two.jpg',
          },
        ],
        hasMore: false,
        offset: 2,
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    };

    useFeedQueryMock.mockImplementation((input: { cursor?: string; category?: string }) => {
      const offset = Number(input?.cursor ?? 0);

      if (offset === 0) {
        return firstPage;
      }

      return secondPage;
    });
  });

  it('maps the legacy feed response into canonical discovery items', async () => {
    render(
      <DiscoveryFeedProvider>
        <Consumer />
      </DiscoveryFeedProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('1');
    });

    expect(screen.getByTestId('title')).toHaveTextContent('Discovery One');
    expect(screen.getByTestId('feed-type')).toHaveTextContent('recommended');
  });

  it('appends the next page when fetchNextPage advances the cursor', async () => {
    render(
      <DiscoveryFeedProvider>
        <Consumer />
      </DiscoveryFeedProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('1');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'Next' }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('2');
    });

    expect(screen.getByTestId('offset')).toHaveTextContent('1');
    expect(screen.getByTestId('has-more')).toHaveTextContent('false');
  });

  it('switches to a category request when the discovery query adds a category', async () => {
    render(
      <DiscoveryFeedProvider>
        <Consumer />
      </DiscoveryFeedProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('feed-type')).toHaveTextContent('recommended');
    });

    act(() => {
      useDiscoveryStore.getState().setQuery({ category: 'property' });
    });

    await waitFor(() => {
      expect(screen.getByTestId('feed-type')).toHaveTextContent('category');
    });
  });
});
