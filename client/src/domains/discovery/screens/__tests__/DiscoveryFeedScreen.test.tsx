import { render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import DiscoveryFeedScreen, { DiscoveryVideoViewport } from '../DiscoveryFeedScreen';

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

vi.mock('wouter', () => ({
  Link: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('../../store/useDiscoveryStore', () => ({
  useDiscoveryStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      query: { mode: 'feed', limit: 20 },
      setQuery: vi.fn(),
      resetFilters: vi.fn(),
      getActiveFilterCount: () => 0,
    }),
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

  it('keeps a deterministic parent-platform escape available in the feed fallback state', () => {
    useDiscoveryFeedMock.mockReturnValue({
      items: [],
      isLoading: false,
      isFetching: false,
      error: new Error('network'),
      hasMore: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
      query: { mode: 'feed', limit: 20 },
    });

    render(<DiscoveryFeedScreen />);

    expect(screen.getByRole('link', { name: 'Back to Property Listify' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByRole('link', { name: 'Back to Explore' })).toHaveAttribute(
      'href',
      '/explore',
    );
  });
});
