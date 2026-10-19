import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  feedInputs: [] as Array<{ tab: string; suburb?: string }>,
  suburbInputs: [] as Array<{ provinceSlug: string; citySlug: string; suburbSlug: string }>,
  suburbData: null as Record<string, unknown> | null,
  feedItems: {} as Record<string, Array<Record<string, unknown>>>,
  alertMutations: [] as Array<{
    name?: string;
    criteria?: Record<string, unknown>;
    notificationFrequency?: string;
  }>,
  setLocationCalls: [] as string[],
  authState: { isAuthenticated: false, loading: false },
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    locationPages: {
      getSuburbData: {
        useQuery: (input: { provinceSlug: string; citySlug: string; suburbSlug: string }) => {
          mocks.suburbInputs.push(input);
          return {
            data: mocks.suburbData,
            isLoading: false,
            isError: false,
            refetch: vi.fn(),
          };
        },
      },
      getCityData: {
        useQuery: () => ({
          data: { city: { id: 4 }, suburbs: [] },
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        }),
      },
    },
    location: {
      searchLocations: {
        useQuery: () => ({ data: [], isFetching: false, isError: false, refetch: vi.fn() }),
      },
    },
    savedSearch: {
      create: {
        useMutation: (options?: { onSuccess?: () => void }) => ({
          mutate: (input: Record<string, unknown>) => {
            mocks.alertMutations.push(input);
            options?.onSuccess?.();
          },
          isPending: false,
        }),
      },
    },
    developer: {
      getHomeTrendingFeed: {
        useQuery: (input: { tab: string; suburb?: string }) => {
          mocks.feedInputs.push(input);
          return {
            data: { items: mocks.feedItems[input.tab] ?? [] },
            isLoading: false,
            isError: false,
            refetch: vi.fn(),
          };
        },
      },
    },
  },
}));

vi.mock('wouter', () => ({
  useSearch: () => '',
  useLocation: () => [
    '/gauteng/johannesburg/sandton',
    (to: string) => {
      mocks.setLocationCalls.push(to);
    },
  ],
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({ ...mocks.authState, user: null, refresh: vi.fn(), logout: vi.fn() }),
}));

vi.mock('@/components/ListingNavbar', () => ({ ListingNavbar: () => <nav /> }));
vi.mock('@/components/Footer', () => ({ Footer: () => <footer /> }));
vi.mock('@/components/seo/MetaControl', () => ({ MetaControl: () => null }));
vi.mock('@/components/location/SuburbLocalProfessionals', () => ({
  SuburbLocalProfessionals: () => <section aria-label="Local agents" />,
}));
vi.mock('@/components/location/NearbyAmenitiesMap', () => ({
  NearbyAmenitiesMap: () => <div aria-label="Nearby amenity map" />,
}));
vi.mock('@/lib/publicNavigation', () => ({ isHomepageHeroJourneyEnabled: () => true }));
vi.mock('@/lib/cityGuideImages', () => ({ getCityGuideImage: () => undefined }));

import SuburbGuidePage from '../SuburbGuidePage';

const marketInsights = {
  minimumPriceSample: 5,
  sale: {
    listingCount: 5,
    pricedListingCount: 5,
    medianPrice: 2_800_000,
    propertyTypes: [
      {
        propertyType: 'house',
        listingCount: 5,
        pricedListingCount: 5,
        medianPrice: 2_800_000,
      },
    ],
    bedrooms: [{ bedroomBand: 3, listingCount: 5, pricedListingCount: 5, medianPrice: 2_800_000 }],
  },
  rent: {
    listingCount: 3,
    pricedListingCount: 3,
    medianPrice: null,
    propertyTypes: [
      { propertyType: 'apartment', listingCount: 3, pricedListingCount: 3, medianPrice: null },
    ],
    bedrooms: [{ bedroomBand: 2, listingCount: 3, pricedListingCount: 3, medianPrice: null }],
  },
  otherTransactionListingCount: 0,
};

function suburbData(name: string, slug: string) {
  return {
    suburb: {
      id: slug === 'sandton' ? 81 : 82,
      name,
      slug,
      cityId: 4,
      cityName: 'Johannesburg',
      citySlug: 'johannesburg',
      provinceName: 'Gauteng',
      provinceSlug: 'gauteng',
      latitude: '-26.1076',
      longitude: '28.0567',
    },
    stats: { totalListings: 8, saleCount: 5, rentalCount: 3 },
    marketInsights,
    listings: [],
  };
}

function zeroSupplyData() {
  return {
    ...suburbData('Sandton', 'sandton'),
    stats: { totalListings: 0, saleCount: 0, rentalCount: 0 },
  };
}

