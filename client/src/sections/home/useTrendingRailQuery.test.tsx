import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useQuery } = vi.hoisted(() => ({ useQuery: vi.fn() }));

vi.mock('@/lib/trpc', () => ({
  trpc: { properties: { searchPublicInventory: { useQuery } } },
}));

import {
  isTrendingRailLegacyMode,
  resetTrendingRailLegacyMode,
  useTrendingRailQuery,
} from './useTrendingRailQuery';

const PLACE = 'pl-place-01-131e3e75ad70424e0f9c869a';
const refetch = vi.fn();
const photo = 'https://cdn.example.com/home.jpg';
const listing = { kind: 'property', id: '1', title: 'Home', image: photo, href: '/property/1' };
const unit = { kind: 'development', id: '5:u', title: '2-bed', image: photo, href: '/x/unit/u' };

const idle = { data: undefined, isLoading: false, isError: false, isFetching: false, refetch };
const badRequest = Object.assign(new Error('Unrecognized key'), { data: { code: 'BAD_REQUEST' } });

/** Answers by input shape: enhanced inputs carry sortOption 'trending', the previous ones do not. */
function answer(enhanced: Record<string, unknown>, previous: Record<string, unknown>) {
  useQuery.mockImplementation((input: { sortOption?: string }) =>
    input.sortOption === 'trending' ? { ...idle, ...enhanced } : { ...idle, ...previous },
  );
}

function render() {
  return renderHook(() =>
    useTrendingRailQuery({ listingType: 'sale', canonicalPlaceId: PLACE, enabled: true }),
  );
}

describe('useTrendingRailQuery', () => {
  beforeEach(() => {
    resetTrendingRailLegacyMode();
    useQuery.mockReset();
  });

  it('uses the enhanced query and keeps unit types and server order untouched', () => {
    answer({ data: { cards: [listing, unit] } }, {});
    const { result } = render();

    expect(result.current.mode).toBe('enhanced');
    expect(result.current.cards).toEqual([listing, unit]);
    expect(useQuery.mock.calls[0][0]).toEqual({
      listingType: 'sale',
      canonicalPlaceId: PLACE,
      sortOption: 'trending',
      requirePhoto: true,
      developmentResultShape: 'unit_type',
      page: 0,
      pageSize: 10,
    });
    expect(useQuery.mock.calls[0][1]).toEqual({ enabled: true, retry: false });
    expect(useQuery.mock.calls[1][1]).toEqual({ enabled: false, retry: false });
    expect(isTrendingRailLegacyMode()).toBe(false);
  });

  it('falls back to the previous query on BAD_REQUEST and remembers it for the session', async () => {
    const noPhoto = { ...listing, id: '2', image: '' };
    answer(
      { isError: true, error: badRequest },
      { data: { cards: [listing, noPhoto, unit] } },
    );
    const { result, unmount } = render();

    await waitFor(() => expect(result.current.mode).toBe('legacy'));
    expect(result.current.isError).toBe(false);
    // Previous behaviour: client photo filter, developments dropped.
    expect(result.current.cards).toEqual([listing]);
    expect(isTrendingRailLegacyMode()).toBe(true);
    const legacyCall = useQuery.mock.calls.find(
      ([input, options]) => input.sortOption === 'date_desc' && options.enabled === true,
    );
    expect(legacyCall?.[0]).toEqual({
      listingType: 'sale',
      listingSource: 'manual',
      canonicalPlaceId: PLACE,
      sortOption: 'date_desc',
      page: 0,
      pageSize: 10,
    });

    // A later mount (for example another province) goes straight to the previous query.
    unmount();
    useQuery.mockClear();
    render();
    const enhancedCalls = useQuery.mock.calls.filter(([input]) => input.sortOption === 'trending');
    expect(enhancedCalls.every(([, options]) => options.enabled === false)).toBe(true);
  });

  it('stays loading, not error, while switching to the previous query', () => {
    answer({ isError: true, error: badRequest }, { isLoading: true });
    const { result } = render();
    expect(result.current.isError).toBe(false);
  });

  it('reports any other error as an error and does not switch', () => {
    answer(
      { isError: true, error: Object.assign(new Error('boom'), { data: { code: 'INTERNAL_SERVER_ERROR' } }) },
      {},
    );
    const { result } = render();

    expect(result.current.mode).toBe('enhanced');
    expect(result.current.isError).toBe(true);
    expect(isTrendingRailLegacyMode()).toBe(false);
  });

  it('runs no query when disabled', () => {
    answer({}, {});
    renderHook(() =>
      useTrendingRailQuery({ listingType: 'sale', canonicalPlaceId: PLACE, enabled: false }),
    );
    expect(useQuery.mock.calls.every(([, options]) => options.enabled === false)).toBe(true);
  });
});
