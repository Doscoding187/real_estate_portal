import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useQuery } = vi.hoisted(() => ({
  useQuery: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    developer: {
      getHomeTrendingFeed: { useQuery },
    },
  },
}));

import { LocationTrendingFeedSection } from '../LocationTrendingFeedSection';

describe('LocationTrendingFeedSection neutral mode', () => {
  beforeEach(() => {
    useQuery.mockReset();
    useQuery.mockImplementation(() => ({ data: { items: [] } }));
  });

  it('does not initialise a journey or query live feed data before Buy is chosen', () => {
    render(<LocationTrendingFeedSection locationName="Pretoria" neutralMode />);

    expect(screen.getByRole('heading', { name: 'Explore Pretoria' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buy' })).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByText(/Choose a supported journey to view published opportunities/),
    ).toBeInTheDocument();

    screen
      .getAllByRole('button')
      .filter(button => button.textContent !== 'Buy')
      .forEach(button => expect(button).toBeDisabled());
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ tab: 'buy' }),
      expect.objectContaining({ enabled: false }),
    );
  });

  it('does not expose the deferred Land tab, including when stale state requests it', () => {
    render(<LocationTrendingFeedSection locationName="Pretoria" activeTab="plot_land" />);

    expect(screen.queryByRole('button', { name: 'Plot & Land' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Explore Pretoria' })).toBeInTheDocument();
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ tab: 'buy' }),
      expect.objectContaining({ enabled: false }),
    );
  });
});

describe('LocationTrendingFeedSection resolution reporting', () => {
  beforeEach(() => {
    useQuery.mockReset();
    useQuery.mockImplementation(() => ({ data: { items: [] }, isLoading: false, isError: false }));
  });

  it('reports an empty resolution and collapses the section when hideWhenEmpty is set', () => {
    const onFeedResolutionChange = vi.fn();

    const { container } = render(
      <LocationTrendingFeedSection
        locationName="Sandton"
        activeTab="buy"
        hideWhenEmpty
        onFeedResolutionChange={onFeedResolutionChange}
      />,
    );

    expect(container.querySelector('section')).toBeNull();
    expect(onFeedResolutionChange).toHaveBeenCalledWith('buy', 'empty');
  });

  it('keeps a resolved feed visible and reports items', () => {
    useQuery.mockReturnValue({
      data: {
        items: [
          {
            id: 'listing-1',
            kind: 'listing',
            title: 'Sandton home',
            city: 'Johannesburg',
            suburb: 'Sandton',
            priceFrom: 1_500_000,
            image: 'https://cdn.example.com/home.jpg',
            href: '/property/listing-1',
            listingType: 'sale',
          },
        ],
      },
      isLoading: false,
      isError: false,
    });
    const onFeedResolutionChange = vi.fn();

    render(
      <LocationTrendingFeedSection
        locationName="Sandton"
        activeTab="buy"
        hideWhenEmpty
        onFeedResolutionChange={onFeedResolutionChange}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Residential Properties for Sale in Sandton' }),
    ).toBeInTheDocument();
    expect(onFeedResolutionChange).toHaveBeenCalledWith('buy', 'items');
  });
});
