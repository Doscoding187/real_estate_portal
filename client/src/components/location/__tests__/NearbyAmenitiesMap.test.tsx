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
});
