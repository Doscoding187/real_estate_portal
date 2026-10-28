import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { useMemo } from 'react';
import { useLocation, useSearch } from 'wouter';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveSearchIntent } from '../searchIntent';
import { toBuyPublicSearchFilters } from '../../../../shared/buySearchContract';
import { toRentPublicSearchFilters } from '../../../../shared/rentSearchContract';

const PLACE_ID = 'pl-place-01-000000000000000000000001';

function QueryStateProbe() {
  const [location] = useLocation();
  const search = useSearch();
  const intent = useMemo(
    () => resolveSearchIntent(location, {}, new URLSearchParams(search)),
    [location, search],
  );
  const filters = { ...intent.filters };
  const publicRequest = intent.validation
    ? {}
    : intent.transactionType === 'for-sale'
      ? {
          ...toBuyPublicSearchFilters(filters),
          canonicalPlaceId: intent.geography.canonicalPlaceId,
          sortOption: intent.resultState.sort,
          page: intent.resultState.page,
        }
      : intent.transactionType === 'to-rent'
        ? {
            ...toRentPublicSearchFilters(filters),
            canonicalPlaceId: intent.geography.canonicalPlaceId,
            listingType: 'rent',
            sortOption: intent.resultState.sort,
            page: intent.resultState.page,
          }
        : {};

  return (
    <div>
      <output aria-label="current-url">{window.location.href}</output>
      <output aria-label="sort-control">{intent.resultState.sort}</output>
      <output aria-label="page-control">{intent.resultState.page}</output>
      <output aria-label="max-price-control">{String(intent.filters.maxPrice ?? '')}</output>
      <output aria-label="bedroom-chip">{String(intent.filters.minBedrooms ?? '')}</output>
      <output aria-label="validation">{intent.validation?.code || ''}</output>
      <output aria-label="public-request">{JSON.stringify(publicRequest)}</output>
    </div>
  );
}

afterEach(() => {
  cleanup();
  act(() => window.history.replaceState({}, '', '/'));
});

describe('transactional result query reactivity', () => {
  it('updates Buy filters and result state from the same canonical Place URL', async () => {
    window.history.replaceState(
      {},
      '',
      `/property-for-sale?canonicalPlaceId=${PLACE_ID}&propertyType=house&minPrice=1800000&maxPrice=2500000&minBedrooms=2&minBathrooms=1&sort=price_desc&page=2`,
    );
    render(<QueryStateProbe />);

    expect(screen.getByLabelText('max-price-control')).toHaveTextContent('2500000');
    expect(screen.getByLabelText('sort-control')).toHaveTextContent('price_desc');
    expect(screen.getByLabelText('page-control')).toHaveTextContent('2');

    act(() => {
      window.history.pushState(
        {},
        '',
        `/property-for-sale?canonicalPlaceId=${PLACE_ID}&propertyType=house&minPrice=1800000&maxPrice=2300000&minBedrooms=2&minBathrooms=1&sort=price_asc`,
      );
    });

    await waitFor(() => {
      expect(screen.getByLabelText('max-price-control')).toHaveTextContent('2300000');
    });
    expect(screen.getByLabelText('sort-control')).toHaveTextContent('price_asc');
    expect(screen.getByLabelText('page-control')).toHaveTextContent('0');
    expect(screen.getByLabelText('bedroom-chip')).toHaveTextContent('2');
    expect(JSON.parse(screen.getByLabelText('public-request').textContent || '{}')).toMatchObject({
      canonicalPlaceId: PLACE_ID,
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
        `/property-for-sale?canonicalPlaceId=${PLACE_ID}&propertyType=house&maxPrice=2300000&minBathrooms=1&sort=price_asc`,
      );
    });
    await waitFor(() => expect(screen.getByLabelText('bedroom-chip')).toHaveTextContent(''));
    expect(screen.getByLabelText('max-price-control')).toHaveTextContent('2300000');
  });

  it('keeps Rent query changes on the Rent result route', async () => {
    window.history.replaceState(
      {},
      '',
      `/property-to-rent?canonicalPlaceId=${PLACE_ID}&sort=price_desc&page=3`,
    );
    render(<QueryStateProbe />);

    expect(screen.getByLabelText('public-request')).toHaveTextContent('"listingType":"rent"');
    expect(screen.getByLabelText('page-control')).toHaveTextContent('3');

    act(() => {
      window.history.pushState(
        {},
        '',
        `/property-to-rent?canonicalPlaceId=${PLACE_ID}&sort=date_desc`,
      );
    });

    await waitFor(() => expect(screen.getByLabelText('sort-control')).toHaveTextContent('date_desc'));
    expect(screen.getByLabelText('page-control')).toHaveTextContent('0');
    expect(JSON.parse(screen.getByLabelText('public-request').textContent || '{}')).toMatchObject({
      listingType: 'rent',
      canonicalPlaceId: PLACE_ID,
    });
  });

  it('rejects legacy text and runtime IDs without a wider public request', () => {
    window.history.replaceState({}, '', '/property-for-sale?city=johannesburg&locationId=city%3A1');
    render(<QueryStateProbe />);

    expect(screen.getByLabelText('validation')).toHaveTextContent('invalid-place-authority');
    expect(JSON.parse(screen.getByLabelText('public-request').textContent || '{}')).toEqual({});
  });

  it('does not turn a missing or unsupported transaction into a Buy request', () => {
    for (const url of ['/gauteng?city=johannesburg', '/search?intent=developments']) {
      window.history.replaceState({}, '', url);
      render(<QueryStateProbe />);

      expect(JSON.parse(screen.getByLabelText('public-request').textContent || '{}')).toEqual({});
      cleanup();
    }
  });
});
