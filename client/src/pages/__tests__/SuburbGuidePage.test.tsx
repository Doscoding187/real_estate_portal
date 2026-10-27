import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  feedInputs: [] as Array<{ tab: string; suburb?: string }>,
  suburbInputs: [] as Array<{ provinceSlug: string; citySlug: string; suburbSlug: string }>,
  cityInputs: [] as Array<Record<string, unknown>>,
  suburbData: null as Record<string, unknown> | null,
  feedItems: {} as Record<string, Array<Record<string, unknown>>>,
  alertMutations: [] as Array<{
    name?: string;
    criteria?: Record<string, unknown>;
    notificationFrequency?: string;
  }>,
  setLocationCalls: [] as string[],
  authState: { isAuthenticated: false, loading: false },
  suburbError: false,
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
            isError: mocks.suburbError,
            refetch: vi.fn(),
          };
        },
      },
      getCityData: {
        useQuery: (input: Record<string, unknown>) => {
          mocks.cityInputs.push(input);
          return {
            data: {
              city: { id: 4 },
              suburbs: [
                {
                  id: 81,
                  name: 'Sandton',
                  slug: 'sandton',
                  listingCount: 8,
                  propertiesForSale: 5,
                  propertiesForRent: 3,
                },
                {
                  id: 82,
                  name: 'Rosebank',
                  slug: 'rosebank',
                  listingCount: 4,
                  propertiesForSale: 3,
                  propertiesForRent: 1,
                  minimumPriceSample: 10,
                  medianSalePrice: 3_200_000,
                  pricedListingsForSale: 12,
                  medianRentalPrice: null,
                  pricedListingsForRent: 2,
                  latitude: '-26.1600',
                  longitude: '28.0600',
                },
                {
                  id: 83,
                  name: 'Bryanston',
                  slug: 'bryanston',
                  listingCount: 0,
                  propertiesForSale: 0,
                  propertiesForRent: 0,
                  minimumPriceSample: 10,
                  medianSalePrice: null,
                  pricedListingsForSale: 0,
                  medianRentalPrice: null,
                  pricedListingsForRent: 0,
                  latitude: '-26.1120',
                  longitude: '28.0570',
                },
              ],
            },
            isLoading: false,
            isError: false,
            refetch: vi.fn(),
          };
        },
      },
    },
    location: {
      searchLocations: {
        useQuery: () => ({ data: [], isFetching: false, isError: false, refetch: vi.fn() }),
      },
    },
    monetization: {
      getRecommendedAgents: {
        useQuery: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
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
vi.mock('@/components/location/SuburbAgencies', () => ({
  SuburbAgencies: () => <section aria-label="Local agencies" />,
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
  };
}

describe('SuburbGuidePage transaction lanes', () => {
  beforeEach(() => {
    mocks.suburbError = false;
    mocks.feedInputs.length = 0;
    mocks.suburbInputs.length = 0;
    mocks.cityInputs.length = 0;
    mocks.alertMutations.length = 0;
    mocks.setLocationCalls.length = 0;
    mocks.authState.isAuthenticated = false;
    mocks.authState.loading = false;
    mocks.suburbData = suburbData('Sandton', 'sandton');
    withFeedItems(['buy', 'rent']);
  });

  it('keeps the legacy suburb guide scoped to property sale and rental listings', () => {
    const { container } = render(
      <SuburbGuidePage params={{ province: 'gauteng', city: 'johannesburg', suburb: 'sandton' }} />,
    );

    expect(screen.getByRole('heading', { level: 1, name: /Explore Sandton/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Homes for sale in Sandton' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Homes to rent in Sandton' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'New developments in Sandton' })).toBeNull();
    expect(
      screen.getByRole('heading', { name: 'Compare the listings in Sandton' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What’s around Sandton?' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /new developments and rentals/i })).toBeNull();
    expect(
      container.querySelector('#new-developments [aria-label="Sandton property type"]'),
    ).toBeNull();
    expect(Array.from(new Set(mocks.feedInputs.map(input => input.tab)))).toEqual(['buy', 'rent']);
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
    expect(screen.queryByRole('heading', { name: 'New developments in Rosebank' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'What’s around Rosebank?' })).toBeInTheDocument();
    expect(screen.queryByText(/Region E/i)).toBeNull();
    expect(Array.from(new Set(mocks.feedInputs.map(input => input.tab)))).toEqual(['buy', 'rent']);
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
    expect(container.querySelector('#suburb-inventory')).toBeNull();
    const nav = container.querySelector('.suburb-guide-quick-nav');
    expect(nav).not.toHaveTextContent('For sale');
    expect(nav).not.toHaveTextContent('Rentals');
    expect(screen.getByRole('link', { name: /See where to look next/ })).toHaveAttribute(
      'href',
      '#supply-guidance',
    );
  });

  it('keeps Development results out of the legacy text-scoped suburb route', () => {
    mocks.suburbData = zeroSupplyData();
    withFeedItems(['buy', 'rent']);

    const { container } = render(
      <SuburbGuidePage params={{ province: 'gauteng', city: 'johannesburg', suburb: 'sandton' }} />,
    );

    expect(container.querySelector('#supply-guidance')).not.toBeNull();
    expect(screen.queryByRole('heading', { name: 'New developments in Sandton' })).toBeNull();
    const nav = container.querySelector('.suburb-guide-quick-nav');
    expect(nav).not.toHaveTextContent('Developments');
    expect(Array.from(new Set(mocks.feedInputs.map(input => input.tab)))).toEqual(['buy', 'rent']);
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

  it('compares the current suburb with nearby areas using gated medians', () => {
    const { container } = render(
      <SuburbGuidePage params={{ province: 'gauteng', city: 'johannesburg', suburb: 'sandton' }} />,
    );

    const cityAreas = container.querySelector('#city-areas');
    expect(cityAreas).not.toBeNull();
    const table = within(cityAreas as HTMLElement).getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(4);

    expect(within(table).getByText('This guide')).toBeInTheDocument();
    expect(within(table).getByText('R2.8M')).toBeInTheDocument();
    expect(within(table).getByText('3 of 5 priced')).toBeInTheDocument();
    expect(within(table).getByText('R3.2M')).toBeInTheDocument();
    expect(within(table).getByText('2 of 10 priced')).toBeInTheDocument();
    expect(within(table).getAllByText('—')).toHaveLength(3);
    expect(within(table).getByRole('link', { name: /Rosebank/ })).toHaveAttribute(
      'href',
      '/gauteng/johannesburg/rosebank',
    );
    expect(within(table).getByRole('link', { name: /Bryanston/ })).toHaveAttribute(
      'href',
      '/gauteng/johannesburg/bryanston',
    );
    expect(within(rows[2]).getByRole('link', { name: /Bryanston/ })).toBeInTheDocument();
    expect(within(rows[2]).getByText('0.5 km')).toBeInTheDocument();
    expect(within(rows[3]).getByRole('link', { name: /Rosebank/ })).toBeInTheDocument();
    expect(within(rows[3]).getByText('5.8 km')).toBeInTheDocument();
    expect(within(table).getByText('Distance')).toBeInTheDocument();
  });

  it('switches comparison ordering between distance and published supply', () => {
    const { container } = render(
      <SuburbGuidePage params={{ province: 'gauteng', city: 'johannesburg', suburb: 'sandton' }} />,
    );

    const table = within(container.querySelector('#city-areas') as HTMLElement).getByRole('table');
    const nearestButton = screen.getByRole('button', { name: 'Nearest first' });
    const supplyButton = screen.getByRole('button', { name: 'Most listings' });
    expect(nearestButton).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(within(table).getAllByRole('row')[2]).getByRole('link', { name: /Bryanston/ }),
    ).toBeInTheDocument();

    fireEvent.click(supplyButton);

    const reorderedRows = within(table).getAllByRole('row');
    expect(supplyButton).toHaveAttribute('aria-pressed', 'true');
    expect(nearestButton).toHaveAttribute('aria-pressed', 'false');
    expect(within(reorderedRows[2]).getByRole('link', { name: /Rosebank/ })).toBeInTheDocument();
    expect(screen.getByText(/ordered by current published supply/)).toBeInTheDocument();
  });

  it('keeps agencies and local experts in the guide without a text-scoped Developer section', () => {
    const { container } = render(
      <SuburbGuidePage params={{ province: 'gauteng', city: 'johannesburg', suburb: 'sandton' }} />,
    );

    expect(container.querySelector('#developers')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Developers in Sandton' })).toBeNull();
    expect(container.querySelector('.suburb-guide-quick-nav')).not.toHaveTextContent('Developers');
    expect(container.querySelector('.suburb-guide-quick-nav')).toHaveTextContent('Agencies');
  });

  it('adds data-backed FAQs, methodology and planning links for depth and discovery', () => {
    const { container } = render(
      <SuburbGuidePage params={{ province: 'gauteng', city: 'johannesburg', suburb: 'sandton' }} />,
    );

    expect(container.querySelector('#guide-methodology')).not.toBeNull();
    expect(container.querySelector('#faqs')).not.toBeNull();
    expect(screen.getByText('Where is Sandton?')).toBeInTheDocument();
    expect(
      screen.getByText(/median asking price for sale listings is R2\.8M/i),
    ).toBeInTheDocument();
    expect(
      within(container.querySelector('#faqs') as HTMLElement).getByText(
        /not a census of all homes/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Bond calculator')).toBeInTheDocument();
    expect(screen.getByText('Affordability calculator')).toBeInTheDocument();
    expect(container.querySelector('.suburb-guide-quick-nav')).toHaveTextContent('FAQs');
  });

  it('requests the full verified suburb directory for comparison links', () => {
    render(
      <SuburbGuidePage params={{ province: 'gauteng', city: 'johannesburg', suburb: 'sandton' }} />,
    );

    expect(mocks.cityInputs).toContainEqual(
      expect.objectContaining({ suburbLimit: 100, includeInventoryPreview: false }),
    );
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

describe('Suburb guide without live data', () => {
  it('keeps the editorial guide readable when the live service is unavailable', () => {
    mocks.suburbError = true;
    render(
      <SuburbGuidePage params={{ province: 'gauteng', city: 'johannesburg', suburb: 'sandton' }} />,
    );

    // The guide is still a guide: the editorial content survives the data failure.
    expect(screen.getByRole('heading', { level: 1, name: /Explore Sandton/i })).toBeInTheDocument();
    expect(screen.getByText(/Where Sandton fits in the city/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Alexandra and parts of Sandton sit within Region E/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Reading the Sandton numbers/i)).toBeInTheDocument();

    // And the reader is told plainly which part is unavailable, without a false claim.
    expect(
      screen.getByText(/Live availability for Sandton is unavailable right now/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
    expect(screen.queryByText(/Couldn't load Sandton/i)).not.toBeInTheDocument();
  });
});
