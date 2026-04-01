import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DiscoveryFeedMode, DiscoveryQuery } from '../../../../../shared/discovery/contracts';
import { DEFAULT_DISCOVERY_PAGE_SIZE } from '../../../../../shared/discovery/contracts';

export interface DiscoveryState {
  query: DiscoveryQuery;
  activeItemId?: string;
  setQuery: (partial: Partial<DiscoveryQuery>) => void;
  setMode: (mode: DiscoveryFeedMode) => void;
  setCursor: (cursor?: string) => void;
  resetFilters: () => void;
  setActiveItem: (id?: string) => void;
  getActiveFilterCount: () => number;
}

function createInitialQuery(mode: DiscoveryFeedMode = 'feed'): DiscoveryQuery {
  return {
    mode,
    limit: DEFAULT_DISCOVERY_PAGE_SIZE,
  };
}

function shouldResetCursor(partial: Partial<DiscoveryQuery>): boolean {
  return Object.keys(partial).some(key => key !== 'cursor' && key !== 'limit');
}

export const useDiscoveryStore = create<DiscoveryState>()(
  persist(
    (set, get) => ({
      query: createInitialQuery(),
      activeItemId: undefined,

      setQuery: partial =>
        set(state => ({
          query: {
            ...state.query,
            ...partial,
            cursor: shouldResetCursor(partial) ? undefined : partial.cursor ?? state.query.cursor,
          },
        })),

      setMode: mode =>
        set(state => ({
          query: {
            ...state.query,
            mode,
            cursor: undefined,
          },
          activeItemId: mode === 'shorts' ? state.activeItemId : undefined,
        })),

      setCursor: cursor =>
        set(state => ({
          query: {
            ...state.query,
            cursor,
          },
        })),

      resetFilters: () =>
        set(state => ({
          query: createInitialQuery(state.query.mode),
          activeItemId: state.query.mode === 'shorts' ? state.activeItemId : undefined,
        })),

      setActiveItem: id => set({ activeItemId: id }),

      getActiveFilterCount: () => {
        const query = get().query;
        let count = 0;

        if (query.intent) count++;
        if (query.location) count++;
        if (query.category) count++;
        if (query.priceRange?.min !== undefined || query.priceRange?.max !== undefined) count++;
        if (query.creatorActorId !== undefined) count++;
        if (query.contentType) count++;

        return count;
      },
    }),
    {
      name: 'discovery-store',
      version: 1,
      partialize: state => ({
        query: state.query,
        activeItemId: state.activeItemId,
      }),
    },
  ),
);
