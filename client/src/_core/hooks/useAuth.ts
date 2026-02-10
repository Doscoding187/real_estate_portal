import { getLoginUrl } from '@/const';
import { trpc } from '@/lib/trpc';
import { TRPCClientError } from '@trpc/client';
import { useCallback, useEffect, useMemo } from 'react';

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } = options ?? {};

  // Safety: trpc should always exist, but keep guard to avoid hard crashes if provider breaks
  if (!trpc) {
    console.warn(
      'TRPC context not found in useAuth hook. Ensure trpc.Provider is correctly set up.',
    );
    return {
      user: null,
      loading: false,
      error: new Error('TRPC context not available'),
      isAuthenticated: false,
      refresh: () => {},
      logout: async () => {},
    };
  }

  const utils = trpc.useUtils();

  /**
   * IMPORTANT:
   * Call auth.me with NO input argument at all.
   * Passing `undefined` as an input causes tRPC batching metadata like meta.values:["undefined"]
   * and can break validation when server expects required input shapes.
   */
  const meQuery = trpc.auth.me.useQuery({
    retry: 0,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      // IMPORTANT: Use `null` key instead of `undefined` so cache ops match the no-input query.
      utils.auth.me.setData(null, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (error instanceof TRPCClientError && error.data?.code === 'UNAUTHORIZED') {
        return;
      }
      throw error;
    } finally {
      // Clear cached user and invalidate the no-input query
      utils.auth.me.setData(null, null);
      await utils.auth.me.invalidate();

      // Clear brand emulation context on logout
      if (typeof window !== 'undefined') {
        localStorage.removeItem('publisher-context');
        localStorage.removeItem('brandEmulation');
      }
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === 'undefined') return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
