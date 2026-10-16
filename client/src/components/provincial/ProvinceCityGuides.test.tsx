import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProvinceCityGuides } from './ProvinceCityGuides';

const market = {
  slug: 'pretoria',
  name: 'Pretoria',
  city: { name: 'Pretoria', slug: 'pretoria', canonicalLocationId: 'city:18' },
  state: 'empty',
  inventory: { total: 0 },
};
const province = { provinceSlug: 'gauteng', provinceName: 'Gauteng' };

describe('Province city guide discovery', () => {
  it('opens the city guide even with no sale stock and uses the shared homepage entry', () => {
    render(<ProvinceCityGuides {...province} markets={[market]} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'City guides' })).getAllByRole('listitem'),
    ).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Explore Pretoria' })).toHaveAttribute(
      'href',
      '/gauteng/pretoria',
    );
    expect(screen.getByRole('img', { name: /city scene of Pretoria/ })).toHaveAttribute(
      'sizes',
      '64px',
    );
    expect(screen.queryByText(/for sale|sale listings/)).not.toBeInTheDocument();
  });
  it('keeps a resolved guide useful when inventory is unavailable', () => {
    render(
      <ProvinceCityGuides
        {...province}
        markets={[{ ...market, inventory: null, state: 'unavailable' }]}
      />,
    );
    expect(screen.getByRole('link', { name: 'Explore Pretoria' })).toBeInTheDocument();
    expect(screen.queryByText('Inventory unavailable')).not.toBeInTheDocument();
  });
  it('does not fabricate a link for a guide that is still loading', () => {
    render(
      <ProvinceCityGuides {...province} markets={[{ ...market, city: null }]} guidesLoading />,
    );
    expect(screen.getByText('Loading guide…')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
  it('distinguishes unresolved guides from loading guides', () => {
    render(<ProvinceCityGuides {...province} markets={[{ ...market, city: null }]} />);
    expect(screen.getByText('Guide unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Loading guide…')).not.toBeInTheDocument();
  });
  it('deduplicates guides, caps the default and search results at twelve, and finds a city outside the default selection', () => {
    const cities = [
      market.city,
      ...Array.from({ length: 12 }, (_, i) => ({
        name: `Guide city ${i}`,
        slug: `city-${i}`,
        canonicalLocationId: `city:${i + 100}`,
      })),
    ];
    const { rerender } = render(
      <ProvinceCityGuides {...province} markets={[market]} cities={cities} />,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(12);
    expect(screen.getAllByRole('link', { name: 'Explore Pretoria' })).toHaveLength(1);
    expect(screen.queryByRole('link', { name: 'Explore Guide city 11' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show more city guides' })).not.toBeInTheDocument();
    const change = vi.fn();
    const search = {
      query: 'city 11',
      onChange: change,
      results: [cities[cities.length - 1]],
      isLoading: false,
      isError: false,
      onRetry: vi.fn(),
    };
    rerender(
      <ProvinceCityGuides {...province} markets={[market]} cities={cities} search={search} />,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Explore Guide city 11' })).toHaveAttribute(
      'href',
      '/gauteng/city-11',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear city search' }));
    expect(change).toHaveBeenCalledWith('');
  });
  it('caps broad city search matches at twelve', () => {
    const results = Array.from({ length: 20 }, (_, i) => ({
      name: `City ${i}`,
      slug: `city-${i}`,
      canonicalLocationId: `city:${i + 100}`,
    }));
    render(
      <ProvinceCityGuides
        {...province}
        markets={[]}
        search={{
          query: 'city',
          onChange: vi.fn(),
          results,
          isLoading: false,
          isError: false,
          onRetry: vi.fn(),
        }}
      />,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(12);
    expect(screen.queryByRole('button', { name: 'Show more city guides' })).not.toBeInTheDocument();
  });
  it('distinguishes search loading, errors and successful empty matches', () => {
    const search = {
      query: 'Pretoria',
      onChange: vi.fn(),
      results: [],
      isLoading: true,
      isError: false,
      onRetry: vi.fn(),
    };
    const { rerender } = render(
      <ProvinceCityGuides {...province} markets={[market]} search={search} />,
    );
    expect(screen.getByRole('status', { name: 'Searching city guides' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    rerender(
      <ProvinceCityGuides
        {...province}
        markets={[market]}
        search={{ ...search, isLoading: false, isError: true }}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('City guides could not be loaded');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(search.onRetry).toHaveBeenCalledOnce();
    rerender(
      <ProvinceCityGuides
        {...province}
        markets={[market]}
        search={{ ...search, isLoading: false }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('No city guides found');
  });
});
