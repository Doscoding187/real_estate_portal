import type { RefObject } from 'react';
import type { LocationNode } from '@/types/location';
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomeSearchProvider, useHomeSearch } from '@/contexts/HomeSearchContext';
import { HomeAreaPicker } from '@/components/HomeAreaPicker';
import { EnhancedHero } from '@/components/EnhancedHero';
import { DiscoverProperties } from '@/components/DiscoverProperties';
import type { SearchDiscoveryResult } from '@shared/searchDiscovery';
const { navigate, lookup } = vi.hoisted(() => ({ navigate: vi.fn(), lookup: vi.fn() }));
vi.mock('wouter', () => ({ useLocation: () => ['/', navigate] }));
vi.mock('embla-carousel-react', () => ({ default: () => [vi.fn(), undefined] }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    location: { searchDiscoverySuggestions: { useQuery: (...args: unknown[]) => lookup(...args) } },
  },
}));
vi.mock('@/components/LocationAutosuggest', () => ({
  LocationAutosuggest: (props: {
    inputRef?: RefObject<HTMLInputElement | null>;
    onChange?: (query: string) => void;
    onSelect?: (location: LocationNode) => void;
    selectedLocations?: LocationNode[];
  }) => (
    <>
      <input
        ref={props.inputRef}
        role="combobox"
        aria-label="Hero location"
        onChange={e => props.onChange?.(e.target.value)}
      />
      {props.selectedLocations?.map((l: LocationNode) => (
        <span key={l.id}>{l.name}</span>
      ))}
      <button
        type="button"
        onClick={() =>
          props.onSelect?.({
            id: 'city:12',
            canonicalLocationId: 'city:12',
            name: 'Johannesburg',
            type: 'city',
            slug: 'johannesburg',
            provinceSlug: 'gauteng',
          })
        }
      >
        Select broad city
      </button>
      <button
        type="button"
        onClick={() =>
          props.onSelect?.({
            id: 'suburb:34',
            canonicalLocationId: 'suburb:34',
            name: 'Rosebank',
            type: 'suburb',
            slug: 'rosebank',
            citySlug: 'johannesburg',
            provinceSlug: 'gauteng',
          })
        }
      >
        Select precise area
      </button>
    </>
  ),
}));
const city: SearchDiscoveryResult = {
  kind: 'canonical_location',
  canonicalLocationId: 'city:12',
  factualLevel: 'city',
  searchScopeKind: 'metro_city',
  label: 'Johannesburg',
  provinceSlug: 'gauteng',
  citySlug: 'johannesburg',
  display: { typeLabel: 'City' },
  canonicalPath: '/gauteng/johannesburg',
  source: 'canonical_geography',
};
const locality: SearchDiscoveryResult = {
  ...city,
  canonicalLocationId: 'suburb:34',
  factualLevel: 'suburb',
  searchScopeKind: 'locality',
  suburbSlug: 'rosebank',
  label: 'Rosebank',
  display: { typeLabel: 'Suburb', contextLabel: 'Johannesburg' },
};
const area: SearchDiscoveryResult = {
  kind: 'search_area',
  searchAreaId: 'metro-north',
  label: 'Metro North',
  display: { typeLabel: 'Property market area', contextLabel: 'Johannesburg' },
  lifecycle: 'active',
  availability: 'available',
  publicEligible: true,
  supportedJourneys: ['buy', 'rent'],
  source: 'search_area',
};
function SetBudget() {
  const shared = useHomeSearch()!;
  return (
    <button onClick={() => shared.setFilters(f => ({ ...f, priceMax: '2000000' }))}>
      Set test budget
    </button>
  );
}
function show() {
  render(
    <HomeSearchProvider journey="buy" onJourneyChange={vi.fn()}>
      <SetBudget />
      <EnhancedHero activeTab="buy" />
      <DiscoverProperties withinContentRail />
    </HomeSearchProvider>,
  );
}
beforeEach(() => {
  lookup.mockReturnValue({
    data: [city, area, locality],
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  });
});
afterEach(cleanup);
describe('Homepage explicit location clarification', () => {
  it('keeps a broad Buy search on the homepage until the visitor chooses scope, retaining filters', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Set test budget' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select broad city' }));
    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    expect(navigate).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Which part of Johannesburg?')).toBeTruthy();
    expect(within(dialog).getByText('Start with a market area')).toBeTruthy();
    expect(within(dialog).queryByRole('option', { name: /Rosebank/ })).toBeNull();
    fireEvent.click(within(dialog).getByRole('option', { name: /Metro North/ }));
    const url = new URL(navigate.mock.calls[0][0], 'http://localhost');
    expect(url.searchParams.get('searchAreaId')).toBe(area.searchAreaId);
    expect(url.searchParams.get('maxPrice')).toBe('2000000');
    expect(url.searchParams.has('locationId')).toBe(false);
  });
  it('makes city-wide search an explicit choice', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Select broad city' }));
    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Browse all Johannesburg' }));
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining('locationId=city%3A12'));
  });
  it('retains a realistic monthly rental budget through city clarification', () => {
    render(
      <HomeSearchProvider journey="rent" onJourneyChange={vi.fn()}>
        <EnhancedHero activeTab="rent" />
      </HomeSearchProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Select broad city' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Monthly budget' }));
    fireEvent.click(screen.getByRole('option', { name: 'R10k' }));
    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    expect(navigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Browse all Johannesburg' }));
    const url = new URL(navigate.mock.calls[0][0], 'http://localhost');
    expect(url.pathname).toBe('/property-to-rent');
    expect(url.searchParams.get('maxPrice')).toBe('10000');
    expect(url.searchParams.get('locationId')).toBe('city:12');
  });
  it('keeps the price range open while focusing and choosing a portalled price option', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Any price', exact: true }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Maximum price' }));
    const option = screen.getByRole('option', { name: 'R2m', exact: true });
    fireEvent.focus(option);
    expect(
      screen.getByRole('combobox', { name: 'Maximum price', hidden: true }),
    ).toBeInTheDocument();
    fireEvent.pointerDown(option);
    fireEvent.click(option);
    expect(screen.getByRole('button', { name: 'Up to R2m' })).toBeInTheDocument();
  });
  it('does not interrupt a precise hero search and shares its area with category cards', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Select precise area' }));
    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining('locationId=suburb%3A34'));
    navigate.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /^Houses/ }));
    const url = new URL(navigate.mock.calls[0][0], 'http://localhost');
    expect(url.searchParams.get('locationId')).toBe('suburb:34');
    expect(url.searchParams.get('propertyType')).toBe('house');
  });
  it('does not assume Cape Town and clarifies a category click with no chosen area', () => {
    show();
    expect(screen.getByText('Where would you like to look?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Houses/ }));
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Browse all Cape Town' })).toBeNull();
  });
  it('retains the city category and uses its selected authority rather than name-only URLs', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Johannesburg', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: /^Houses/ }));
    expect(navigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Browse all Johannesburg' }));
    const url = new URL(navigate.mock.calls[0][0], 'http://localhost');
    expect(url.searchParams.get('locationId')).toBe('city:12');
    expect(url.searchParams.get('propertyType')).toBe('house');
  });
  it('leaves location-only exploration on its existing discovery route', () => {
    render(
      <HomeSearchProvider journey="" onJourneyChange={vi.fn()}>
        <EnhancedHero />
      </HomeSearchProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Select broad city' }));
    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/gauteng/johannesburg');
  });
  it('supports choosing an area using the keyboard', () => {
    const confirm = vi.fn();
    render(
      <HomeAreaPicker
        open
        onOpenChange={vi.fn()}
        initialSelection={{ locations: [], searchArea: null }}
        cityHint="Johannesburg"
        journey="buy"
        onConfirm={confirm}
        onExplore={vi.fn()}
      />,
    );
    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getByRole('option', { name: /Metro North/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        searchArea: expect.objectContaining({ searchAreaId: 'metro-north' }),
      }),
    );
  });
  it('distinguishes area lookup errors and prevents stale query selection', async () => {
    const confirm = vi.fn();
    const retry = vi.fn();
    lookup.mockReturnValue({ isError: true, isFetching: false, refetch: retry });
    const view = render(
      <HomeAreaPicker
        open
        onOpenChange={vi.fn()}
        initialSelection={{ locations: [], searchArea: null }}
        cityHint="Johannesburg"
        journey="buy"
        onConfirm={confirm}
        onExplore={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t load areas');
    expect(screen.queryByText(/No selectable/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
    view.unmount();
    lookup.mockReturnValue({ data: [city, locality], isFetching: false, isError: false });
    render(
      <HomeAreaPicker
        open
        onOpenChange={vi.fn()}
        initialSelection={{ locations: [], searchArea: null }}
        cityHint="Johannesburg"
        journey="buy"
        onConfirm={confirm}
        onExplore={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Camps' } });
    expect(screen.getByRole('status')).toHaveTextContent('Finding areas');
    expect(screen.queryByRole('option', { name: /Rosebank/ })).toBeNull();
    expect(confirm).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(lookup).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'Camps' }),
        expect.anything(),
      ),
    );
  });
});
