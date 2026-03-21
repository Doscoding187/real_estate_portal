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
  const { items, hasMore, fetchNextPage } = useDiscoveryFeed();

  return (
    <div>
      <div data-testid="count">{items.length}</div>
      <div data-testid="title">{items[0]?.title ?? 'none'}</div>
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
            id: '101',
            title: 'Discovery One',
            type: 'video',
            media: {
              coverUrl: 'https://example.com/one.jpg',
              videoUrl: 'https://example.com/one.mp4',
            },
            engagement: {
              likes: 10,
              saves: 4,
              views: 120,
            },
            metadata: {
              actor: { id: 7 },
            },
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
            id: '202',
            title: 'Discovery Two',
            type: 'video',
            media: {
              coverUrl: 'https://example.com/two.jpg',
              videoUrl: 'https://example.com/two.mp4',
            },
            engagement: {
              likes: 8,
              saves: 3,
              views: 90,
            },
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

  it('reads canonical discovery items directly from the discovery router response', async () => {
    render(
      <DiscoveryFeedProvider>
        <Consumer />
      </DiscoveryFeedProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('1');
    });

    expect(screen.getByTestId('title')).toHaveTextContent('Discovery One');
    expect(useFeedQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'feed',
        limit: 20,
      }),
      expect.any(Object),
    );
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

    expect(useFeedQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cursor: '1',
      }),
      expect.any(Object),
    );
    expect(screen.getByTestId('has-more')).toHaveTextContent('false');
  });

  it('switches to a category request when the discovery query adds a category', async () => {
    render(
      <DiscoveryFeedProvider>
        <Consumer />
      </DiscoveryFeedProvider>,
    );

    await waitFor(() => expect(useFeedQueryMock).toHaveBeenCalled());

    act(() => {
      useDiscoveryStore.getState().setQuery({ category: 'property' });
    });

    await waitFor(() => {
      expect(useFeedQueryMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          category: 'property',
        }),
        expect.any(Object),
      );
    });
  });
});
