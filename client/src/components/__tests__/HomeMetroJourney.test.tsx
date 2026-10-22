import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocationNode } from '@/types/location';
import type { SearchDiscoveryResult } from '@shared/searchDiscovery';
import { HomeSearchProvider } from '@/contexts/HomeSearchContext';
import { EnhancedHero } from '@/components/EnhancedHero';
import { HomeAreaPicker } from '@/components/HomeAreaPicker';

const { navigate, lookup, current } = vi.hoisted(() => ({
  navigate: vi.fn(),
  lookup: vi.fn(),
  current: { location: null as LocationNode | null },
}));
vi.mock('wouter', () => ({ useLocation: () => ['/', navigate] }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    location: {
      searchDiscoverySuggestions: { useQuery: (...args: unknown[]) => lookup(...args) },
      placeSuggestions: { useQuery: (...args: unknown[]) => lookup(...args) },
    },
  },
}));
vi.mock('@/components/LocationAutosuggest', () => ({
  LocationAutosuggest: (props: { onSelect?: (location: LocationNode) => void }) => (
    <button type="button" onClick={() => current.location && props.onSelect?.(current.location)}>
      Choose location
    </button>
  ),
}));
const cases = [
  ['Pretoria', '2', 'gauteng', 'city'],
  ['Johannesburg', '1', 'gauteng', 'city'],
  ['Cape Town', '5', 'western-cape', 'city'],
  ['Durban', '6', 'kwazulu-natal', 'city'],
  ['Bloemfontein', '4', 'free-state', 'city'],
  ['Gqeberha', '3', 'eastern-cape', 'city'],
  ['Centurion', '50', 'gauteng', 'town'],
] as const;
function discovery(location: LocationNode): SearchDiscoveryResult {
  return {
    kind: 'canonical_location',
    canonicalLocationId: location.id,
    label: location.name,
    factualLevel: 'city',
    factualType: location.factualType,
    searchScopeKind: 'metro_city',
    provinceSlug: location.provinceSlug!,
    citySlug: location.slug,
    display: { typeLabel: location.factualType === 'town' ? 'Town' : 'City' },
    canonicalPath: `/${location.provinceSlug}/${location.slug}`,
    source: 'canonical_geography',
  };
}
beforeEach(() => {
  navigate.mockClear();
  lookup.mockReset();
});
afterEach(cleanup);
describe.each(['buy', 'rent'] as const)('Country-wide homepage %s scope clarification', journey => {
  it.each(cases)(
    'clarifies %s before opening its full scope, even without finer suggestions',
    (name, id, province, factualType) => {
      const location: LocationNode = {
        id: `city:${id}`,
        canonicalLocationId: `city:${id}`,
        type: 'city',
        factualType,
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        provinceSlug: province,
      };
      current.location = location;
      lookup.mockReturnValue({ data: [discovery(location)], isFetching: false, isError: false });
      render(
        <HomeSearchProvider journey={journey} onJourneyChange={vi.fn()}>
          <EnhancedHero activeTab={journey} />
        </HomeSearchProvider>,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Choose location' }));
      fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
      expect(navigate).not.toHaveBeenCalled();
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText(`Which part of ${name}?`)).toBeInTheDocument();
      expect(within(dialog).queryByRole('option')).toBeNull();
      expect(within(dialog).getByRole('status')).toHaveTextContent(
        'Search a suburb or more specific area',
      );
      fireEvent.click(within(dialog).getByRole('button', { name: `Browse all ${name}` }));
      const url = new URL(navigate.mock.calls[0][0], 'http://localhost');
      expect(url.pathname).toBe(journey === 'buy' ? '/property-for-sale' : '/property-to-rent');
      expect(url.searchParams.get('locationId')).toBe(location.id);
      expect(url.searchParams.has('searchAreaId')).toBe(false);
    },
  );
});
it('does not turn municipality-context suggestions into a municipality-wide query', () => {
  const alberton: LocationNode = {
    id: 'city:12',
    type: 'city',
    factualType: 'town',
    name: 'Alberton',
    slug: 'alberton',
    provinceSlug: 'gauteng',
  };
  const record = discovery(alberton);
  record.display.contextLabel = 'Ekurhuleni';
  lookup.mockReturnValue({ data: [record], isFetching: false, isError: false });
  const confirm = vi.fn();
  render(
    <HomeAreaPicker
      open
      onOpenChange={vi.fn()}
      initialSelection={{ locations: [], searchArea: null }}
      cityHint="Ekurhuleni"
      journey="buy"
      onConfirm={confirm}
      onExplore={vi.fn()}
    />,
  );
  expect(screen.queryByRole('button', { name: 'Browse all Ekurhuleni' })).toBeNull();
  fireEvent.click(screen.getByRole('option', { name: /Alberton.*Ekurhuleni/ }));
  expect(confirm).not.toHaveBeenCalled();
  expect(screen.getByText('Which part of Alberton?')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Browse all Alberton' }));
  expect(confirm).toHaveBeenCalledWith(
    expect.objectContaining({
      locations: [expect.objectContaining({ id: 'city:12', name: 'Alberton' })],
      searchArea: null,
    }),
  );
});
