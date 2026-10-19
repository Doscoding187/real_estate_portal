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
    expect(screen.queryByText(/No amenities found within/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('requests the provider search in metres for the displayed kilometre radius', () => {
    mocks.nearbyQuery.mockReturnValue({
      data: [],
      isError: false,
      isLoading: false,
      isSuccess: true,
      refetch: vi.fn(),
    });

    render(<NearbyAmenitiesMap center={[-26.1076, 28.0567]} radius={2} showControls={false} />);

    expect(mocks.nearbyQuery.mock.calls[0][0]).toMatchObject({ radius: 2000 });
  });
});
