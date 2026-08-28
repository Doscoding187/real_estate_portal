import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getNearbyAmenitiesUseQuery } = vi.hoisted(() => ({
  getNearbyAmenitiesUseQuery: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    location: {
      getNearbyAmenities: {
        useQuery: getNearbyAmenitiesUseQuery,
      },
    },
  },
}));

import { NearbyLandmarks } from './NearbyLandmarks';

describe('NearbyLandmarks map resilience', () => {
  const openMap = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('open', openMap);
    getNearbyAmenitiesUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    openMap.mockClear();
  });

  it('removes the failed provider preview and keeps an actionable location fallback', () => {
    render(
      <NearbyLandmarks
        property={{
          id: 501,
          title: 'Garden home',
          latitude: -26.1076,
          longitude: 28.0567,
        }}
      />,
    );

    const preview = screen.queryByAltText('Map preview of Garden home');
    if (preview) fireEvent.error(preview);

    expect(screen.getByRole('status')).toHaveTextContent('Map preview unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Open in Google Maps' }));
    expect(openMap).toHaveBeenCalledWith(
      'https://www.google.com/maps/search/?api=1&query=-26.1076,28.0567',
      '_blank',
    );
  });

  it('omits decorative nearby-place controls when the provider has no credible results', () => {
    render(
      <NearbyLandmarks
        property={{
          id: 501,
          title: 'Garden home',
          latitude: -26.1076,
          longitude: 28.0567,
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Location overview' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Nearby place categories')).not.toBeInTheDocument();
    expect(screen.queryByText('No nearby locations found')).not.toBeInTheDocument();
  });
});
