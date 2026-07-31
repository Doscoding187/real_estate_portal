import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
      id: '12',
      name: 'Sandton',
      slug: 'sandton',
      type: 'suburb',
      provinceSlug: 'gauteng',
      citySlug: 'johannesburg',
      canonicalPath: '/property-for-sale?suburb=sandton&city=johannesburg&province=gauteng',
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
        id: '12',
        slug: 'sandton',
        type: 'suburb',
      }),
    );
  });
});
