import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useLocationSearchQuery } = vi.hoisted(() => ({
  useLocationSearchQuery: vi.fn(),
}));

vi.mock('@/hooks/useGoogleMaps', () => ({
  useGoogleMaps: () => ({
    isLoaded: false,
    isLoading: false,
    error: 'Google Maps API key is missing',
  }),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    location: {
      searchLocations: {
        useQuery: useLocationSearchQuery,
      },
    },
  },
}));

import { LocationAutosuggest } from '../LocationAutosuggest';

describe('LocationAutosuggest database fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLocationSearchQuery.mockReturnValue({
      data: [
        {
          id: 12,
          name: 'Sandton',
          type: 'suburb',
          cityId: 12,
          cityName: 'Johannesburg',
          provinceName: 'Gauteng',
        },
      ],
      isLoading: false,
    });
  });

  it('keeps location search available and returns a navigable hierarchy without Google Places', async () => {
    const onSelect = vi.fn();
    render(<LocationAutosuggest placeholder="City, Suburb, or Area" onSelect={onSelect} />);

    const input = screen.getByPlaceholderText('City, Suburb, or Area');
    expect(input).not.toBeDisabled();

    fireEvent.change(input, { target: { value: 'San' } });

    await waitFor(() => {
      expect(useLocationSearchQuery).toHaveBeenLastCalledWith(
        { query: 'San', type: 'all', limit: 10 },
        expect.objectContaining({ enabled: true }),
      );
    });
    fireEvent.click(screen.getByText('Sandton'));

    expect(onSelect).toHaveBeenCalledWith({
      id: 'suburb:12',
      name: 'Sandton',
      slug: 'sandton',
      type: 'suburb',
      provinceSlug: 'gauteng',
      citySlug: 'johannesburg',
      parentCanonicalLocationId: 'city:12',
      canonicalPath:
        '/property-for-sale?locationId=suburb%3A12&suburb=sandton&city=johannesburg&province=gauteng',
    });
  });

  it('supports semantic keyboard autocomplete selection', async () => {
    const onSelect = vi.fn();
    render(<LocationAutosuggest onSelect={onSelect} />);

    const input = screen.getByRole('combobox', { name: 'Search by city, suburb, or area' });
    fireEvent.change(input, { target: { value: 'San' } });

    await waitFor(() =>
      expect(screen.getByRole('option', { name: /Sandton/ })).toBeInTheDocument(),
    );
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'suburb:12',
        slug: 'sandton',
        type: 'suburb',
      }),
    );
  });

  it('supports a parent input ref without changing location search behavior', () => {
    const inputRef = createRef<HTMLInputElement>();
    render(<LocationAutosuggest inputRef={inputRef} />);

    const input = screen.getByRole('combobox', { name: 'Search by city, suburb, or area' });
    expect(inputRef.current).toBe(input);
    expect(useLocationSearchQuery).toHaveBeenLastCalledWith(
      { query: '', type: 'all', limit: 10 },
      expect.objectContaining({ enabled: false }),
    );

    fireEvent.click(input);
    expect(input).toHaveFocus();
  });

  it('does not contradict a governed discovery suggestion with an empty message', async () => {
    useLocationSearchQuery.mockReturnValue({ data: [], isLoading: false });

    render(
      <LocationAutosuggest
        discoverySuggestions={[
          {
            kind: 'canonical_location',
            canonicalLocationId: 'city:12',
            label: 'Johannesburg',
            factualLevel: 'city',
            searchScopeKind: 'metro_city',
            display: { typeLabel: 'Metro city', contextLabel: 'Gauteng' },
            provinceSlug: 'gauteng',
            citySlug: 'johannesburg',
            canonicalPath: '/gauteng/johannesburg',
            source: 'canonical_geography',
          },
        ]}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Joh' } });

    await waitFor(() =>
      expect(screen.getByRole('option', { name: /Johannesburg/ })).toBeInTheDocument(),
    );
    expect(screen.queryByText('No locations found')).not.toBeInTheDocument();
  });

  it('preserves the governed identity and parent when selecting an enriched catalog result', async () => {
    useLocationSearchQuery.mockReturnValue({
      data: [
        {
          id: 991,
          name: 'Isando',
          type: 'suburb',
          slug: 'isando',
          provinceSlug: 'gauteng',
          citySlug: 'kempton-park',
          provinceName: 'Gauteng',
          cityName: 'Kempton Park',
          canonicalLocationId: 'suburb:991',
          factualLocationId: 'pl-gp-v01-isando',
          parentCanonicalLocationId: 'city:77',
          canonicalPath: '/gauteng/kempton-park/isando',
          selectionTypeLabel: 'Suburb',
          selectionContextLabel: 'Kempton Park',
        },
      ],
      isLoading: false,
    });

    const onSelect = vi.fn();
    render(<LocationAutosuggest onSelect={onSelect} />);

    const input = screen.getByRole('combobox', { name: 'Search by city, suburb, or area' });
    fireEvent.change(input, { target: { value: 'Isan' } });
    await waitFor(() => expect(screen.getByRole('option', { name: /Isando/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('option', { name: /Isando/ }));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'suburb:991',
        canonicalLocationId: 'suburb:991',
        factualLocationId: 'pl-gp-v01-isando',
        parentCanonicalLocationId: 'city:77',
        canonicalPath: '/gauteng/kempton-park/isando',
      }),
    );
  });

  it('blocks an eleventh selection when the reconstructed selection already has ten locations', () => {
    const onSelect = vi.fn();
    const selectedLocations = Array.from({ length: 10 }, (_, index) => ({
      id: `suburb:${index + 1}`,
      name: `Area ${index + 1}`,
      slug: `area-${index + 1}`,
      type: 'suburb' as const,
    }));

    render(
      <LocationAutosuggest
        onSelect={onSelect}
        selectedLocations={selectedLocations}
        maxLocations={10}
      />,
    );

    expect(screen.getByPlaceholderText('Limit reached')).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
