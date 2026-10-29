import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocationNode } from '@/types/location';
import type { CanonicalPlaceOption } from '@/components/location/CanonicalPlaceSelector';
import { HomeSearchProvider } from '@/contexts/HomeSearchContext';
import { EnhancedHero } from '@/components/EnhancedHero';
import { HomeAreaPicker } from '@/components/HomeAreaPicker';

const { navigate, placeLookup, current } = vi.hoisted(() => ({
  navigate: vi.fn(),
  placeLookup: vi.fn(),
  current: { location: null as LocationNode | null },
}));
vi.mock('wouter', () => ({ useLocation: () => ['/', navigate] }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    placeAuthority: {
      discover: { useQuery: (...args: unknown[]) => placeLookup(...args) },
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
function discovery(location: LocationNode): CanonicalPlaceOption {
  return {
    placeId: location.canonicalPlaceId,
    preferredPublicLabel: location.name,
    matchedName: location.name,
    matchedNameRole: 'preferred_public',
    isAliasMatch: false,
    placeType: location.factualType || 'city',
    searchEligible: true,
    searchScope: 'metro_city',
    context: { administrativeContext: 'Ekurhuleni' },
    canonicalPath: location.canonicalPath || `/${location.provinceSlug}/${location.slug}`,
  };
}
beforeEach(() => {
  navigate.mockClear();
  placeLookup.mockReturnValue({ data: undefined, isFetching: false, isError: false });
});
afterEach(cleanup);
describe.each(['buy', 'rent'] as const)('Country-wide homepage %s scope clarification', journey => {
  it.each(cases)(
    'clarifies %s before opening its full scope, even without finer suggestions',
    (name, id, province, factualType) => {
      const location: LocationNode = {
        canonicalPlaceId: `pl-place-01-${Number(id).toString(16).padStart(24, '0')}`,
        type: 'city',
        factualType,
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        provinceSlug: province,
        canonicalPath: `/${province}/${name.toLowerCase().replace(/\s+/g, '-')}`,
      };
      current.location = location;
      render(
        <HomeSearchProvider journey={journey} onJourneyChange={vi.fn()}>
          <EnhancedHero activeTab={journey} />
        </HomeSearchProvider>,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Choose location' }));
      fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
      expect(navigate).not.toHaveBeenCalled();
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText('Choose a Place')).toBeInTheDocument();
      expect(within(dialog).queryByRole('option')).toBeNull();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Explore areas' }));
      const url = new URL(navigate.mock.calls[0][0], 'http://localhost');
      expect(url.pathname).toBe(location.canonicalPath);
      expect(url.searchParams.get('mode')).toBe(journey === 'buy' ? 'sale' : 'rent');
      expect(url.searchParams.get('canonicalPlaceId')).toBeNull();
    },
  );
});
it('keeps municipality-context town selection on its exact Place identity', async () => {
  const alberton: LocationNode = {
    canonicalPlaceId: 'pl-place-01-00000000000000000000000c',
    type: 'city',
    factualType: 'town',
    name: 'Alberton',
    slug: 'alberton',
    provinceSlug: 'gauteng',
    canonicalPath: '/south-africa/gauteng/alberton--0000000c',
  };
  const record = discovery(alberton);
  placeLookup.mockReturnValue({
    data: { query: 'alberton', outcome: 'resolved', results: [record] },
    isFetching: false,
    isError: false,
  });
  const confirm = vi.fn();
  render(
    <HomeAreaPicker
      open
      onOpenChange={vi.fn()}
      initialSelection={{ locations: [] }}
      journey="buy"
      onConfirm={confirm}
    />,
  );
  fireEvent.change(
    screen.getByRole('combobox', { name: 'Search a city, town, suburb or locality' }),
    {
      target: { value: 'Alberton' },
    },
  );
  fireEvent.click(await screen.findByRole('option', { name: /Alberton.*Ekurhuleni/ }));
  expect(confirm).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Explore areas' }));
  expect(confirm).toHaveBeenCalledWith(
    expect.objectContaining({
      locations: [
        expect.objectContaining({
          canonicalPlaceId: 'pl-place-01-00000000000000000000000c',
          name: 'Alberton',
        }),
      ],
    }),
  );
});
