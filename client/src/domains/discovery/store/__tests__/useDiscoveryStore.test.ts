import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_DISCOVERY_PAGE_SIZE } from '../../../../../../shared/discovery/contracts';
import { useDiscoveryStore } from '../useDiscoveryStore';

function resetDiscoveryStore() {
  useDiscoveryStore.persist.clearStorage();
  useDiscoveryStore.setState({
    query: {
      mode: 'feed',
      limit: DEFAULT_DISCOVERY_PAGE_SIZE,
    },
    activeItemId: undefined,
  });
}

describe('useDiscoveryStore', () => {
  beforeEach(() => {
    resetDiscoveryStore();
  });

  it('initializes with the canonical default query', () => {
    const state = useDiscoveryStore.getState();

    expect(state.query).toEqual({
      mode: 'feed',
      limit: DEFAULT_DISCOVERY_PAGE_SIZE,
    });
    expect(state.activeItemId).toBeUndefined();
  });

  it('resets the pagination cursor when non-pagination query fields change', () => {
    const { setCursor, setQuery } = useDiscoveryStore.getState();

    setCursor('cursor-1');
    setQuery({ category: 'property', priceRange: { min: 1000000 } });

    expect(useDiscoveryStore.getState().query).toEqual({
      mode: 'feed',
      limit: DEFAULT_DISCOVERY_PAGE_SIZE,
      category: 'property',
      priceRange: { min: 1000000 },
      cursor: undefined,
    });
  });

  it('preserves the active mode when filters reset', () => {
    const { setMode, setQuery, resetFilters } = useDiscoveryStore.getState();

    setMode('shorts');
    setQuery({
      category: 'property',
      contentType: 'video',
      cursor: 'cursor-2',
    });
    resetFilters();

    expect(useDiscoveryStore.getState().query).toEqual({
      mode: 'shorts',
      limit: DEFAULT_DISCOVERY_PAGE_SIZE,
    });
  });

  it('clears the cursor when switching discovery modes', () => {
    const { setCursor, setMode } = useDiscoveryStore.getState();

    setCursor('cursor-3');
    setMode('home');

    expect(useDiscoveryStore.getState().query).toEqual({
      mode: 'home',
      limit: DEFAULT_DISCOVERY_PAGE_SIZE,
      cursor: undefined,
    });
  });
});
