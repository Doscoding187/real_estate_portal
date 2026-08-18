import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { legacyRouteId, profileRouteId, queryResult, setLocation, useQuery } = vi.hoisted(() => ({
  legacyRouteId: { current: null as string | null },
  profileRouteId: { current: null as string | null },
  queryResult: {
    current: {
      data: null as { slug: string } | null,
      isLoading: false,
    },
  },
  setLocation: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/agent/42', setLocation],
  useRoute: (pattern: string) => {
    if (pattern === '/agent/profile/:agentId') {
      return profileRouteId.current ? [true, { agentId: profileRouteId.current }] : [false, null];
    }
    if (pattern === '/agent/:id') {
      return legacyRouteId.current ? [true, { id: legacyRouteId.current }] : [false, null];
    }
    return [false, null];
  },
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    agent: {
      getPublicProfileRouteById: {
        useQuery: (input: unknown, options: unknown) => {
          useQuery(input, options);
          return queryResult.current;
        },
      },
    },
  },
}));

vi.mock('@/layouts/HomeLayout', () => ({
  HomeLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import AgentPublicProfile from './AgentPublicProfile';

describe('AgentPublicProfile numeric compatibility redirect', () => {
  beforeEach(() => {
    legacyRouteId.current = null;
    profileRouteId.current = null;
    queryResult.current = { data: null, isLoading: false };
    setLocation.mockReset();
    useQuery.mockReset();
  });

  afterEach(() => cleanup());

  it('resolves the legacy /agent/:id URL and replaces it with the canonical slug route', async () => {
    legacyRouteId.current = '42';
    queryResult.current = { data: { slug: 'jane-agent' }, isLoading: false };

    render(<AgentPublicProfile />);

    expect(useQuery).toHaveBeenCalledWith({ agentId: 42 }, { enabled: true, retry: false });
    await waitFor(() => {
      expect(setLocation).toHaveBeenCalledWith('/agents/jane-agent', { replace: true });
    });
  });

  it('rejects malformed numeric compatibility URLs without querying an arbitrary agent', () => {
    legacyRouteId.current = '42-not-an-id';

    render(<AgentPublicProfile />);

    expect(useQuery).toHaveBeenCalledWith({ agentId: 0 }, { enabled: false, retry: false });
    expect(setLocation).not.toHaveBeenCalled();
  });

  it('keeps the existing /agent/profile/:agentId alias on the same resolver', async () => {
    profileRouteId.current = '84';
    queryResult.current = { data: { slug: 'sam-agent' }, isLoading: false };

    render(<AgentPublicProfile />);

    expect(useQuery).toHaveBeenCalledWith({ agentId: 84 }, { enabled: true, retry: false });
    await waitFor(() => {
      expect(setLocation).toHaveBeenCalledWith('/agents/sam-agent', { replace: true });
    });
  });
});
