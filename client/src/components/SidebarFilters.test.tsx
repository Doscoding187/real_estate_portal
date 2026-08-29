import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { SidebarFilters } from './SidebarFilters';

describe('SidebarFilters count authority', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  afterAll(() => vi.unstubAllGlobals());

  it('keeps filter choices usable without fabricating unavailable zero counts', () => {
    render(
      <SidebarFilters
        filters={{}}
        onFilterChange={vi.fn()}
        allowedPropertyTypes={['house', 'apartment']}
        showLocationRefinement={false}
      />,
    );

    expect(screen.getByText('Houses')).toBeInTheDocument();
    expect(screen.getByText('Apartments / Flats')).toBeInTheDocument();
    expect(screen.queryByText('(0)')).not.toBeInTheDocument();
  });

  it('renders counts only when an authoritative count source supplies them', () => {
    render(
      <SidebarFilters
        filters={{}}
        filterCounts={{ byType: { house: 12 } }}
        onFilterChange={vi.fn()}
        allowedPropertyTypes={['house', 'apartment']}
        showLocationRefinement={false}
      />,
    );

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.queryByText('(0)')).not.toBeInTheDocument();
  });

  it('describes the maximum budget as an upper bound rather than an open-ended floor', () => {
    render(
      <SidebarFilters
        filters={{ minPrice: 500_000, maxPrice: 2_000_000 }}
        onFilterChange={vi.fn()}
        showLocationRefinement={false}
      />,
    );

    expect(screen.getByLabelText('Minimum budget R 500K')).toHaveTextContent('R 500K');
    expect(screen.getByLabelText('Maximum budget R 2M')).toHaveTextContent('R 2M');
    expect(screen.getByText('R 2M')).toBeInTheDocument();
    expect(screen.queryByText('R 2M+')).not.toBeInTheDocument();
  });

  it('uses the canonical open-ended rental budget control', () => {
    render(
      <SidebarFilters
        filters={{}}
        onFilterChange={vi.fn()}
        listingType="rent"
        showLocationRefinement={false}
      />,
    );

    expect(screen.getByText('Monthly rent')).toBeInTheDocument();
    expect(screen.getByLabelText('Maximum budget R 250K')).toHaveTextContent('R 250K+');
  });
});
