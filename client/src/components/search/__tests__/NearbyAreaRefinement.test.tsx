import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NearbyAreaRefinement } from '../NearbyAreaRefinement';
import { SearchResultsSponsorSlot } from '../SearchResultsSponsorSlot';
import { resolveSearchIntent } from '@/lib/searchIntent';

const { navigate, nearby } = vi.hoisted(() => ({
  navigate: vi.fn(),
  nearby: { data: [] as Array<{ placeId: string; name: string; distanceKm: number }>, calls: [] as unknown[] },
}));
vi.mock('wouter', () => ({ useLocation: () => ['/property-for-sale', navigate] }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    placeAuthority: {
      getNearbyPlaces: {
        useQuery: (input: unknown, options: { enabled?: boolean }) => {
          nearby.calls.push({ input, options });
          return { data: options.enabled ? nearby.data : undefined };
        },
      },
    },
  },
}));

const id = (n: number) => `pl-place-01-${String(n).padStart(24, '0')}`;
const intentFor = (placeIds: string[], extra = '') =>
  resolveSearchIntent(
    '/property-for-sale',
    {},
    new URLSearchParams(placeIds.map(value => `canonicalPlaceId=${value}`).join('&') + extra),
  );
const areas = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    placeId: id(100 + index),
    name: `Suburb ${index + 1}`,
    distanceKm: index + 1.5,
  }));

beforeEach(() => {
  navigate.mockClear();
  nearby.calls = [];
  nearby.data = areas(8);
});
afterEach(cleanup);

describe('NearbyAreaRefinement', () => {
  it('shows the five nearest areas and asks the server about every selected Place', () => {
    render(<NearbyAreaRefinement intent={intentFor([id(1), id(2)])} />);
    expect(screen.getAllByRole('button', { name: /^Add Suburb/ })).toHaveLength(5);
    expect(nearby.calls[0]).toMatchObject({ input: { canonicalPlaceIds: [id(1), id(2)] } });
  });

  it('adds the chosen area to the URL (deduped) and keeps the filters', () => {
    render(<NearbyAreaRefinement intent={intentFor([id(1)], '&propertyType=house&minBedrooms=2')} />);
    fireEvent.click(screen.getByRole('button', { name: /^Add Suburb 2 to this search/ }));
    expect(navigate).toHaveBeenCalledTimes(1);
    const url = new URL(navigate.mock.calls[0][0] as string, 'https://listify.test');
    expect(url.pathname).toBe('/property-for-sale');
    expect(url.searchParams.getAll('canonicalPlaceId')).toEqual([id(1), id(101)]);
    expect(url.searchParams.get('propertyType')).toBe('house');
    expect(url.searchParams.get('minBedrooms')).toBe('2');
  });

  it('filters the explore list by name and shows an empty message', () => {
    render(<NearbyAreaRefinement intent={intentFor([id(1)])} />);
    fireEvent.click(screen.getByRole('button', { name: /Explore other areas/ }));
    fireEvent.change(screen.getByLabelText('Search nearby suburbs'), { target: { value: 'suburb 7' } });
    expect(screen.getAllByRole('button', { name: /^Add Suburb/ })).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Search nearby suburbs'), { target: { value: 'zzz' } });
    expect(screen.getByText('No nearby suburbs match that search.')).toBeInTheDocument();
  });

  it('stops offering areas at the ten-area limit', () => {
    const ten = Array.from({ length: 10 }, (_, index) => id(index + 1));
    render(<NearbyAreaRefinement intent={intentFor(ten)} />);
    expect(screen.getByText(/reached the 10-area limit/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Add / })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Explore other areas/ })).not.toBeInTheDocument();
  });

  it('renders nothing when there are no nearby suburbs or no selected Place', () => {
    nearby.data = [];
    const { container, rerender } = render(<NearbyAreaRefinement intent={intentFor([id(1)])} />);
    expect(container).toBeEmptyDOMElement();
    nearby.data = areas(3);
    rerender(<NearbyAreaRefinement intent={intentFor([])} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('SearchResultsSponsorSlot', () => {
  it('renders nothing (no label, no empty box) without a sponsor', () => {
    const { container, rerender } = render(<SearchResultsSponsorSlot />);
    expect(container).toBeEmptyDOMElement();
    rerender(<SearchResultsSponsorSlot sponsor={null} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/Advertisement space/i)).not.toBeInTheDocument();
  });

  it('renders a labelled campaign when one is supplied', () => {
    render(
      <SearchResultsSponsorSlot
        sponsor={{ imageUrl: '/ad.jpg', landingPageUrl: '/campaign', altText: 'Campaign' }}
      />,
    );
    expect(screen.getByText('Sponsored')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Campaign' })).toHaveAttribute('href', '/campaign');
  });
});
