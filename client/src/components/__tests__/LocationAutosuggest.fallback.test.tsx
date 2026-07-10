import { fireEvent, render, screen } from '@testing-library/react';
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

  it('keeps location search available and returns a navigable hierarchy without Google Places', () => {
    const onSelect = vi.fn();
    render(<LocationAutosuggest placeholder="City, Suburb, or Area" onSelect={onSelect} />);

    const input = screen.getByPlaceholderText('City, Suburb, or Area');
    expect(input).not.toBeDisabled();

    fireEvent.change(input, { target: { value: 'San' } });

    expect(useLocationSearchQuery).toHaveBeenLastCalledWith(
      { query: 'San', type: 'all', limit: 10 },
      expect.objectContaining({ enabled: true }),
    );
    fireEvent.click(screen.getByText('Sandton'));

    expect(onSelect).toHaveBeenCalledWith({
      id: '12',
      name: 'Sandton',
      slug: 'sandton',
      type: 'suburb',
      provinceSlug: 'gauteng',
      citySlug: 'johannesburg',
    });
  });
});