function feedItem(tab: string) {
  if (tab === 'developments') {
    return {
      id: 'development-1',
      kind: 'development',
      title: 'Sandton Heights',
      city: 'Johannesburg',
      suburb: 'Sandton',
      priceFrom: 1_200_000,
      priceTo: 2_400_000,
      image: 'https://cdn.example.com/development.jpg',
      href: '/developments/sandton-heights',
      status: 'selling',
      availabilityState: 'available',
    };
  }
  return {
    id: `${tab}-listing-1`,
    kind: 'listing',
    title: `Sandton ${tab} home`,
    city: 'Johannesburg',
    suburb: 'Sandton',
    priceFrom: 1_500_000,
    priceTo: null,
    image: 'https://cdn.example.com/home.jpg',
    href: `/property/${tab}-listing-1`,
    listingType: tab === 'rent' ? 'rent' : 'sale',
    bedrooms: 3,
    bathrooms: 2,
  };
}

function withFeedItems(tabs: string[]) {
  mocks.feedItems = {
    buy: tabs.includes('buy') ? [feedItem('buy')] : [],
    rent: tabs.includes('rent') ? [feedItem('rent')] : [],
    developments: tabs.includes('developments') ? [feedItem('developments')] : [],
  };
}

describe('SuburbGuidePage transaction lanes', () => {
  beforeEach(() => {
    mocks.feedInputs.length = 0;
    mocks.suburbInputs.length = 0;
    mocks.alertMutations.length = 0;
    mocks.setLocationCalls.length = 0;
    mocks.authState.isAuthenticated = false;
    mocks.authState.loading = false;
    mocks.suburbData = suburbData('Sandton', 'sandton');
    withFeedItems(['buy', 'rent', 'developments']);
  });

  it('keeps sale, rental and development discovery separate and removes transaction tabs from projects', () => {
    const { container } = render(
      <SuburbGuidePage params={{ province: 'gauteng', city: 'johannesburg', suburb: 'sandton' }} />,
    );

    expect(screen.getByRole('heading', { name: 'Homes for sale in Sandton' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Homes to rent in Sandton' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'New developments in Sandton' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Compare the listings in Sandton' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What’s around Sandton?' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /new developments and rentals/i })).toBeNull();
    expect(
      container.querySelector('#new-developments [aria-label="Sandton property type"]'),
    ).toBeNull();
    expect(Array.from(new Set(mocks.feedInputs.map(input => input.tab)))).toEqual([
      'buy',
      'rent',
      'developments',
    ]);
    expect(mocks.feedInputs.every(input => input.suburb === 'Sandton')).toBe(true);
  });

  it('uses the shared market and transaction experience for other canonical suburbs', () => {
    mocks.suburbData = suburbData('Rosebank', 'rosebank');

    render(
      <SuburbGuidePage
        params={{ province: 'gauteng', city: 'johannesburg', suburb: 'rosebank' }}
      />,
    );

    expect(mocks.suburbInputs).toContainEqual(
      expect.objectContaining({
        provinceSlug: 'gauteng',
        citySlug: 'johannesburg',
        suburbSlug: 'rosebank',
      }),
    );
    expect(
      screen.getByRole('heading', { name: 'What’s available in Rosebank' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Compare the listings in Rosebank' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Homes for sale in Rosebank' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Homes to rent in Rosebank' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'New developments in Rosebank' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What’s around Rosebank?' })).toBeInTheDocument();
    expect(screen.queryByText(/Region E/i)).toBeNull();
    expect(Array.from(new Set(mocks.feedInputs.map(input => input.tab)))).toEqual([
      'buy',
      'rent',
      'developments',
    ]);
    expect(mocks.feedInputs.every(input => input.suburb === 'Rosebank')).toBe(true);
  });

  it('offers a nearby-area and search handoff next to the primary hero action', () => {
    const { container } = render(
      <SuburbGuidePage params={{ province: 'gauteng', city: 'johannesburg', suburb: 'sandton' }} />,
    );

    expect(screen.getByRole('link', { name: /Explore homes in Sandton/ })).toHaveAttribute(
      'href',
      '#suburb-inventory',
    );
    expect(screen.getByRole('link', { name: 'Compare nearby areas' })).toHaveAttribute(
      'href',
      '#city-areas',
    );
    expect(container.querySelector('#supply-guidance')).toBeNull();
    expect(container.querySelector('#market-insights')).not.toBeNull();
  });

  it('guides zero-supply suburbs with nearby, city-wide, alert and seller actions', () => {
    mocks.suburbData = zeroSupplyData();
    withFeedItems([]);

    const { container } = render(
      <SuburbGuidePage params={{ province: 'gauteng', city: 'johannesburg', suburb: 'sandton' }} />,
    );

    const guidance = container.querySelector('#supply-guidance');
    expect(guidance).not.toBeNull();
    const band = within(guidance as HTMLElement);
    expect(
      band.getByRole('heading', { name: 'No published resale listings in Sandton right now' }),
    ).toBeInTheDocument();
    expect(band.getByRole('link', { name: /Compare nearby areas/ })).toHaveAttribute(
      'href',
      '#city-areas',
    );
    expect(
      band.getByRole('link', { name: /Search all of Johannesburg/ }).getAttribute('href'),
    ).toContain('johannesburg');
    expect(band.getByRole('button', { name: /Set a Sandton listing alert/ })).toBeInTheDocument();
    expect(band.getByRole('link', { name: /Selling or letting in Sandton\?/ })).toHaveAttribute(
      'href',
      '/advertise/sell/agencies',
    );

    expect(container.querySelector('#market-insights')).toBeNull();
    expect(container.querySelector('.suburb-guide-quick-nav')).toHaveTextContent('Keep looking');
    expect(container.querySelector('.suburb-guide-quick-nav')).not.toHaveTextContent(
      'Market insights',
    );
    expect(screen.queryByRole('heading', { name: /Compare the listings in Sandton/ })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Homes for sale in Sandton' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Homes to rent in Sandton' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'New developments in Sandton' })).toBeNull();
    expect(container.querySelector('#suburb-inventory')).toBeNull();
    const nav = container.querySelector('.suburb-guide-quick-nav');
    expect(nav).not.toHaveTextContent('For sale');
    expect(nav).not.toHaveTextContent('Rentals');
    expect(screen.getByRole('link', { name: /See where to look next/ })).toHaveAttribute(
      'href',
      '#supply-guidance',
    );
  });

  it('keeps off-plan development rails visible below the guidance band for zero-supply suburbs', () => {
    mocks.suburbData = zeroSupplyData();
    withFeedItems(['developments']);

    const { container } = render(
      <SuburbGuidePage params={{ province: 'gauteng', city: 'johannesburg', suburb: 'sandton' }} />,
    );

    expect(container.querySelector('#supply-guidance')).not.toBeNull();
    expect(
      screen.getByRole('heading', { name: 'New developments in Sandton' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Homes for sale in Sandton' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Homes to rent in Sandton' })).toBeNull();
    const nav = container.querySelector('.suburb-guide-quick-nav');
    expect(nav).toHaveTextContent('Developments');
    expect(nav).not.toHaveTextContent('For sale');
    expect(nav).not.toHaveTextContent('Rentals');
    expect(container.querySelector('#suburb-inventory')).not.toBeNull();
  });

  it('routes to search when listings are published but no rail can assemble cards', () => {
    mocks.suburbData = suburbData('Sandton', 'sandton');
    withFeedItems([]);

    const { container } = render(
      <SuburbGuidePage params={{ province: 'gauteng', city: 'johannesburg', suburb: 'sandton' }} />,
    );

    expect(container.querySelector('#supply-guidance')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Homes for sale in Sandton' })).toBeNull();
    expect(
      screen.getByRole('heading', { name: 'No listing cards to show in Sandton right now' }),
    ).toBeInTheDocument();
    expect(container.querySelector('#suburb-inventory')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'View all homes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View all rentals' })).toBeInTheDocument();
  });

  it('sends signed-out visitors to sign in before setting a suburb alert', () => {
    mocks.suburbData = zeroSupplyData();
    withFeedItems([]);

    render(
      <SuburbGuidePage params={{ province: 'gauteng', city: 'johannesburg', suburb: 'sandton' }} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Set a Sandton listing alert/ }));

    expect(mocks.alertMutations).toHaveLength(0);
    expect(mocks.setLocationCalls).toHaveLength(1);
    expect(mocks.setLocationCalls[0]).toMatch(/^\/login\?next=/);
  });

  it('saves a canonical suburb alert for a signed-in visitor', () => {
    mocks.authState.isAuthenticated = true;

    render(
      <SuburbGuidePage params={{ province: 'gauteng', city: 'johannesburg', suburb: 'sandton' }} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Alert me' }));

    expect(mocks.alertMutations).toHaveLength(1);
    expect(mocks.alertMutations[0]).toMatchObject({
      name: 'New listings in Sandton',
      notificationFrequency: 'weekly',
    });
    expect(mocks.alertMutations[0].criteria).toMatchObject({
      province: 'gauteng',
      city: 'johannesburg',
      suburb: 'sandton',
      locationId: 'suburb:81',
    });
    expect(mocks.setLocationCalls).toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Review alerts' })).toHaveAttribute(
      'href',
      '/dashboard#alerts',
    );
  });
});
