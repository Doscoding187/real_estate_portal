import { beforeEach, describe, expect, it, vi } from 'vitest';

const PLACE_ID = 'pl-place-01-000000000000000000000001';
const {
  mockLoadPlaceProjection,
  mockSearchProperties,
  mockSearchListings,
} = vi.hoisted(() => ({
  mockLoadPlaceProjection: vi.fn(),
  mockSearchProperties: vi.fn(),
  mockSearchListings: vi.fn(),
}));

vi.mock('../canonicalPlaceSearchService', async importOriginal => ({
  ...(await importOriginal<typeof import('../canonicalPlaceSearchService')>()),
  loadCanonicalPlaceSearchProjection: mockLoadPlaceProjection,
}));

vi.mock('../propertySearchService', () => ({
  propertySearchService: { searchProperties: mockSearchProperties },
}));

vi.mock('../developmentDerivedListingService', () => ({
  developmentDerivedListingService: { searchListings: mockSearchListings },
}));

import { publicSearchService } from '../publicSearchService';
import { PUBLIC_SEARCH_MAX_PAGE_INDEX } from '../../../shared/publicSearchPagination';
import { BUY_PUBLIC_PROPERTY_TYPES, RENT_PUBLIC_PROPERTY_TYPES } from '../../../shared/property-taxonomy';

function projection(scope: 'province' | 'metro_city' | 'locality') {
  return {
    executions: new Map([
      [PLACE_ID, {
        placeId: PLACE_ID,
        scope,
        provincePlaceId: scope === 'province' ? PLACE_ID : 'pl-place-01-000000000000000000000002',
        cityPlaceId: scope === 'metro_city' ? PLACE_ID : null,
        localityPlaceId: scope === 'locality' ? PLACE_ID : null,
        contextAncestorPlaceIds: [],
      }],
    ]),
    labels: new Map([[PLACE_ID, {
      canonicalPlaceId: PLACE_ID,
      label: 'Approved Place',
      scope,
      province: 'Gauteng',
      city: '',
      locality: '',
    }]]),
  };
}

function card(kind: 'property' | 'development', id: string, price: number) {
  return {
    kind,
    id,
    href: kind === 'property' ? `/property/${id}` : `/development/${id}`,
    title: id,
    location: 'Approved Place',
    city: '',
    suburb: '',
    province: '',
    canonicalPlaceId: PLACE_ID,
    price,
    image: '',
    images: [],
    propertyType: 'house',
    listingType: 'sale',
    listingSource: kind === 'property' ? 'manual' : 'development',
    listedDate: new Date('2026-07-01T00:00:00.000Z'),
  };
}

