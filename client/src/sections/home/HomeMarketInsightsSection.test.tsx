import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ query: {} as Record<string, unknown>, refetch: vi.fn() }));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    homeMarketInsights: {
      getHomepageCityInsights: { useQuery: () => state.query },
    },
  },
}));

import { HomeMarketInsightsSection } from './HomeMarketInsightsSection';

const insight = {
  city: {
    id: 12,
    name: 'Johannesburg',
    slug: 'johannesburg',
    provinceName: 'Gauteng',
    provinceSlug: 'gauteng',
  },
  activeListingCount: 12,
  medianAskingPrice: 2_000_000,
  typicalAskingPricePerM2: 20_000,
  priceDistribution: [{ label: 'R1m – R2m', count: 12 }],
  leadingLocalities: [{ name: 'Sandton', slug: 'sandton', listingCount: 5 }],
};

const capeTownInsight = {
  city: {
    id: 13,
    name: 'Cape Town',
    slug: 'cape-town',
    provinceName: 'Western Cape',
    provinceSlug: 'western-cape',
  },
  activeListingCount: 8,
  medianAskingPrice: 3_500_000,
  typicalAskingPricePerM2: 28_000,
  priceDistribution: [{ label: 'R2m – R5m', count: 8 }],
  leadingLocalities: [{ name: 'Sea Point', slug: 'sea-point', listingCount: 4 }],
};

describe('HomeMarketInsightsSection', () => {
  beforeEach(() => {
    state.refetch.mockReset();
    state.query = { data: [insight], isLoading: false, isError: false, refetch: state.refetch };
  });

  it('restores the three-part insight experience while keeping asking inventory and canonical routes clear', () => {
    render(<HomeMarketInsightsSection />);

    expect(
      screen.getByRole('heading', { name: 'Make smarter property decisions' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Explore local supply' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Asking price' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Market activity' })).toBeInTheDocument();
    expect(screen.getByText(/current asking inventory signals/i)).toBeInTheDocument();
    expect(screen.getByText('Median asking price')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /explore johannesburg/i })).toHaveAttribute(
      'href',
      '/gauteng/johannesburg',
    );
    expect(screen.getByRole('link', { name: /sandton/i })).toHaveAttribute(
      'href',
      '/gauteng/johannesburg/sandton',
    );
  });

  it('updates all three insight cards when a different city is selected', () => {
    state.query = {
      data: [insight, capeTownInsight],
      isLoading: false,
      isError: false,
      refetch: state.refetch,
    };
    render(<HomeMarketInsightsSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Cape Town' }));

    expect(screen.getByRole('button', { name: 'Cape Town' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('link', { name: /explore cape town/i })).toHaveAttribute(
      'href',
      '/western-cape/cape-town',
    );
    expect(screen.getByRole('link', { name: /sea point/i })).toHaveAttribute(
      'href',
      '/western-cape/cape-town/sea-point',
    );
  });

  it('keeps a service failure distinct from an empty result', () => {
    state.query = { ...state.query, isError: true };
    render(<HomeMarketInsightsSection />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Property price insights could not be loaded',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(state.refetch).toHaveBeenCalledTimes(1);
  });
});
