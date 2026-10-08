import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CanonicalPlaceSearchBar } from '../CanonicalPlaceSearchBar';
import {
  buildCanonicalSavedSearchCriteria,
  generateIntentUrl,
  resolveSearchIntent,
} from '@/lib/searchIntent';
import { validatePublicSearchInput } from '@shared/publicSearchValidation';

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('wouter', () => ({ useLocation: () => ['/property-for-sale', navigate] }));
const id = 'pl-place-01-6a145c6d642ba208a2c12de7';
vi.mock('@/lib/trpc', () => ({
  trpc: {
    placeAuthority: {
      discover: {
        useQuery: ({ query }: { query: string }) => ({
          isError: false,
          isFetching: false,
          data: {
            query: query.toLowerCase(),
            outcome: 'resolved',
            results:
              query === 'North Riding'
                ? [
                    {
                      placeId: 'pl-place-01-6a145c6d642ba208a2c12de7',
                      preferredPublicLabel: 'North Riding',
                      placeType: 'suburb',
                      searchEligible: true,
                      searchScope: 'locality',
                      context: { administrativeContext: 'Gauteng / City of Johannesburg' },
                      matchedName: 'North Riding',
                      isAliasMatch: false,
                    },
                  ]
                : [],
          },
        }),
      },
    },
  },
}));
afterEach(cleanup);

describe('canonical Place public search selection', () => {
  it('selects identity, preserves refinements, resets pagination and carries it through reload', async () => {
    const intent = resolveSearchIntent(
      '/property-for-sale',
      {},
      new URLSearchParams('propertyType=house&minPrice=1000000&sort=price_asc&page=2'),
    );
    render(<CanonicalPlaceSearchBar intent={intent} />);
    expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled();
    fireEvent.change(screen.getByRole('combobox', { name: 'City, town, suburb or locality' }), {
      target: { value: 'North Riding' },
    });
    const option = await screen.findByRole('option', { name: /North Riding/ });
    fireEvent.click(option);
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    const url = new URL(navigate.mock.calls.at(-1)![0], 'http://localhost');
    expect(url.searchParams.get('canonicalPlaceId')).toBe(id);
    expect(url.searchParams.get('minPrice')).toBe('1000000');
    expect(url.searchParams.has('page')).toBe(false);
    expect(url.searchParams.has('city')).toBe(false);
    const reloaded = resolveSearchIntent(url.pathname, {}, url.searchParams);
    expect(reloaded.validation).toBeUndefined();
    expect(reloaded.geography.canonicalPlaceId).toBe(id);
    expect(buildCanonicalSavedSearchCriteria(reloaded)).toMatchObject({
      canonicalPlaceId: id,
      listingType: 'sale',
    });
    expect(generateIntentUrl(reloaded)).toBe(url.pathname + url.search);
    fireEvent.change(screen.getByRole('combobox', { name: 'City, town, suburb or locality' }), {
      target: { value: 'Different place' },
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled());
  });

  it.each([
    'city=randburg',
    'province=gauteng',
    'suburb=north-riding',
    'locationId=suburb:1',
    'locationIds=suburb:1&locationIds=suburb:2',
    'searchAreaId=sandton-core',
    'factualLocationId=malformed',
    `canonicalPlaceId=${id}`,
  ])('rejects a mixed or repeated URL: %s', competing => {
    const intent = resolveSearchIntent(
      '/property-for-sale',
      {},
      new URLSearchParams(`canonicalPlaceId=${id}&${competing}`),
    );
    expect(intent.validation?.code).toBe('invalid-place-authority');
  });

  it.each([
    'province',
    'city',
    'suburb',
    'locationId',
    'locationIds',
    'searchAreaId',
    'searchAreaIds',
    'factualLocationId',
    'locations',
  ])('rejects %s at the public API boundary', key => {
    const value =
      key.endsWith('Ids') || ['suburb', 'locations'].includes(key)
        ? ['suburb:1', 'suburb:2']
        : 'competing';
    expect(validatePublicSearchInput({ canonicalPlaceId: id, [key]: value })?.path).toBe(
      'canonicalPlaceId',
    );
  });
});
