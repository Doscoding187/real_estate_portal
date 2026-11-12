import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useQuery, refetch } = vi.hoisted(() => ({ useQuery: vi.fn(), refetch: vi.fn() }));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({ properties: { getFavorites: { invalidate: vi.fn() } } }),
    properties: {
      searchPublicInventory: { useQuery },
      getFavorites: { useQuery: () => ({ data: [] }) },
      setFavorite: { useMutation: () => ({ isPending: false, mutate: vi.fn() }) },
    },
  },
}));
vi.mock('@/_core/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: false }) }));
vi.mock('@/components/SavePropertyPrompt', () => ({ SavePropertyPrompt: () => null }));
vi.mock('@/components/ui/carousel', () => ({
  Carousel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CarouselContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CarouselItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CarouselNext: () => null,
  CarouselPrevious: () => null,
}));

import { HomeTrendingSection } from './HomeTrendingSection';
import { resetTrendingRailLegacyMode } from './useTrendingRailQuery';
import { HOME_PROVINCES } from '@/lib/homeProvinceOptions';
import type { HeroTab } from '@/types/hero';

const card = {
  kind: 'property',
  id: '7',
  title: 'Sunny family home',
  city: 'Johannesburg',
  suburb: 'Sandton',
  image: 'https://cdn.example.com/home.jpg',
  href: '/property/7',
  price: 2500000,
};

function renderSection(
  props: {
    activeHeroTab?: HeroTab;
    selectedProvince?: string;
    onProvinceChange?: (p: string) => void;
  } = {},
) {
  return render(
    <HomeTrendingSection
      activeHeroTab={props.activeHeroTab ?? 'buy'}
      selectedProvince={props.selectedProvince ?? 'Gauteng'}
      onProvinceChange={props.onProvinceChange ?? vi.fn()}
    />,
  );
}

describe('HomeTrendingSection', () => {
  beforeEach(() => {
    resetTrendingRailLegacyMode();
    useQuery.mockReset();
    refetch.mockReset();
    useQuery.mockReturnValue({
      data: { cards: [card] },
      isLoading: false,
      isError: false,
      refetch,
    });
  });

  it('shows the Buy heading, eyebrow and nine province pills with the selected one pressed', () => {
    renderSection();

    expect(screen.getByText('Explore property')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Homes for sale in Gauteng' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Discover standout homes for sale across South Africa.'),
    ).toBeInTheDocument();
    const pills = within(screen.getByRole('group', { name: 'Province' })).getAllByRole('button');
    expect(pills.map(pill => pill.textContent)).toEqual([
      'Gauteng',
      'Western Cape',
      'KwaZulu-Natal',
      'Eastern Cape',
      'Mpumalanga',
      'Limpopo',
      'North West',
      'Free State',
      'Northern Cape',
    ]);
    expect(screen.getByRole('button', { name: 'Gauteng' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Free State' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByText('Sunny family home')).toBeInTheDocument();
  });

  it('queries sale listings for the selected province and reports province changes', () => {
    const onProvinceChange = vi.fn();
    const { rerender } = renderSection({ onProvinceChange });
    expect(useQuery.mock.calls[0][0]).toMatchObject({
      listingType: 'sale',
      canonicalPlaceId: HOME_PROVINCES[0].placeId,
      sortOption: 'trending',
      requirePhoto: true,
      developmentResultShape: 'unit_type',
      pageSize: 10,
    });
    expect(useQuery.mock.calls[0][0]).not.toHaveProperty('listingSource');

    fireEvent.click(screen.getByRole('button', { name: 'Western Cape' }));
    expect(onProvinceChange).toHaveBeenCalledWith('Western Cape');

    rerender(
      <HomeTrendingSection
        activeHeroTab="buy"
        selectedProvince="Western Cape"
        onProvinceChange={onProvinceChange}
      />,
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'Homes for sale in Western Cape' }),
    ).toBeInTheDocument();
    expect(useQuery.mock.calls.at(-1)?.[0]).toMatchObject({
      canonicalPlaceId: HOME_PROVINCES[1].placeId,
    });
  });

  it('links to the province results for sale and rent, one followable link per province', () => {
    const { rerender } = renderSection({ selectedProvince: 'Western Cape' });
    const sale = screen.getByRole('link', { name: 'View all homes for sale in Western Cape' });
    const saleUrl = new URL(sale.getAttribute('href') as string, 'https://x.test');
    expect(saleUrl.pathname).toBe('/property-for-sale');
    expect(saleUrl.searchParams.get('canonicalPlaceId')).toBe(HOME_PROVINCES[1].placeId);

    rerender(
      <HomeTrendingSection
        activeHeroTab="rent"
        selectedProvince="Free State"
        onProvinceChange={vi.fn()}
      />,
    );
    const rent = screen.getByRole('link', { name: 'View all homes to rent in Free State' });
    const rentUrl = new URL(rent.getAttribute('href') as string, 'https://x.test');
    expect(rentUrl.pathname).toBe('/property-to-rent');
    expect(rentUrl.searchParams.get('canonicalPlaceId')).toBe(
      HOME_PROVINCES.find(province => province.name === 'Free State')?.placeId,
    );
  });

  it('maps Northern Cape and North West to their own province ids', () => {
    renderSection({ selectedProvince: 'Northern Cape' });
    expect(useQuery.mock.calls[0][0].canonicalPlaceId).toBe('pl-place-01-e7be97ff5aaae9fa7ff7d28f');
  });

  it('follows the hero: Rent changes heading, query and card badge', () => {
    renderSection({ activeHeroTab: 'rent' });

    expect(
      screen.getByRole('heading', { level: 2, name: 'Rental properties in Gauteng' }),
    ).toBeInTheDocument();
    expect(useQuery.mock.calls[0][0]).toMatchObject({ listingType: 'rent' });
    expect(screen.getByText('To rent')).toBeInTheDocument();
  });

  it('shows the unit-type empty state on Developments with no query enabled', () => {
    renderSection({ activeHeroTab: 'developments' });

    expect(screen.getByRole('heading', { level: 2, name: 'New developments' })).toBeInTheDocument();
    expect(screen.getByText('New developments are launching soon.')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Talk to us about listing your development' }),
    ).toHaveAttribute('href', '/contact');
    expect(screen.queryByRole('button', { name: 'Gauteng' })).not.toBeInTheDocument();
    expect(useQuery.mock.calls.every(call => call[1]?.enabled === false)).toBe(true);
  });

  it.each([
    ['commercial', 'Commercial space to lease', '/commercial'],
    ['shared_living', 'Shared living opportunities', '/shared-living'],
    ['plot_land', 'Land and plots to explore', '/plots-and-land'],
  ] as const)('%s hands off to its own page and runs no query', (tab, heading, href) => {
    renderSection({ activeHeroTab: tab });

    expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument();
    expect(document.querySelector(`a[href="${href}"]`)).not.toBeNull();
    expect(useQuery.mock.calls.every(call => call[1]?.enabled === false)).toBe(true);
  });

  it('shows skeleton cards while loading and keeps the pills', () => {
    useQuery.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch });
    renderSection();

    expect(screen.getAllByTestId('home-property-skeleton')).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Gauteng' })).toBeInTheDocument();
  });

  it('shows a plain message and Try again on error', () => {
    useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isFetching: false,
      refetch,
    });
    renderSection();

    expect(screen.getByRole('alert')).toHaveTextContent('Property could not be loaded');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows the empty copy inside the frame and keeps the pills', () => {
    useQuery.mockReturnValue({ data: { cards: [] }, isLoading: false, isError: false, refetch });
    renderSection({ selectedProvince: 'Limpopo' });

    expect(screen.getByText('No published matches in Limpopo yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Free State' })).toBeInTheDocument();
  });

  it('trusts the server for photos and shows development unit types as cards with a device-save heart', () => {
    useQuery.mockReturnValue({
      data: {
        cards: [
          {
            kind: 'development',
            id: '5:u1',
            title: '2-bed Apartment',
            image: 'https://cdn.example.com/dev.jpg',
            href: '/development/sample/unit/u1',
            price: 1250000,
            locationLabels: ['Sandton'],
            propertyType: 'house',
            unitType: {
              id: 'u1',
              label: 'Apartment',
              developmentId: 5,
              developmentName: 'Sample Heights',
              bedrooms: 2,
              bathrooms: 1,
              unitSizeM2: 64,
              priceFrom: 1250000,
              availableUnits: 3,
            },
          },
        ],
      },
      isLoading: false,
      isError: false,
      refetch,
    });
    renderSection();

    expect(screen.getByText('New development')).toBeInTheDocument();
    // One badge only: the transaction is already in the section heading.
    expect(screen.queryByText('For sale')).not.toBeInTheDocument();
    expect(screen.queryByText('To rent')).not.toBeInTheDocument();
    // No parking or stand size sent, so there is no fourth item (never the available count).
    expect(screen.getByText('64 m²')).toBeInTheDocument();
    expect(screen.getByText('2 Bed')).toBeInTheDocument();
    expect(screen.getByText('1 Bath')).toBeInTheDocument();
    expect(screen.queryByText(/available/)).not.toBeInTheDocument();
    expect(screen.getByText('2-bed Apartment')).toBeInTheDocument();
    expect(screen.getByText('Sample Heights · Sandton')).toBeInTheDocument();
    expect(screen.getByText(/^From R/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /2-bed Apartment/ })).toHaveAttribute(
      'href',
      '/development/sample/unit/u1',
    );
    expect(screen.queryByRole('button', { name: 'Save property' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Save 2-bed Apartment at Sample Heights' }),
    ).toBeInTheDocument();
    // The card's propertyType is a development-level guess, so no type is shown for a unit type.
    expect(screen.queryByText('House')).not.toBeInTheDocument();
  });

  it('picks the fourth unit-type detail as parking, then stand size, then nothing', () => {
    const card = (id: string, extra: Record<string, unknown>) => ({
      kind: 'development',
      id,
      title: `Unit ${id}`,
      image: 'https://cdn.example.com/dev.jpg',
      href: `/development/sample/unit/${id}`,
      price: 1250000,
      unitType: {
        id,
        label: 'Apartment',
        developmentId: 5,
        developmentName: 'Sample Heights',
        bedrooms: 2,
        bathrooms: 1,
        unitSizeM2: 64,
        priceFrom: 1250000,
        availableUnits: 3,
        ...extra,
      },
    });
    useQuery.mockReturnValue({
      data: {
        cards: [
          card('a', { yardSizeM2: 220, parking: 2 }),
          card('b', { yardSizeM2: 340 }),
          card('c', { availableUnits: null }),
        ],
      },
      isLoading: false,
      isError: false,
      refetch,
    });
    renderSection();

    // a: parking wins over stand size. b: stand size only. c: neither, so no fourth item.
    expect(screen.getAllByText('2 Parking')).toHaveLength(1);
    expect(screen.queryByText('220 m²')).not.toBeInTheDocument();
    expect(screen.getByText('340 m²')).toBeInTheDocument();
    expect(screen.queryByText(/available/)).not.toBeInTheDocument();
    expect(screen.getAllByText('64 m²')).toHaveLength(3);
  });

  it('keeps a heart on ordinary listings', () => {
    renderSection();
    expect(screen.getByRole('button', { name: 'Save property' })).toBeInTheDocument();
  });
});
