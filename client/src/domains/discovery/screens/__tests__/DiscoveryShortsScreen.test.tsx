import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DiscoveryShortsScreen from '../DiscoveryShortsScreen';

const { publishingEligibilityMock, authState } = vi.hoisted(() => ({
  publishingEligibilityMock: vi.fn(),
  authState: { isAuthenticated: false },
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
  useLocation: () => ['/explore/shorts', vi.fn()],
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    explore: {
      getPublishingEligibility: {
        useQuery: (...args: unknown[]) => publishingEligibilityMock(...args),
      },
    },
  },
}));

vi.mock('../../providers/DiscoveryFeedProvider', () => ({
  DiscoveryFeedProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../../store/useDiscoveryStore', () => ({
  useDiscoveryStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      query: { category: undefined },
      setQuery: vi.fn(),
    }),
}));

vi.mock('../DiscoveryFeedScreen', () => ({
  DiscoveryVideoViewport: ({
    platformBridge,
    overlay,
  }: {
    platformBridge?: ReactNode;
    overlay?: ReactNode;
  }) => (
    <div data-testid="discovery-shorts-viewport">
      {platformBridge}
      {overlay}
    </div>
  ),
}));

describe('DiscoveryShortsScreen', () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    publishingEligibilityMock.mockReturnValue({ data: undefined, isLoading: false });
  });

  it('keeps Back to Explore separate from the deterministic Property Listify exit', () => {
    render(<DiscoveryShortsScreen />);

    expect(screen.getByRole('link', { name: 'Back to Property Listify' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByRole('link', { name: 'Back to Explore' })).toHaveAttribute(
      'href',
      '/explore',
    );
  });

  it('only exposes Upload when the server-confirmed publisher eligibility is allowed', () => {
    authState.isAuthenticated = true;
    publishingEligibilityMock.mockReturnValue({ data: { allowed: false }, isLoading: false });

    const { rerender } = render(<DiscoveryShortsScreen />);
    expect(screen.queryByRole('button', { name: 'Upload content' })).not.toBeInTheDocument();

    publishingEligibilityMock.mockReturnValue({ data: { allowed: true }, isLoading: false });
    rerender(<DiscoveryShortsScreen />);
    expect(screen.getByRole('button', { name: 'Upload content' })).toBeInTheDocument();
  });
});
