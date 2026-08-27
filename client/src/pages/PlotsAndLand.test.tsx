import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LAND_CLASSIFICATION_LABELS, LAND_PUBLIC_CLASSIFICATIONS } from '@shared/land-domain';

const { search } = vi.hoisted(() => ({
  search: vi.fn(() => ({ data: [] })),
}));

vi.mock('wouter', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    landPublic: {
      search: {
        useQuery: search,
      },
    },
  },
}));

import PlotsAndLand from './PlotsAndLand';

const landResult = {
  listingId: 42,
  href: '/plots-and-land/north-ridge',
  title: 'North Ridge',
  description: 'A confirmed residential land opportunity.',
  askingPrice: '1000000',
  city: 'Johannesburg',
  province: 'Gauteng',
  classification: 'residential_stand',
  intendedUse: 'Residential',
  extentM2: '1200',
  passport: { trustState: 'reviewed' },
};

describe('Plots & Land results handoff', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/plots-and-land');
    search.mockReset();
    search.mockReturnValue({ data: [landResult], error: null, isLoading: false });
  });

  afterEach(() => cleanup());

  it('restores hero classification and price filters for the Land search', () => {
    window.history.replaceState(
      {},
      '',
      '/plots-and-land?locationId=city%3A12&classification=residential_stand&maxPrice=1000000',
    );

    render(<PlotsAndLand />);

    expect(screen.getByRole('combobox', { name: 'Land type' })).toHaveTextContent(
      LAND_CLASSIFICATION_LABELS.residential_stand,
    );
    expect(screen.getByLabelText('Maximum price (R)')).toHaveValue(1_000_000);
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        locationId: 'city:12',
        classification: 'residential_stand',
        maxPrice: 1_000_000,
      }),
    );
    expect(screen.getByRole('link', { name: /North Ridge/ })).toHaveAttribute(
      'href',
      '/plots-and-land/north-ridge',
    );
  });

  it('passes sibling OR locations to the Land search without collapsing them', () => {
    window.history.replaceState(
      {},
      '',
      '/plots-and-land?locationIds=city%3A12&locationIds=city%3A21&classification=development_land',
    );

    render(<PlotsAndLand />);

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        locationId: undefined,
        locationIds: ['city:12', 'city:21'],
        searchAreaId: undefined,
        classification: 'development_land',
      }),
    );
  });

  it('passes a governed Search Area as the sole geography authority', () => {
    window.history.replaceState(
      {},
      '',
      '/plots-and-land?searchAreaId=johannesburg-sandton&classification=residential_stand',
    );

    render(<PlotsAndLand />);

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        locationId: undefined,
        locationIds: undefined,
        searchAreaId: 'johannesburg-sandton',
        classification: 'residential_stand',
      }),
    );
  });

  it('drops an unsupported public classification before querying', () => {
    window.history.replaceState(
      {},
      '',
      '/plots-and-land?locationId=city%3A12&classification=not-a-land-type&maxPrice=1000000',
    );

    render(<PlotsAndLand />);

    expect(screen.getByRole('combobox', { name: 'Land type' })).toHaveTextContent('Any land type');
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        locationId: 'city:12',
        classification: undefined,
        maxPrice: 1_000_000,
      }),
    );
    expect(new URLSearchParams(window.location.search).get('classification')).toBeNull();
  });

  it('exposes only the governed public classifications in the design-system selector', () => {
    render(<PlotsAndLand />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Land type' }));

    expect(screen.getAllByRole('option')).toHaveLength(LAND_PUBLIC_CLASSIFICATIONS.length + 1);
    for (const classification of LAND_PUBLIC_CLASSIFICATIONS) {
      expect(
        screen.getByRole('option', { name: LAND_CLASSIFICATION_LABELS[classification] }),
      ).toBeInTheDocument();
    }
  });
});
