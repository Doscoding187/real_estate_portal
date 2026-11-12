import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useQuery, refetch, homeSearch } = vi.hoisted(() => ({
  useQuery: vi.fn(),
  refetch: vi.fn(),
  homeSearch: { current: null as unknown },
}));

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
vi.mock('@/contexts/HomeSearchContext', () => ({ useHomeSearch: () => homeSearch.current }));
vi.mock('@/components/SavePropertyPrompt', () => ({ SavePropertyPrompt: () => null }));
vi.mock('@/components/HomeAreaPicker', () => ({
  HomeAreaPicker: () => <div data-testid="area-picker" />,
}));
vi.mock('@/components/ui/carousel', () => ({
  Carousel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CarouselContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CarouselItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CarouselNext: () => null,
  CarouselPrevious: () => null,
}));

import { HomeTrendingSection } from './HomeTrendingSection';

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

function makeHomeSearch(overrides: Record<string, unknown> = {}) {
  return {
    journey: '',
    locations: [],
    setLocations: vi.fn(),
    setConfirmedBroadPlaceId: vi.fn(),
    ...overrides,
  };
}

describe('HomeTrendingSection', () => {
  beforeEach(() => {
    useQuery.mockReset();
    refetch.mockReset();
    useQuery.mockReturnValue({
      data: { cards: [card] },
      isLoading: false,
      isError: false,
      refetch,
    });
    homeSearch.current = makeHomeSearch();
  });

  it('has one h2, six tabs in order, and Buy selected by default', () => {
    render(<HomeTrendingSection />);

    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Trending properties' }),
    ).toBeInTheDocument();
    const tabs = within(screen.getByRole('tablist')).getAllByRole('tab');
    expect(tabs.map(tab => tab.textContent)).toEqual([
      'Buy',
      'Rent',
      'New Developments',
      'Shared Living',
      'Commercial',
      'Plots & Land',
    ]);
    expect(screen.getByRole('tab', { name: 'Buy' })).toHaveAttribute('aria-selected', 'true');
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ listingType: 'sale' }),
      expect.anything(),
    );
  });

  it('starts on the hero journey when it matches a tab', () => {
    homeSearch.current = makeHomeSearch({ journey: 'rent' });
    render(<HomeTrendingSection />);

    expect(screen.getByRole('tab', { name: 'Rent' })).toHaveAttribute('aria-selected', 'true');
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ listingType: 'rent' }),
      expect.anything(),
    );
  });

  it('shows real listings from the national feed when no area is chosen', () => {
    render(<HomeTrendingSection />);

    expect(screen.getByText('Sunny family home')).toBeInTheDocument();
    const input = useQuery.mock.calls[0][0];
    expect(input).not.toHaveProperty('canonicalPlaceId');
    expect(screen.getByRole('button', { name: 'Choose an area' })).toBeInTheDocument();
  });

  it('scopes the feed to the area chosen in the homepage picker', () => {
    homeSearch.current = makeHomeSearch({
      locations: [{ canonicalPlaceId: 'pl-place-01-abc', name: 'Durban' }],
    });
    render(<HomeTrendingSection />);

    expect(useQuery.mock.calls[0][0]).toMatchObject({ canonicalPlaceId: 'pl-place-01-abc' });
    expect(screen.getByText('Homes in Durban')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Choose another area' }));
    expect(screen.getByTestId('area-picker')).toBeInTheDocument();
  });

  it('switches tab content when a tab is clicked', () => {
    render(<HomeTrendingSection />);

    fireEvent.click(screen.getByRole('tab', { name: 'Shared Living' }));

    expect(screen.getByRole('tab', { name: 'Shared Living' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.queryByText('Sunny family home')).not.toBeInTheDocument();
    expect(screen.getByText('Shared living rooms are coming soon.')).toBeInTheDocument();
  });

  it.each([
    [
      'New Developments',
      'New developments are launching soon.',
      'Are you a developer? List your development',
      '/advertise/sell/developers',
    ],
    ['Shared Living', 'Shared living rooms are coming soon.', 'List with us', '/advertise'],
    ['Commercial', 'Commercial space is coming soon.', 'List with us', '/advertise'],
    ['Plots & Land', 'Plots and land are coming soon.', 'List with us', '/advertise'],
  ])('%s shows its empty state with one action', (tab, message, label, href) => {
    render(<HomeTrendingSection />);
    useQuery.mockClear();

    fireEvent.click(screen.getByRole('tab', { name: tab }));

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href);
    expect(useQuery).not.toHaveBeenCalled();
  });

  it('supports arrow, Home and End keys on the tab row', () => {
    render(<HomeTrendingSection />);
    const buy = screen.getByRole('tab', { name: 'Buy' });

    fireEvent.keyDown(buy, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Rent' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Rent' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Rent' }), { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Plots & Land' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Plots & Land' }), { key: 'Home' });
    expect(screen.getByRole('tab', { name: 'Buy' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Buy' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'Rent' })).toHaveAttribute('tabindex', '-1');
  });

  it('shows skeleton cards while loading', () => {
    useQuery.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch });
    render(<HomeTrendingSection />);

    expect(screen.getAllByTestId('home-property-skeleton').length).toBeGreaterThan(0);
  });

  it('shows one line and Try again on error', () => {
    useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isFetching: false,
      refetch,
    });
    render(<HomeTrendingSection />);

    expect(screen.getByRole('alert')).toHaveTextContent('We could not load homes just now.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('offers List with us when nothing is listed and no area is chosen', () => {
    useQuery.mockReturnValue({ data: { cards: [] }, isLoading: false, isError: false, refetch });
    render(<HomeTrendingSection />);

    expect(screen.getByText('No homes listed here yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /list with us/i })).toHaveAttribute(
      'href',
      '/advertise',
    );
  });

  it('offers another area when nothing is listed in the chosen area', () => {
    homeSearch.current = makeHomeSearch({
      locations: [{ canonicalPlaceId: 'pl-place-01-abc', name: 'Durban' }],
    });
    useQuery.mockReturnValue({ data: { cards: [] }, isLoading: false, isError: false, refetch });
    render(<HomeTrendingSection />);

    expect(screen.getByText('No homes listed here yet.')).toBeInTheDocument();
    const empty = screen.getByTestId('section-empty-state');
    fireEvent.click(within(empty).getByRole('button', { name: /choose another area/i }));
    expect(screen.getByTestId('area-picker')).toBeInTheDocument();
  });

  it('drops listings without a real photo and developments', () => {
    useQuery.mockReturnValue({
      data: {
        cards: [
          { ...card, id: '8', title: 'No photo', image: '' },
          { ...card, id: '9', title: 'A development', kind: 'development' },
        ],
      },
      isLoading: false,
      isError: false,
      refetch,
    });
    render(<HomeTrendingSection />);

    expect(screen.queryByText('No photo')).not.toBeInTheDocument();
    expect(screen.queryByText('A development')).not.toBeInTheDocument();
    expect(screen.getByText('No homes listed here yet.')).toBeInTheDocument();
  });
});
