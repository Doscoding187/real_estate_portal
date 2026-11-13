import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useQuery, refetch, toastSuccess, setFavorite } = vi.hoisted(() => ({
  useQuery: vi.fn(),
  refetch: vi.fn(),
  toastSuccess: vi.fn(),
  setFavorite: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: vi.fn() } }));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({ properties: { getFavorites: { invalidate: vi.fn() } } }),
    properties: {
      searchPublicInventory: { useQuery },
      getFavorites: { useQuery: () => ({ data: [] }) },
      setFavorite: { useMutation: () => ({ isPending: false, mutate: setFavorite }) },
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
import { SAVED_UNIT_TYPES_KEY } from '@/lib/savedUnitTypes';

const listing = {
  kind: 'property',
  id: '7',
  title: 'Sunny family home',
  city: 'Johannesburg',
  suburb: 'Sandton',
  image: 'https://cdn.example.com/home.jpg',
  href: '/property/7',
  price: 2500000,
};
const unit = {
  kind: 'development',
  id: '5:u1',
  title: '2-bed Apartment',
  image: 'https://cdn.example.com/dev.jpg',
  href: '/development/sample/unit/u1',
  price: 1250000,
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
};

describe('HomeTrendingSection unit-type heart (saved on this device)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetTrendingRailLegacyMode();
    toastSuccess.mockReset();
    setFavorite.mockReset();
    useQuery.mockReturnValue({
      data: { cards: [listing, unit] },
      isLoading: false,
      isError: false,
      refetch,
    });
  });

  const render_ = () =>
    render(
      <HomeTrendingSection
        activeHeroTab="buy"
        selectedProvince="Gauteng"
        onProvinceChange={vi.fn()}
      />,
    );

  it('toggles the device save with aria state, toast and no navigation or sign-in prompt', () => {
    render_();
    const save = screen.getByRole('button', { name: 'Save 2-bed Apartment at Sample Heights' });
    expect(save).toHaveAttribute('aria-pressed', 'false');
    const navigate = vi.fn((event: Event) => event.preventDefault());
    window.addEventListener('click', navigate);
    fireEvent.click(save);
    window.removeEventListener('click', navigate);

    const remove = screen.getByRole('button', {
      name: 'Remove 2-bed Apartment at Sample Heights from saved',
    });
    expect(remove).toHaveAttribute('aria-pressed', 'true');
    expect(toastSuccess).toHaveBeenCalledWith(
      'Saved on this device. Sign-in sync for new developments is coming.',
    );
    expect(JSON.parse(window.localStorage.getItem(SAVED_UNIT_TYPES_KEY) as string)).toHaveLength(1);
    expect(setFavorite).not.toHaveBeenCalled();

    fireEvent.click(remove);
    expect(toastSuccess).toHaveBeenLastCalledWith('Removed from saved');
    expect(
      screen.getByRole('button', { name: 'Save 2-bed Apartment at Sample Heights' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('does not follow the card link when the heart is clicked', () => {
    render_();
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    screen
      .getByRole('button', { name: 'Save 2-bed Apartment at Sample Heights' })
      .dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves the listing heart unchanged (account save, sign-in prompt, no device save)', () => {
    render_();
    const heart = screen.getByRole('button', { name: 'Save property' });
    fireEvent.click(heart);
    expect(window.localStorage.getItem(SAVED_UNIT_TYPES_KEY)).toBeNull();
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(heart).toHaveAttribute('aria-pressed', 'false');
  });
});