describe('publicSearchService canonical Place contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadPlaceProjection.mockResolvedValue(projection('locality'));
    mockSearchProperties.mockResolvedValue({
      cards: [card('property', 'p-1', 1), card('property', 'p-2', 2), card('property', 'p-3', 3)],
      total: 3,
    });
    mockSearchListings.mockResolvedValue({ cards: [card('development', 'd-1', 4)], total: 1 });
  });

  it.each(['province', 'metro_city', 'locality'] as const)(
    'uses the reviewed %s scope projection for inventory',
    async scope => {
      mockLoadPlaceProjection.mockResolvedValueOnce(projection(scope));
      await publicSearchService.searchInventory({ canonicalPlaceId: PLACE_ID, listingType: 'sale' });

      expect(mockLoadPlaceProjection).toHaveBeenCalledWith(undefined, { placeIds: [PLACE_ID] });
      const [filters, , , , options] = mockSearchProperties.mock.calls[0];
      expect(filters.canonicalPlaceIds).toEqual(scope === 'province' ? undefined : [PLACE_ID]);
      expect(options.provincePlaceId).toBe(scope === 'province' ? PLACE_ID : undefined);
      expect(options.publicOnly).toBe(true);
      expect(mockSearchListings).toHaveBeenCalledWith(
        expect.objectContaining({ canonicalPlaceId: PLACE_ID }),
        'date_desc',
        1,
        12,
      );
    },
  );

  it('fails closed for absent, malformed, or unresolved Place authority', async () => {
    const missing = await publicSearchService.searchInventory({
      listingType: 'sale',
      listingSource: 'development',
    });
    expect(missing).toMatchObject({ cards: [], total: 0, locationState: 'unavailable' });

    await expect(publicSearchService.searchInventory({
      canonicalPlaceId: 'sandton',
      listingType: 'sale',
    })).rejects.toThrow('Choose a valid canonical Place identity');

    mockLoadPlaceProjection.mockResolvedValueOnce({ executions: new Map(), labels: new Map() });
    const unresolved = await publicSearchService.searchInventory({
      canonicalPlaceId: PLACE_ID,
      listingType: 'sale',
    });
    expect(unresolved).toMatchObject({ cards: [], total: 0, locationState: 'unavailable' });
    expect(mockSearchProperties).not.toHaveBeenCalled();
    expect(mockSearchListings).not.toHaveBeenCalled();
  });

  it('rejects text and retired geography handles before searching', async () => {
    await expect(publicSearchService.searchInventory({
      city: 'Johannesburg',
      listingType: 'sale',
    } as never)).rejects.toThrow('Use one canonical Place identity');
    await expect(publicSearchService.searchInventory({
      locationId: 'suburb:34',
      listingType: 'sale',
    } as never)).rejects.toThrow('Use one canonical Place identity');
    expect(mockSearchProperties).not.toHaveBeenCalled();
    expect(mockSearchListings).not.toHaveBeenCalled();
  });

  it('pins unscoped Buy and Rent searches to the public property-type universes', async () => {
    await publicSearchService.searchInventory({ listingType: 'sale', listingSource: 'manual' });
    expect(mockSearchProperties).toHaveBeenCalledWith(
      expect.objectContaining({ propertyType: BUY_PUBLIC_PROPERTY_TYPES }),
      'date_desc', 1, 12, expect.objectContaining({ publicOnly: true }),
    );
    expect(mockSearchListings).not.toHaveBeenCalled();

    mockSearchProperties.mockClear();
    await publicSearchService.searchInventory({ listingType: 'rent', listingSource: 'manual' });
    expect(mockSearchProperties).toHaveBeenCalledWith(
      expect.objectContaining({ propertyType: RENT_PUBLIC_PROPERTY_TYPES }),
      'date_desc', 1, 12, expect.objectContaining({ publicOnly: true }),
    );
  });

  it('rejects unsupported and Commercial journeys', async () => {
    await expect(publicSearchService.searchInventory({ listingType: 'shared_living' as never }))
      .rejects.toThrow('Buy or Rent');
    await expect(publicSearchService.searchInventory({
      listingType: 'rent',
      propertyType: 'commercial',
    })).rejects.toThrow('dedicated Commercial journey');
    expect(mockSearchProperties).not.toHaveBeenCalled();
  });

  it('canonicalizes available-page overflow and keeps page metadata coherent', async () => {
    const firstPage = await publicSearchService.searchInventory({
      listingType: 'sale', listingSource: 'manual', page: 0, pageSize: 2,
    });
    const lastPage = await publicSearchService.searchInventory({
      listingType: 'sale', listingSource: 'manual', page: 2, pageSize: 2,
    });
    const nextPage = await publicSearchService.searchInventory({
      listingType: 'sale', listingSource: 'manual', page: 3, pageSize: 2,
    });
    const veryLargePage = await publicSearchService.searchInventory({
      listingType: 'sale', listingSource: 'manual', page: PUBLIC_SEARCH_MAX_PAGE_INDEX + 10, pageSize: 2,
    });

    expect(firstPage).toMatchObject({ page: 0, total: 3, pageSize: 2 });
    expect(lastPage).toMatchObject({ page: 1, total: 3, pageSize: 2 });
    expect(nextPage).toMatchObject({ page: 1, total: 3, pageSize: 2, hasMore: false });
    expect(veryLargePage).toMatchObject({ page: 1, total: 3, pageSize: 2, hasMore: false });
  });

  it('normalizes a non-finite result universe to page zero', async () => {
    mockSearchProperties.mockResolvedValue({ cards: [], total: 0 });
    const result = await publicSearchService.searchInventory({
      listingType: 'sale', listingSource: 'manual', page: 101, pageSize: 12,
    });
    expect(result).toMatchObject({ cards: [], total: 0, page: 0, pageSize: 12, hasMore: false });
  });

  it('rejects partial or reversed map bounds without issuing a query', async () => {
    await expect(publicSearchService.searchInventory({
      listingType: 'sale', listingSource: 'manual', minLat: -26, maxLat: -25,
    })).rejects.toThrow('Map bounds must include');
    await expect(publicSearchService.searchInventory({
      listingType: 'sale', listingSource: 'manual', minLat: -25, maxLat: -26,
      minLng: 28, maxLng: 29,
    })).rejects.toThrow('Map bounds must be complete and ordered');
    expect(mockSearchProperties).not.toHaveBeenCalled();
  });
});
