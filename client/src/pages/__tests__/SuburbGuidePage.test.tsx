import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  feedInputs: [] as Array<{ tab: string; suburb?: string }>,
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    locationPages: {
      getSuburbData: {
        useQuery: () => ({
          data: {
            suburb: {
              id: 81,
              name: 'Sandton',
              slug: 'sandton',
              cityId: 4,
              cityName: 'Johannesburg',
              citySlug: 'johannesburg',
              provinceName: 'Gauteng',
              provinceSlug: 'gauteng',
            },
            stats: { totalListings: 8, saleCount: 5, rentalCount: 3 },
            listings: [],
          },
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        }),
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
vi.mock('@/lib/publicNavigation', () => ({ isHomepageHeroJourneyEnabled: () => true }));
vi.mock('@/lib/cityGuideImages', () => ({ getCityGuideImage: () => undefined }));

import SuburbGuidePage from '../SuburbGuidePage';

describe('SuburbGuidePage transaction lanes', () => {
  beforeEach(() => {
    mocks.feedInputs.length = 0;
  });

  it('keeps sale, rental and development discovery separate and removes transaction tabs from projects', () => {
    const { container } = render(
      <SuburbGuidePage params={{ province: 'gauteng', city: 'johannesburg', suburb: 'sandton' }} />,
    );

    expect(screen.getByRole('heading', { name: 'Homes for sale in Sandton' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Homes to rent in Sandton' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'New developments in Sandton' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /new developments and rentals/i })).toBeNull();
    expect(container.querySelector('#new-developments [role="group"]')).toBeNull();
    expect(mocks.feedInputs.map(input => input.tab)).toEqual(['buy', 'rent', 'developments']);
    expect(mocks.feedInputs.every(input => input.suburb === 'Sandton')).toBe(true);
  });
});
