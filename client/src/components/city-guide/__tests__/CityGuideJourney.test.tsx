import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const { lookup } = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock('@/lib/trpc', () => ({
  trpc: { location: { placeSuggestions: { useQuery: lookup } } },
}));
import { CityGuideJourney, CitySuburbFinder } from '../CityGuideJourney';
import { getCityGuideContent } from '@shared/cityGuideContent';
const guide = getCityGuideContent('gauteng', 'johannesburg')!;
const city = {
  id: 'city:1',
  canonicalLocationId: 'city:1',
  name: 'Johannesburg',
  type: 'city' as const,
  slug: 'johannesburg',
  citySlug: 'johannesburg',
  provinceSlug: 'gauteng',
};
const emmarentia = {
  kind: 'canonical_location',
  canonicalLocationId: 'pl-place-01-2b1c0e5d3f4a5b6c7d8e9f01',
  label: 'Emmarentia',
  factualLevel: 'suburb',
  searchScopeKind: 'locality',
  display: { typeLabel: 'Suburb' },
  provinceSlug: 'gauteng',
  citySlug: 'johannesburg',
  suburbSlug: 'emmarentia',
  canonicalPath: '/gauteng/johannesburg/emmarentia',
  source: 'canonical_geography',
};
const rosebank = {
  kind: 'canonical_location',
  canonicalLocationId: 'pl-place-01-3c2d1f6e4a5b6c7d8e9f012',
  label: 'Rosebank',
  factualLevel: 'city',
  searchScopeKind: 'metro_city',
  display: { typeLabel: 'Town', contextLabel: 'City of Johannesburg' },
  provinceSlug: 'gauteng',
  citySlug: 'rosebank',
  canonicalPath: '/gauteng/rosebank',
  source: 'canonical_geography',
};
beforeEach(() => lookup.mockReturnValue({ data: [], refetch: vi.fn() }));
describe('City guide journey continuity', () => {
  it('requires explicit intent and an area, then preserves canonical Buy filters', () => {
    render(<CityGuideJourney guide={guide} city={city} />);
    expect(screen.getByRole('button', { name: 'Choose a journey' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Buy', exact: true }));
    expect(screen.getByRole('button', { name: 'Choose an area' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Or choose all Johannesburg/ }));
    fireEvent.change(screen.getByLabelText('Property type'), { target: { value: 'house' } });
    fireEvent.change(screen.getByLabelText('Maximum price'), { target: { value: '2000000' } });
    const url = new URL(
      screen.getByRole('link', { name: 'Search for sale' }).getAttribute('href')!,
      'http://localhost',
    );
    expect(url.pathname).toBe('/property-for-sale');
    expect(url.searchParams.get('locationId')).toBe('city:1');
    expect(url.searchParams.get('propertyType')).toBe('house');
    expect(url.searchParams.get('maxPrice')).toBe('2000000');
  });
  it('searches beyond the preview and selects a suburb without widening', async () => {
    lookup.mockReturnValue({ data: [emmarentia] });
    render(<CityGuideJourney guide={guide} city={city} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rent', exact: true }));
    fireEvent.change(screen.getByLabelText('Choose an area to explore'), {
      target: { value: 'Emmarentia' },
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Emmarentia Suburb/ })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: /Emmarentia Suburb/ }));
    const url = new URL(
      screen.getByRole('link', { name: 'Search rentals' }).getAttribute('href')!,
      'http://localhost',
    );
    expect(url.searchParams.get('canonicalPlaceId')).toBe('pl-place-01-2b1c0e5d3f4a5b6c7d8e9f01');
    expect(url.searchParams.getAll('locationIds')).toEqual([]);
  });
  it('labels separate town results and retains their identity on selection', async () => {
    lookup.mockReturnValue({ data: [rosebank] });
    const onSelect = vi.fn();
    render(<CitySuburbFinder guide={guide} citySlug="johannesburg" label="Find an area" onSelect={onSelect} />);
    fireEvent.change(screen.getByLabelText('Find an area'), { target: { value: 'Rosebank' } });
    await screen.findByText('Separate places in Gauteng');
    fireEvent.click(screen.getByRole('button', { name: /Rosebank Town/ }));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        canonicalLocationId: 'pl-place-01-3c2d1f6e4a5b6c7d8e9f012',
        type: 'city',
        slug: 'rosebank',
      }),
    );
  });
  it('keeps Land handoff to exactly one authority', () => {
    render(<CityGuideJourney guide={guide} city={city} />);
    fireEvent.click(screen.getByRole('button', { name: 'Land & plots' }));
    fireEvent.click(screen.getByRole('button', { name: /Or choose all Johannesburg/ }));
    const url = new URL(
      screen.getByRole('link', { name: 'Continue' }).getAttribute('href')!,
      'http://localhost',
    );
    expect(url.pathname).toBe('/plots-and-land');
    expect([...url.searchParams.entries()]).toEqual([['locationId', 'city:1']]);
  });
  it('distinguishes failed location search from no matches', async () => {
    lookup.mockReturnValue({ isError: true, refetch: vi.fn() });
    render(<CitySuburbFinder guide={guide} citySlug="johannesburg" label="Find an area" onSelect={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Find an area'), { target: { value: 'Rosebank' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Suburb search is unavailable');
    expect(screen.queryByText(/No matching area/)).not.toBeInTheDocument();
  });
  it('does not silently discard an invalid budget', () => {
    render(<CityGuideJourney guide={guide} city={city} />);
    fireEvent.click(screen.getByRole('button', { name: 'Buy', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: /Or choose all Johannesburg/ }));
    fireEvent.change(screen.getByLabelText('Maximum price'), { target: { value: '-1' } });
    expect(screen.getByRole('button', { name: 'Check budget' })).toBeDisabled();
    expect(screen.queryByRole('link', { name: 'Search for sale' })).not.toBeInTheDocument();
  });
});
