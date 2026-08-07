import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { useMemo } from 'react';
import { useLocation, useSearch } from 'wouter';
import { describe, expect, it, afterEach } from 'vitest';
import { resolveSearchIntent } from '../searchIntent';
import { toBuyPublicSearchFilters } from '../../../../shared/buySearchContract';

function QueryStateProbe() {
  const [location] = useLocation();
  const search = useSearch();
  const intent = useMemo(
    () => resolveSearchIntent(location, {}, new URLSearchParams(search)),
    [location, search],
  );
  const filters = {
    ...intent.filters,
    locationId: intent.geography.locationId,
    locationIds: intent.geography.locationIds,
    searchAreaId: intent.geography.searchAreaId,
    searchAreaIds: intent.geography.searchAreaIds,
  };
  const publicRequest =
    intent.transactionType === 'for-sale'
      ? {
          ...toBuyPublicSearchFilters(filters),
          locationId: intent.geography.locationId,
          locationIds: intent.geography.locationIds,
          searchAreaId: intent.geography.searchAreaId,
          searchAreaIds: intent.geography.searchAreaIds,
          sortOption: intent.resultState.sort,
          page: intent.resultState.page,
        }
      : intent.transactionType === 'to-rent'
        ? {
            listingType: 'rent',
            locationIds: intent.geography.locationIds,
            searchAreaId: intent.geography.searchAreaId,
            searchAreaIds: intent.geography.searchAreaIds,
            sortOption: intent.resultState.sort,
            page: intent.resultState.page,
          }
        : {
            searchAreaId: intent.geography.searchAreaId,
            locationIds: intent.geography.locationIds,
            searchAreaIds: intent.geography.searchAreaIds,
            sortOption: intent.resultState.sort,
            page: intent.resultState.page,
          };

  return (
    <div>
      <output aria-label="current-url">{window.location.href}</output>
      <output aria-label="sort-control">{intent.resultState.sort}</output>
      <output aria-label="page-control">{intent.resultState.page}</output>
      <output aria-label="max-price-control">{String(intent.filters.maxPrice ?? '')}</output>
      <output aria-label="bedroom-chip">{String(intent.filters.minBedrooms ?? '')}</output>
      <output aria-label="public-request">{JSON.stringify(publicRequest)}</output>
    </div>
  );
}

const buyUrl =
  '/property-for-sale?locationId=suburb%3A1&propertyType=house&minPrice=1800000&maxPrice=2500000&minBedrooms=2&minBathrooms=1&listingSource=manual&sort=price_desc&page=2';

afterEach(() => {
  cleanup();
  act(() => {
    window.history.replaceState({}, '', '/');
  });
});

describe('transactional result query reactivity', () => {
  it('updates URL-derived controls and public request for same-path Buy changes', async () => {
    window.history.replaceState({}, '', buyUrl);
    render(<QueryStateProbe />);

    expect(screen.getByLabelText('max-price-control')).toHaveTextContent('2500000');
    expect(screen.getByLabelText('sort-control')).toHaveTextContent('price_desc');
    expect(screen.getByLabelText('page-control')).toHaveTextContent('2');

    act(() => {
      window.history.pushState(
        {},
        '',
        '/property-for-sale?locationId=suburb%3A1&propertyType=house&minPrice=1800000&maxPrice=2300000&minBedrooms=2&minBathrooms=1&listingSource=manual&sort=price_asc',
      );
    });

    await waitFor(() => {
      expect(screen.getByLabelText('max-price-control')).toHaveTextContent('2300000');
    });
    expect(screen.getByLabelText('sort-control')).toHaveTextContent('price_asc');
    expect(screen.getByLabelText('page-control')).toHaveTextContent('0');
    expect(screen.getByLabelText('bedroom-chip')).toHaveTextContent('2');
    expect(JSON.parse(screen.getByLabelText('public-request').textContent || '{}')).toMatchObject({
      locationId: 'suburb:1',
      listingType: 'sale',
      maxPrice: 2300000,
      minBedrooms: 2,
      sortOption: 'price_asc',
      page: 0,
    });

    act(() => {
      window.history.pushState(
        {},
        '',
        '/property-for-sale?locationId=suburb%3A1&propertyType=house&minPrice=1800000&maxPrice=2300000&minBathrooms=1&sort=price_asc',
      );
    });

    await waitFor(() => {
      expect(screen.getByLabelText('bedroom-chip')).toHaveTextContent('');
    });
    expect(screen.getByLabelText('max-price-control')).toHaveTextContent('2300000');
    expect(screen.getByLabelText('sort-control')).toHaveTextContent('price_asc');
    expect(
      JSON.parse(screen.getByLabelText('public-request').textContent || '{}'),
    ).not.toHaveProperty('minBedrooms');
  });

  it('keeps Rent query changes on the Rent journey', async () => {
    window.history.replaceState(
      {},
      '',
      '/property-to-rent?locationId=city%3A1&sort=price_desc&page=3',
    );
    render(<QueryStateProbe />);

    expect(screen.getByLabelText('public-request')).toHaveTextContent('"listingType":"rent"');
    expect(screen.getByLabelText('page-control')).toHaveTextContent('3');

    act(() => {
      window.history.pushState({}, '', '/property-to-rent?locationId=city%3A1&sort=date_desc');
    });

    await waitFor(() => {
      expect(screen.getByLabelText('sort-control')).toHaveTextContent('date_desc');
    });
    expect(screen.getByLabelText('page-control')).toHaveTextContent('0');
    expect(screen.getByLabelText('public-request')).toHaveTextContent('"listingType":"rent"');
  });

  it('forwards a Search Area identity without exposing member locations', () => {
    window.history.replaceState(
      {},
      '',
      '/property-to-rent?searchAreaId=johannesburg-sandton&sort=date_desc',
    );
    render(<QueryStateProbe />);

    const request = JSON.parse(screen.getByLabelText('public-request').textContent || '{}');
    expect(request).toMatchObject({
      listingType: 'rent',
      searchAreaId: 'johannesburg-sandton',
    });
    expect(request).not.toHaveProperty('memberCanonicalLocationIds');
  });

  it('does not turn a missing or unsupported journey into a Buy request', () => {
    for (const url of ['/gauteng?city=johannesburg', '/search?intent=developments']) {
      window.history.replaceState({}, '', url);
      render(<QueryStateProbe />);

      const request = JSON.parse(screen.getByLabelText('public-request').textContent || '{}');
      expect(request).not.toHaveProperty('listingType');
      cleanup();
    }
  });

  it('uses deterministic canonical multi-location identity in the public request', async () => {
    window.history.replaceState(
      {},
      '',
      '/property-for-sale?locationIds=suburb%3A35&locationIds=suburb%3A34',
    );
    render(<QueryStateProbe />);

    const request = JSON.parse(screen.getByLabelText('public-request').textContent || '{}');
    expect(request).toMatchObject({
      listingType: 'sale',
      locationIds: ['suburb:34', 'suburb:35'],
    });
    expect(request).not.toHaveProperty('memberCanonicalLocationIds');
    expect(request).not.toHaveProperty('locations');
  });
});
