import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const mocks = vi.hoisted(() => ({ nearbyQuery: vi.fn() }));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    location: {
      getNearbyAmenities: {
        useQuery: (...args: unknown[]) => mocks.nearbyQuery(...args),
      },
    },
  },
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Popup: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  useMapEvents: () => null,
}));

import { NearbyAmenitiesMap } from '../NearbyAmenitiesMap';

function successResponse(data: unknown[] = []) {
  return {
    data,
    isError: false,
    isLoading: false,
    isSuccess: true,
    refetch: vi.fn(),
  };
}

describe('NearbyAmenitiesMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows provider errors separately from a successful empty search and offers retry', () => {
    const refetch = vi.fn();
    mocks.nearbyQuery.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
      isSuccess: false,
      refetch,
    });

    render(<NearbyAmenitiesMap center={[-26.1076, 28.0567]} showControls={false} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Nearby places are unavailable right now.');
    expect(screen.queryByText(/No qualifying places found within/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('requests the widened 5 km default radius with governed categories', () => {
    mocks.nearbyQuery.mockReturnValue(successResponse());

    render(<NearbyAmenitiesMap center={[-26.1076, 28.0567]} showControls={false} />);

    expect(mocks.nearbyQuery.mock.calls[0][0]).toMatchObject({
      radius: 5000,
      categories: ['education', 'healthcare', 'shopping', 'transport', 'lifestyle'],
    });
  });

  it('lets people widen the radius and toggle a category', () => {
    mocks.nearbyQuery.mockReturnValue(successResponse());

    render(<NearbyAmenitiesMap center={[-26.1076, 28.0567]} showControls={false} />);

    fireEvent.click(screen.getByRole('button', { name: '10 km' }));
    const lastCall = mocks.nearbyQuery.mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({ radius: 10000 });

    fireEvent.click(screen.getByRole('button', { name: /Shopping/ }));
    const afterToggle = mocks.nearbyQuery.mock.calls.at(-1)?.[0];
    expect(afterToggle.categories).not.toContain('shopping');
    expect(afterToggle.categories).toHaveLength(4);
  });

  it('renders filtered places with their category and rating', () => {
    mocks.nearbyQuery.mockReturnValue(
      successResponse([
        {
          id: 'place-1',
          placeId: 'place-1',
          name: 'Sandton City',
          category: 'shopping',
          googleType: 'shopping_mall',
          address: '83 Rivonia Road',
          latitude: -26.1076,
          longitude: 28.0567,
          distance: '0.4 km',
          distanceValue: 0.4,
          rating: 4.5,
          userRatingsTotal: 1200,
        },
      ]),
    );

    render(<NearbyAmenitiesMap center={[-26.1076, 28.0567]} showControls={false} />);

    expect(screen.getAllByText('Sandton City').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Shopping').length).toBeGreaterThan(0);
    expect(screen.getAllByText('4.5').length).toBeGreaterThan(0);
  });
});
