import type { ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  query: {} as Record<string, unknown>,
  refetch: vi.fn(),
  homeFeedUseQuery: vi.fn(),
  invalidateFavorites: vi.fn(),
  mutateFavorite: vi.fn(),
  setLocation: vi.fn(),
  isAuthenticated: false,
  favorites: [] as Array<{ propertyId: number }>,
  favoritePending: false,
  favoriteVariables: undefined as { propertyId?: number } | undefined,
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({
      properties: { getFavorites: { invalidate: testState.invalidateFavorites } },
    }),
    properties: {
      getFavorites: { useQuery: () => ({ data: testState.favorites }) },
      toggleFavorite: {
        useMutation: () => ({
          isPending: testState.favoritePending,
          variables: testState.favoriteVariables,
          mutate: testState.mutateFavorite,
        }),
      },
    },
    developer: {
      getHomeTrendingFeed: {
        useQuery: (...args: unknown[]) => {
          testState.homeFeedUseQuery(...args);
          return testState.query;
        },
      },
    },
  },
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: testState.isAuthenticated }),
}));

vi.mock('wouter', () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ['/', testState.setLocation],
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/components/ui/carousel', () => ({
  Carousel: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className} data-slot="carousel">
      {children}
    </div>
  ),
  CarouselContent: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className} data-slot="carousel-content">
      {children}
    </div>
  ),
  CarouselItem: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className} data-slot="carousel-item">
      {children}
    </div>
  ),
  CarouselNext: ({ className }: { className?: string }) => (
    <button aria-label="Next slide" className={className} />
  ),
  CarouselPrevious: ({ className }: { className?: string }) => (
    <button aria-label="Previous slide" className={className} />
  ),
}));

import { HomeTrendingSection } from './HomeTrendingSection';

function renderSection() {
  return render(
    <HomeTrendingSection
      selectedProvince="Gauteng"
      onProvinceChange={vi.fn()}
      activeHeroTab="buy"
    />,
  );
}

