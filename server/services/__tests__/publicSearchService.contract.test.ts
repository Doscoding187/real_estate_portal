import { beforeEach, describe, expect, it, vi } from 'vitest';

const PLACE_ID = 'pl-place-01-000000000000000000000001';
const {
  mockLoadPlaceProjection,
  mockSearchProperties,
  mockSearchDevelopments,
} = vi.hoisted(() => ({
  mockLoadPlaceProjection: vi.fn(),
  mockSearchProperties: vi.fn(),
  mockSearchDevelopments: vi.fn(),
}));

vi.mock('../canonicalPlaceSearchService', async importOriginal => ({
  ...(await importOriginal<typeof import('../canonicalPlaceSearchService')>()),
  loadCanonicalPlaceSearchProjection: mockLoadPlaceProjection,
}));

vi.mock('../propertySearchService', () => ({
  propertySearchService: { searchProperties: mockSearchProperties },
}));

vi.mock('../publicDevelopmentSearchService', () => ({
  publicDevelopmentSearchService: { search: mockSearchDevelopments },
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

function developmentItem(id = 1) {
  return {
    id,
    name: `Development ${id}`,
    slug: `development-${id}`,
    canonicalRoute: `/development/development-${id}`,
    description: null,
    images: ['https://example.test/development.jpg'],
    canonicalPlaceId: PLACE_ID,
    locationLabels: ['Approved Place'],
    developmentType: 'residential',
    transactionType: 'for_sale',
    status: 'selling',
    nature: 'new',
    completionDate: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    isFeatured: false,
    rating: null,
    highlights: ['Pool'],
    publisher: {
      id: 15,
      name: 'Reviewed Publisher',
      logoUrl: null,
      authorityKind: 'developer_first_party',
      slug: 'reviewed-publisher',
    },
    priceFrom: 4,
    priceTo: 4,
    bedroomRange: { min: 2, max: 2 },
    unitTypes: [{ id: 'unit-1', label: 'Two bedroom', bedrooms: 2, bathrooms: 1, priceFrom: 4, priceTo: 4, availableUnits: 1, totalUnits: 1, availabilityState: 'available' }],
    unitTypeCount: 1,
    availableUnitTypeCount: 1,
    availableUnits: 1,
    totalUnits: 1,
    availabilityState: 'available',
  } as const;
}

describe('publicSearchService canonical Place contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadPlaceProjection.mockResolvedValue(projection('locality'));
    mockSearchProperties.mockResolvedValue({
      cards: [card('property', 'p-1', 1), card('property', 'p-2', 2), card('property', 'p-3', 3)],
      total: 3,
    });
    mockSearchDevelopments.mockResolvedValue({
      items: [developmentItem()],
      total: 1,
      page: 0,
      pageSize: 12,
      hasMore: false,
      locationState: 'resolved',
      unpricedHiddenCount: 0,
    });
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
      expect(mockSearchDevelopments).toHaveBeenCalledWith(
        expect.objectContaining({
          canonicalPlaceId: PLACE_ID,
          transactionType: 'for_sale',
          page: 0,
          pageSize: 12,
        }),
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
    expect(mockSearchDevelopments).not.toHaveBeenCalled();
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
    expect(mockSearchDevelopments).not.toHaveBeenCalled();
  });

  it('projects Development cards from canonical public facts and keeps labels display-only', async () => {
    const result = await publicSearchService.searchInventory({
      canonicalPlaceId: PLACE_ID,
      listingType: 'sale',
      listingSource: 'development',
    });

    expect(mockSearchDevelopments).toHaveBeenCalledWith(
      expect.objectContaining({ canonicalPlaceId: PLACE_ID, page: 0, pageSize: 12 }),
    );
    expect(result.cards).toEqual([
      expect.objectContaining({
        kind: 'development',
        id: '1',
        canonicalPlaceId: PLACE_ID,
        location: 'Approved Place',
        city: '',
        suburb: '',
        province: '',
      }),
    ]);
  });

  it('pins unscoped Buy and Rent searches to the public property-type universes', async () => {
    await publicSearchService.searchInventory({ listingType: 'sale', listingSource: 'manual' });
    expect(mockSearchProperties).toHaveBeenCalledWith(
      expect.objectContaining({ propertyType: BUY_PUBLIC_PROPERTY_TYPES }),
      'date_desc', 1, 12, expect.objectContaining({ publicOnly: true }),
    );
    expect(mockSearchDevelopments).not.toHaveBeenCalled();

    mockSearchProperties.mockClear();
    await publicSearchService.searchInventory({ listingType: 'rent', listingSource: 'manual' });
    expect(mockSearchProperties).toHaveBeenCalledWith(
      expect.objectContaining({ propertyType: RENT_PUBLIC_PROPERTY_TYPES }),
      'date_desc', 1, 12, expect.objectContaining({ publicOnly: true }),
    );
  });

  it('threads requirePhoto to the manual source only when requested', async () => {
    await publicSearchService.searchInventory({ listingType: 'sale', listingSource: 'manual' });
    expect(mockSearchProperties.mock.calls[0][4]).not.toHaveProperty('requirePhoto');

    mockSearchProperties.mockClear();
    await publicSearchService.searchInventory({
      listingType: 'sale',
      listingSource: 'manual',
      requirePhoto: true,
    });
    expect(mockSearchProperties.mock.calls[0][4]).toMatchObject({
      publicOnly: true,
      requirePhoto: true,
    });
  });

  it('sends trending to the manual source and date_desc to the development source', async () => {
    await publicSearchService.searchInventory({
      canonicalPlaceId: PLACE_ID,
      listingType: 'sale',
      sortOption: 'trending',
    });
    expect(mockSearchProperties.mock.calls[0][1]).toBe('trending');
    expect(mockSearchDevelopments).toHaveBeenCalledWith(
      expect.objectContaining({ sortOption: 'date_desc' }),
    );
  });

  it('leaves date_desc unchanged for both sources', async () => {
    await publicSearchService.searchInventory({
      canonicalPlaceId: PLACE_ID,
      listingType: 'sale',
      sortOption: 'date_desc',
    });
    expect(mockSearchProperties.mock.calls[0][1]).toBe('date_desc');
    expect(mockSearchDevelopments).toHaveBeenCalledWith(
      expect.objectContaining({ sortOption: 'date_desc' }),
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

describe('publicSearchService unit_type development result shape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadPlaceProjection.mockResolvedValue(projection('province'));
    mockSearchProperties.mockResolvedValue({ cards: [], total: 0 });
    mockSearchDevelopments.mockResolvedValue({
      items: [developmentItem(1), developmentItem(2)],
      total: 2,
      page: 0,
      pageSize: 10,
      hasMore: false,
      locationState: 'resolved',
      unpricedHiddenCount: 0,
    });
  });

  it('returns one card per available unit type, not one per development, and asks for unit sizes', async () => {
    const result = await publicSearchService.searchInventory({
      canonicalPlaceId: PLACE_ID, listingType: 'sale', sortOption: 'trending', pageSize: 10,
      developmentResultShape: 'unit_type',
    });
    expect(result.cards.map(c => c.title)).toEqual(['2-bed Two bedroom', '2-bed Two bedroom']);
    expect(result.cards.map(c => c.href)).toEqual([
      '/development/development-1/unit/unit-1',
      '/development/development-2/unit/unit-1',
    ]);
    expect(mockSearchDevelopments.mock.calls[0][0]).toMatchObject({ includeUnitSize: true });
    expect(result.total).toBe(2);
  });

  it('keeps the whole-development card and no includeUnitSize by default', async () => {
    const result = await publicSearchService.searchInventory({
      canonicalPlaceId: PLACE_ID, listingType: 'sale', pageSize: 10,
    });
    expect(result.cards.map(c => c.title)).toEqual(['Development 1', 'Development 2']);
    expect(mockSearchDevelopments.mock.calls[0][0]).not.toHaveProperty('includeUnitSize');
  });

  it('ignores the shape when no place is given (no development source)', async () => {
    mockSearchProperties.mockResolvedValue({ cards: [card('property', 'p-1', 1)], total: 1 });
    const result = await publicSearchService.searchInventory({
      listingType: 'sale', pageSize: 10, developmentResultShape: 'unit_type',
    });
    expect(result.cards.map(c => c.id)).toEqual(['p-1']);
    expect(mockSearchDevelopments).not.toHaveBeenCalled();
  });
});
