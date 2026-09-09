import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authState: { isAuthenticated: true, loading: false },
  guestState: {
    viewedProperties: [990001],
    favoriteProperties: [990001],
    getActivityCounts: vi.fn(() => ({ viewed: 1, favorites: 1, searches: 0 })),
    getGuestData: vi.fn(() => ({
      viewedProperties: [990001],
      favoriteProperties: [990001],
      recentSearches: [],
      lastUpdated: '2026-09-09T00:00:00.000Z',
    })),
    clearGuestData: vi.fn(),
  },
  mutation: {
    mutate: vi.fn(),
    isPending: false,
  },
  favoritesInvalidate: vi.fn(),
  useMutation: vi.fn(),
  mutationOptions: undefined as
    | {
        onSuccess?: (result: { migratedViews: number; migratedFavorites: number }) => void;
        onError?: (error: Error) => void;
      }
    | undefined,
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => mocks.authState,
}));

vi.mock('@/contexts/GuestActivityContext', () => ({
  useGuestActivity: () => mocks.guestState,
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({
      properties: {
        getFavorites: {
          invalidate: mocks.favoritesInvalidate,
        },
      },
    }),
    guestMigration: {
      migrateGuestData: {
        useMutation: (options: typeof mocks.mutationOptions) => {
          mocks.mutationOptions = options;
          return mocks.mutation;
        },
      },
    },
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn() },
}));

import { useGuestDataMigration } from '../useGuestDataMigration';

describe('useGuestDataMigration persistence contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authState.isAuthenticated = true;
    mocks.authState.loading = false;
    mocks.mutation.isPending = false;
    mocks.favoritesInvalidate.mockReset();
    mocks.mutationOptions = undefined;
    mocks.guestState.getActivityCounts.mockReturnValue({ viewed: 1, favorites: 1, searches: 0 });
    mocks.guestState.getGuestData.mockReturnValue({
      viewedProperties: [990001],
      favoriteProperties: [990001],
      recentSearches: [],
      lastUpdated: '2026-09-09T00:00:00.000Z',
    });
  });

  it('retains transferable guest activity when the server transaction fails', async () => {
    renderHook(() => useGuestDataMigration());

    await waitFor(() => expect(mocks.mutation.mutate).toHaveBeenCalledTimes(1));
    expect(mocks.mutation.mutate).toHaveBeenCalledWith({
      viewedProperties: [990001],
      favoriteProperties: [990001],
    });
    expect(mocks.mutationOptions?.onError).toBeTypeOf('function');

    mocks.mutationOptions?.onError?.(new Error('injected transfer failure'));

    expect(mocks.guestState.clearGuestData).not.toHaveBeenCalled();
    expect(mocks.favoritesInvalidate).not.toHaveBeenCalled();
    expect(mocks.guestState.getGuestData()).toMatchObject({
      viewedProperties: [990001],
      favoriteProperties: [990001],
    });
  });

  it('clears transferable guest activity only after server success', async () => {
    renderHook(() => useGuestDataMigration());
    await waitFor(() => expect(mocks.mutation.mutate).toHaveBeenCalledTimes(1));

    mocks.mutationOptions?.onSuccess?.({ migratedViews: 1, migratedFavorites: 1 });
    expect(mocks.guestState.clearGuestData).toHaveBeenCalledTimes(1);
    expect(mocks.favoritesInvalidate).toHaveBeenCalledTimes(1);
  });
});
