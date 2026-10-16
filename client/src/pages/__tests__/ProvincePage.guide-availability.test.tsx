import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { guides, retry, schemaStats } = vi.hoisted(() => ({
  guides: vi.fn(),
  retry: vi.fn(),
  schemaStats: vi.fn(),
}));
vi.mock('@/components/ListingNavbar', () => ({ ListingNavbar: () => null }));
vi.mock('@/components/Footer', () => ({ Footer: () => null }));
vi.mock('@/components/location/LocationSchema', () => ({
  LocationSchema: ({ stats }: { stats?: { totalListings?: number; avgPrice?: number } }) => {
    schemaStats(stats);
    return null;
  },
}));
vi.mock('@/components/location/RecommendedAgents', () => ({
  RecommendedAgents: ({ locationId }: { locationId: number }) => (
    <div data-testid="agent-province" data-location-id={locationId} />
  ),
}));
vi.mock('@/components/provincial/ProvincialComposer', () => ({
  ProvincialComposer: ({
    marketLocations,
  }: {
    marketLocations: { canonicalLocationId: string }[];
  }) => (
    <div
      data-testid="guide-search-locations"
      data-location-ids={marketLocations.map(city => city.canonicalLocationId).join(',')}
    />
  ),
}));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    locationPages: {
      getCityGuides: { useQuery: guides },
      getHeroCampaign: { useQuery: () => ({ data: null }) },
      getProvincialDiscoveryData: {
        useQuery: () => ({
          data: {
            province: {
              id: 3,
              canonicalLocationId: 'province:3',
              name: 'Gauteng',
              slug: 'gauteng',
            },
            markets: [
              {
                slug: 'pretoria',
                name: 'Pretoria',
                eyebrow: 'Northern market',
                description: 'Explore Pretoria.',
                areaSlugs: [],
                city: null,
                inventory: null,
                state: 'unavailable',
              },
            ],
            inventoryPreview: { state: 'empty', items: [], total: 0, pageSize: 6 },
            journeyCounts: {
              buy: { state: 'empty', total: 0 },
              rent: { state: 'empty', total: 0 },
              developments: { state: 'empty', total: 0 },
            },
            marketSnapshot: { provenance: { note: 'Current advertised inventory.' } },
          },
          isLoading: false,
        }),
      },
    },
  },
}));
import ProvincePage from '../ProvincePage';

beforeEach(() => {
  retry.mockClear();
  schemaStats.mockClear();
  guides.mockReturnValue({
    data: [
      {
        id: 18,
        canonicalLocationId: 'city:18',
        name: 'Pretoria',
        slug: 'pretoria',
        provinceSlug: 'gauteng',
        provinceName: 'Gauteng',
      },
    ],
    isLoading: false,
    isError: false,
    refetch: retry,
  });
});
describe('Province guide identity and inventory boundaries', () => {
  it('does not publish an invented average price when province price data is unavailable', () => {
    render(<ProvincePage params={{ province: 'gauteng' }} />);

    expect(schemaStats).toHaveBeenCalledWith({ totalListings: 0 });
  });

  it('opens a verified city guide without inventing unavailable inventory counts', () => {
    render(<ProvincePage params={{ province: 'gauteng' }} />);
    expect(screen.getByRole('link', { name: 'Explore Pretoria' })).toHaveAttribute(
      'href',
      '/gauteng/pretoria',
    );
    expect(screen.getByTestId('guide-search-locations')).toHaveAttribute(
      'data-location-ids',
      'city:18',
    );
    expect(screen.queryByText('Inventory unavailable')).not.toBeInTheDocument();
  });
  it('passes the numeric province record ID to agent recommendations', () => {
    render(<ProvincePage params={{ province: 'gauteng' }} />);
    expect(screen.getByTestId('agent-province')).toHaveAttribute('data-location-id', '3');
  });
  it('keeps a failed guide-availability check visible and retryable', () => {
    guides.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: retry });
    render(<ProvincePage params={{ province: 'gauteng' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Some area guides could not be checked.');
    expect(screen.queryByRole('link', { name: 'Explore Pretoria' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
