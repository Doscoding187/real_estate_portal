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

describe('HomeMarketInsightsSection', () => {
  beforeEach(() => {
    state.refetch.mockReset();
    state.query = { data: [insight], isLoading: false, isError: false, refetch: state.refetch };
  });

  it('labels its metrics as asking inventory and routes to canonical city and suburb pages', () => {
    render(<HomeMarketInsightsSection />);

    expect(
      screen.getByText(/live snapshot of qualifying published homes for sale/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Median asking price')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /explore johannesburg market/i })).toHaveAttribute(
      'href',
      '/gauteng/johannesburg',
    );
    expect(screen.getByRole('link', { name: /sandton/i })).toHaveAttribute(
      'href',
      '/gauteng/johannesburg/sandton',
    );
  });

  it('keeps a service failure distinct from an empty result', () => {
    state.query = { ...state.query, isError: true };
    render(<HomeMarketInsightsSection />);

    expect(screen.getByRole('alert')).toHaveTextContent('Market insights could not be loaded');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(state.refetch).toHaveBeenCalledTimes(1);
  });
});