describe('HomeTrendingSection request states', () => {
  beforeEach(() => {
    testState.refetch.mockReset();
    testState.refetch.mockResolvedValue(undefined);
    testState.homeFeedUseQuery.mockReset();
    testState.invalidateFavorites.mockReset();
    testState.mutateFavorite.mockReset();
    testState.setLocation.mockReset();
    testState.isAuthenticated = false;
    testState.favorites = [];
    testState.favoritePending = false;
    testState.favoriteVariables = undefined;
    testState.query = {
      data: undefined,
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: testState.refetch,
    };
  });

  it('uses a compact horizontal mobile skeleton while published property is loading', () => {
    testState.query = { ...testState.query, isLoading: true };

    renderSection();

    const loading = screen.getByTestId('home-property-feed-loading');
    const skeletons = within(loading).getAllByTestId('home-property-skeleton');
    expect(skeletons).toHaveLength(4);
    expect(skeletons[0]).toHaveClass('flex-[0_0_77%]', 'p-3');
    expect(screen.queryByText(/No published matches/)).not.toBeInTheDocument();
  });

  it('shows a retryable service error rather than presenting the request as an empty result', () => {
    testState.query = { ...testState.query, isError: true };

    renderSection();

    expect(screen.getByRole('alert')).toHaveTextContent('Property could not be loaded');
    expect(screen.queryByText(/No published matches/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(testState.refetch).toHaveBeenCalledTimes(1);
  });

  it('shows a truthful empty state only after a successful empty response', () => {
    testState.query = { ...testState.query, data: { items: [] } };

    renderSection();

    expect(screen.getByText('No published matches in Gauteng yet')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByTestId('home-property-feed-loading')).not.toBeInTheDocument();
  });

  it('keeps ten selected items in a four-card desktop rail with exterior hover controls', () => {
    const items = Array.from({ length: 10 }, (_, index) => ({
      id: String(index + 1),
      kind: 'listing' as const,
      title: `Published home ${index + 1}`,
      city: 'Johannesburg',
      suburb: 'Sandton',
      priceFrom: 3_850_000,
      priceTo: 3_850_000,
      image: '',
      href: `/property/${index + 1}`,
      listingType: 'sale' as const,
      bedrooms: 4,
      bathrooms: 3,
      area: 238,
      yardSize: 520,
      parkingCount: 4,
      propertyType: 'house',
    }));
    testState.query = { ...testState.query, data: { items } };

    renderSection();

    const rail = screen.getByTestId('home-property-carousel');
    const slides = rail.querySelectorAll('[data-slot="carousel-item"]');
    expect(slides).toHaveLength(10);
    expect(slides[0]).toHaveClass('pl-3.5', 'lg:basis-1/4');
    expect(rail).toHaveClass('group/rail');
    expect(rail.querySelector('[data-slot="carousel"]')).not.toHaveClass('lg:px-12');
    expect(rail.querySelector('[data-slot="carousel-content"]')).toHaveClass('-ml-3.5');
    expect(screen.getAllByRole('button', { name: 'Save property' })).toHaveLength(10);
    expect(screen.getByRole('button', { name: 'Previous slide' })).toHaveClass(
      'lg:-left-12',
      'group-hover/rail:opacity-100',
    );
    expect(screen.getByRole('button', { name: 'Next slide' })).toHaveClass(
      'lg:-right-12',
      'group-hover/rail:opacity-100',
    );
    expect(screen.getAllByText('For sale')).toHaveLength(10);
    expect(screen.queryByText('Resale')).not.toBeInTheDocument();
    expect(testState.homeFeedUseQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ limit: 10, tab: 'buy' }),
      expect.any(Object),
    );
  });

  it('saves a property through the authenticated favourite mutation', () => {
    testState.isAuthenticated = true;
    testState.query = {
      ...testState.query,
      data: {
        items: [
          {
            id: '41',
            kind: 'listing',
            title: 'Published home',
            city: 'Johannesburg',
            suburb: 'Sandton',
            priceFrom: 3_850_000,
            priceTo: 3_850_000,
            image: '',
            href: '/property/41',
            listingType: 'sale',
            bedrooms: 3,
            bathrooms: 2,
            area: 180,
            yardSize: 400,
            parkingCount: 2,
            propertyType: 'house',
          },
        ],
      },
    };

    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Save property' }));

    expect(testState.mutateFavorite).toHaveBeenCalledWith({ propertyId: 41 });
  });

  it('takes an unauthenticated user to sign-in without losing their current location', () => {
    testState.query = {
      ...testState.query,
      data: {
        items: [
          {
            id: '42',
            kind: 'listing',
            title: 'Published home',
            city: 'Johannesburg',
            suburb: 'Sandton',
            priceFrom: 3_850_000,
            priceTo: 3_850_000,
            image: '',
            href: '/property/42',
            listingType: 'sale',
            bedrooms: 3,
            bathrooms: 2,
            area: 180,
            yardSize: 400,
            parkingCount: 2,
            propertyType: 'house',
          },
        ],
      },
    };

    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Save property' }));

    expect(testState.mutateFavorite).not.toHaveBeenCalled();
    expect(testState.setLocation).toHaveBeenCalledWith('/login?redirect=%2F');
  });

  it('hands Land off to its dedicated exact-location journey', () => {
    render(
      <HomeTrendingSection
        selectedProvince="Gauteng"
        onProvinceChange={vi.fn()}
        activeHeroTab="plot_land"
      />,
    );

    expect(screen.getByRole('link', { name: 'Browse plots and land' })).toHaveAttribute(
      'href',
      '/plots-and-land',
    );
    expect(testState.homeFeedUseQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ tab: 'plot_land' }),
      expect.objectContaining({ enabled: false }),
    );
  });
});
