import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  feedInputs: [] as Array<{ tab: string; suburb?: string }>,
  suburbInputs: [] as Array<{ provinceSlug: string; citySlug: string; suburbSlug: string }>,
  suburbData: null as Record<string, unknown> | null,
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
    developer: {
      getHomeTrendingFeed: {
        useQuery: (input: { tab: string; suburb?: string }) => {
          mocks.feedInputs.push(input);
          return { data: { items: [] }, isLoading: false, isError: false, refetch: vi.fn() };
        },
      },
    },
  },
}));

vi.mock('wouter', () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
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

describe('SuburbGuidePage transaction lanes', () => {
  beforeEach(() => {
    mocks.feedInputs.length = 0;
    mocks.suburbInputs.length = 0;
    mocks.suburbData = suburbData('Sandton', 'sandton');
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
    expect(container.querySelector('#new-developments [role="group"]')).toBeNull();
    expect(mocks.feedInputs.map(input => input.tab)).toEqual(['buy', 'rent', 'developments']);
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
    expect(mocks.feedInputs.map(input => input.tab)).toEqual(['buy', 'rent', 'developments']);
    expect(mocks.feedInputs.every(input => input.suburb === 'Rosebank')).toBe(true);
  });
});
