import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DiscoveryVideoViewport } from '../DiscoveryFeedScreen';

const { useDiscoveryFeedMock, refetchMock } = vi.hoisted(() => ({
  useDiscoveryFeedMock: vi.fn(),
  refetchMock: vi.fn(),
}));

vi.mock('../../providers/DiscoveryFeedProvider', () => ({
  DiscoveryFeedProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useDiscoveryFeed: useDiscoveryFeedMock,
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    discovery: {
      engage: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
        }),
      },
    },
  },
}));

describe('DiscoveryVideoViewport', () => {
  it('renders a retry state when the discovery feed fails before items load', () => {
    useDiscoveryFeedMock.mockReturnValue({
      items: [],
      isLoading: false,
      isFetching: false,
      error: new Error('network'),
      hasMore: false,
      fetchNextPage: vi.fn(),
      refetch: refetchMock,
      query: {
        mode: 'feed',
        limit: 20,
      },
    });

    render(<DiscoveryVideoViewport />);

    expect(screen.getByText('Discovery feed is temporarily unavailable')).toBeInTheDocument();
    screen.getByRole('button', { name: /retry/i }).click();
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });
});
