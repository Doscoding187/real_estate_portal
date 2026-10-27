import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetDb,
  mockSelect,
  mockFrom,
  mockInnerJoin,
  mockLeftJoinOne,
  mockLeftJoinTwo,
  mockWhere,
  mockOrderBy,
  mockListDevelopmentIdsForCanonicalPlace,
  mockListDevelopmentPlaceGeography,
} = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockInnerJoin: vi.fn(),
  mockLeftJoinOne: vi.fn(),
  mockLeftJoinTwo: vi.fn(),
  mockWhere: vi.fn(),
  mockOrderBy: vi.fn(),
  mockListDevelopmentIdsForCanonicalPlace: vi.fn(),
  mockListDevelopmentPlaceGeography: vi.fn(),
}));

vi.mock('../../db-connection', () => ({
  getDb: mockGetDb,
}));

vi.mock('../developmentPlaceAssignmentService', () => ({
  listDevelopmentIdsForCanonicalPlace: mockListDevelopmentIdsForCanonicalPlace,
  listDevelopmentPlaceGeography: mockListDevelopmentPlaceGeography,
}));

import { developmentDerivedListingService } from '../developmentDerivedListingService';

const CANONICAL_PLACE_ID = 'pl-place-01-6a145c6d642ba208a2c12de7';

function searchListings(filters: Record<string, unknown> = {}, ...pagination: any[]) {
  return developmentDerivedListingService.searchListings(
    { canonicalPlaceId: CANONICAL_PLACE_ID, ...filters } as any,
    ...pagination,
  );
}

function collectSqlParts(
  value: unknown,
  parts: { columns: string[]; params: unknown[] } = { columns: [], params: [] },
) {
  if (!value || typeof value !== 'object') return parts;

  const chunk = value as any;
  if (chunk.constructor?.name === 'Param') {
    parts.params.push(chunk.value);
    return parts;
  }

  if (typeof chunk.name === 'string' && typeof chunk.columnType === 'string') {
    parts.columns.push(chunk.name);
    return parts;
  }

  if (Array.isArray(chunk.queryChunks)) {
    chunk.queryChunks.forEach((child: unknown) => collectSqlParts(child, parts));
  }

  return parts;
}

describe('DevelopmentDerivedListingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ innerJoin: mockInnerJoin });
    mockInnerJoin.mockReturnValue({ leftJoin: mockLeftJoinOne });
    mockLeftJoinOne.mockReturnValue({ leftJoin: mockLeftJoinTwo });
    mockLeftJoinTwo.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy });
    mockGetDb.mockResolvedValue({ select: mockSelect });
    mockListDevelopmentIdsForCanonicalPlace.mockResolvedValue([42, 43, 84]);
    mockListDevelopmentPlaceGeography.mockImplementation(
      async (developmentIds: number[]) =>
        new Map(
          developmentIds.map(developmentId => [
            developmentId,
            { canonicalPlaceId: CANONICAL_PLACE_ID, locationLabels: ['Johannesburg'] },
          ]),
        ),
    );
    mockOrderBy.mockResolvedValue([
      {
        developmentId: 42,
        developmentName: 'The Junction',
        developmentSlug: 'the-junction',
        developmentStatus: 'launching-soon',
        developmentType: 'residential',
        transactionType: 'for_sale',
        completionDate: '2027-05-01 00:00:00',
        legacyStatus: 'pre_launch',
        constructionPhase: 'planning',
        developmentImages: '[{"url":"https://example.com/dev-cover.jpg"}]',
        developmentCreatedAt: '2026-03-20 10:00:00',
        developerId: 7,
        cataloguePublisherId: 9,
        developerName: 'Builder Group',
        developerLogo: 'https://example.com/developer-logo.jpg',
        brandName: 'Builder Group',
        brandSlug: 'builder-group',
        brandLogoUrl: 'https://example.com/brand-logo.jpg',
        brandPublicContactEmail: 'sales@builder-group.com',
        unitTypeId: 'unit-2-bed',
        unitName: '2 Bed Apartment',
        structuralType: 'apartment',
        bedrooms: 2,
        bathrooms: 2,
        unitSize: 74,
        yardSize: 0,
        priceFrom: '1195000.00',
        priceTo: '1395000.00',
        basePriceFrom: '1195000.00',
        basePriceTo: '1395000.00',
        monthlyRentFrom: null,
        monthlyRentTo: null,
        startingBid: null,
        auctionStatus: 'scheduled',
        availableUnits: 7,
        totalUnits: 12,
        unitBaseMedia: '{"gallery":[{"url":"https://example.com/unit-primary.jpg"}]}',
        unitCreatedAt: '2026-03-21 09:00:00',
      },
    ]);
  });

  it('requires unit photos before homepage pagination, without substituting development images', async () => {
    const [row] = await mockOrderBy();
    mockOrderBy.mockResolvedValueOnce([
      { ...row, unitTypeId: 'no-photo', unitBaseMedia: '{}' },
      {
        ...row,
        unitTypeId: 'render-only',
        unitBaseMedia: { gallery: [{ url: '/media/render.jpg', category: 'rendering' }] },
      },
      {
        ...row,
        unitTypeId: 'photo',
        unitBaseMedia: { gallery: [{ url: '/media/real-unit.jpg', category: 'photo' }] },
      },
    ]);
    const result = await searchListings({ requireUnitPhoto: true }, 'date_desc', 1, 1);
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({ unitTypeId: 'photo', image: '/media/real-unit.jpg' });
  });

  it('requires available stock and excludes sold-out projects from the homepage', async () => {
    const [row] = await mockOrderBy();
    mockOrderBy.mockResolvedValueOnce([
      { ...row, unitTypeId: 'zero', availableUnits: 0 },
      { ...row, unitTypeId: 'unknown', availableUnits: undefined },
      { ...row, unitTypeId: 'sold', developmentStatus: 'sold-out' },
      { ...row, unitTypeId: 'available', availableUnits: 2 },
    ]);
    const result = await searchListings({
      requireAvailableStock: true,
    });
    expect(result.items.map(item => item.unitTypeId)).toEqual(['available']);
  });

  it('keeps townhouse identity and parking facts for a standard property card', async () => {
    const [row] = await mockOrderBy();
    mockOrderBy.mockResolvedValueOnce([
      {
        ...row,
        structuralType: 'townhouse',
        unitParkingBays: 2,
        unitParkingType: 'covered',
        yardSize: null,
      },
    ]);
    const result = await searchListings({
      requireUnitPhoto: true,
      requireAvailableStock: true,
    });
    expect(result.items[0]).toMatchObject({
      propertyType: 'townhouse',
      parkingCount: 2,
      parkingType: 'covered',
    });
    expect(result.items[0].erfSize).toBeUndefined();
  });

  it('does not hide database unavailability behind an empty property feed', async () => {
    mockGetDb.mockResolvedValueOnce(null);
    await expect(searchListings({})).rejects.toThrow('Database unavailable');
  });

  it('rejects a missing canonical Place before querying inventory', async () => {
    await expect(developmentDerivedListingService.searchListings({} as any)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    expect(mockGetDb).not.toHaveBeenCalled();
  });

  it('maps public unit types into development-derived listings', async () => {
    const result = await searchListings(
      {
        listingType: 'sale',
      },
      'date_desc',
      1,
      20,
    );

    expect(result).toMatchObject({
      total: 1,
      page: 1,
      pageSize: 20,
      hasMore: false,
    });

    expect(result.items[0]).toMatchObject({
      id: 'dev-42-unit-2-bed',
      unitTypeId: 'unit-2-bed',
      developmentId: 42,
      rankingScore: expect.any(Number),
      title: '2 Bed Apartment',
      price: 1195000,
      priceTo: 1395000,
      propertyType: 'apartment',
      listingType: 'sale',
      transactionType: 'for_sale',
      listingSource: 'development',
      bedrooms: 2,
      bathrooms: 2,
      floorSize: 74,
      availableUnits: 7,
      totalUnits: 12,
      development: {
        id: 42,
        name: 'The Junction',
        slug: 'the-junction',
        status: 'launching-soon',
      },
      developerBrand: {
        id: 9,
        brandName: 'Builder Group',
        slug: 'builder-group',
        publicContactEmail: 'sales@builder-group.com',
      },
    });
    expect(result.items[0].badges).toContain('Off-plan');
    expect(result.items[0].badges).not.toContain('Part of The Junction');
    expect(result.items[0].image).toBe('https://example.com/unit-primary.jpg');
    expect(result.cards?.[0]).toMatchObject({
      kind: 'development',
      href: '/development/the-junction/unit/unit-2-bed',
      developmentId: 42,
      unitTypeId: 'unit-2-bed',
      availableUnits: 7,
      totalUnits: 12,
      contactRole: 'developer',
      identity: {
        name: 'Builder Group',
        avatarUrl: 'https://example.com/brand-logo.jpg',
      },
      image: 'https://example.com/unit-primary.jpg',
    });
  });

  it('does not leak structured JSON syntax into highlights when unit data is empty', async () => {
    mockOrderBy.mockResolvedValueOnce([
      {
        developmentId: 84,
        developmentName: 'Structured Feature Development',
        developmentSlug: 'structured-feature-development',
        developmentStatus: 'selling',
        developmentType: 'residential',
        transactionType: 'for_sale',
        developmentHighlights: JSON.stringify([
          '24-Hour Security',
          'Prime Location',
          'Lifestyle Amenities',
        ]),
        developmentFeatures: '{}',
        developmentAmenities: '[]',
        developmentImages: '[]',
        developmentCreatedAt: new Date('2026-03-20T10:00:00.000Z'),
        unitTypeId: 'structured-unit',
        unitName: 'Structured Unit',
        unitDescription: 'A unit with structured feature fields.',
        unitSpecifications: '{}',
        unitAmenities: JSON.stringify({ standard: [], additional: [] }),
        unitFeatures: '{}',
        unitBaseFeatures: JSON.stringify({ standard: [], additional: [] }),
        unitParkingType: null,
        unitParkingBays: 0,
        unitIsFurnished: 0,
        unitTransferCostsIncluded: 0,
        structuralType: 'apartment',
        bedrooms: 2,
        bathrooms: 2,
        unitSize: 74,
        yardSize: 0,
        priceFrom: '1195000.00',
        basePriceFrom: '1195000.00',
        availableUnits: 7,
        totalUnits: 12,
        unitBaseMedia: '{}',
        unitCreatedAt: new Date('2026-03-21T09:00:00.000Z'),
      },
    ]);

    const result = await searchListings({ listingType: 'sale' }, 'date_desc', 1, 20);

    expect(result.items[0]?.highlights).toEqual([
      '24 Hour Security',
      'Prime Location',
      'Lifestyle Amenities',
    ]);
    expect(result.items[0]?.highlights?.some(label => /[{}[\]":]/.test(label))).toBe(false);
    expect(result.cards?.[0]?.highlights).toEqual([
      expect.objectContaining({ label: '24-hour security', iconKey: 'security' }),
      expect.objectContaining({ label: 'Prime location', iconKey: 'scenic' }),
      expect.objectContaining({ label: 'Lifestyle amenities', iconKey: 'sparkles' }),
    ]);
  });

  it('resolves Development inventory through the requested Place ID', async () => {
    const result = await searchListings({ listingType: 'sale' }, 'date_desc', 1, 20);

    expect(mockListDevelopmentIdsForCanonicalPlace).toHaveBeenCalledWith(CANONICAL_PLACE_ID);
    expect(result.items[0]).toMatchObject({
      canonicalPlaceId: CANONICAL_PLACE_ID,
      locationLabels: ['Johannesburg'],
    });
  });

  it('applies map bounds to development-derived listings', async () => {
    mockOrderBy.mockResolvedValueOnce([
      {
        developmentId: 42,
        developmentName: 'Inside Bounds',
        developmentSlug: 'inside-bounds',
        developmentStatus: 'launching-soon',
        developmentType: 'residential',
        transactionType: 'for_sale',
        latitude: '-26.1000',
        longitude: '28.0500',
        unitTypeId: 'inside-unit',
        unitName: 'Inside Bounds Apartment',
        structuralType: 'apartment',
        bedrooms: 2,
        bathrooms: 1,
        priceFrom: '1000000',
        unitBaseMedia: '{}',
        unitCreatedAt: '2026-03-21 09:00:00',
      },
      {
        developmentId: 43,
        developmentName: 'Outside Bounds',
        developmentSlug: 'outside-bounds',
        developmentStatus: 'launching-soon',
        developmentType: 'residential',
        transactionType: 'for_sale',
        latitude: '-25.8000',
        longitude: '28.0500',
        unitTypeId: 'outside-unit',
        unitName: 'Outside Bounds Apartment',
        structuralType: 'apartment',
        bedrooms: 2,
        bathrooms: 1,
        priceFrom: '1000000',
        unitBaseMedia: '{}',
        unitCreatedAt: '2026-03-21 09:00:00',
      },
    ]);

    const result = await searchListings(
      {
        listingType: 'sale',
        bounds: { south: -26.2, north: -26, west: 28, east: 28.1 },
      },
      'date_desc',
      1,
      20,
    );

    expect(result.items.map(item => item.unitTypeId)).toEqual(['inside-unit']);
  });

  it('applies area filters before deriving both items and total', async () => {
    const result = await searchListings(
      {
        listingType: 'sale',
        minArea: 75,
      },
      'date_desc',
      1,
      20,
    );

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.total).toBe(result.items.length);
    expect(result.hasMore).toBe(false);
  });

  it('applies bathroom filters before deriving both items and total', async () => {
    const result = await searchListings(
      {
        listingType: 'sale',
        maxBathrooms: 1,
      },
      'date_desc',
      1,
      20,
    );

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.total).toBe(result.items.length);
    expect(result.hasMore).toBe(false);
  });

  it('only queries approved published developments with active unit inventory', async () => {
    await searchListings(
      {
        listingType: 'sale',
      },
      'date_desc',
      1,
      20,
    );

    const whereClause = mockWhere.mock.calls[0]?.[0];
    const parts = collectSqlParts(whereClause);

    expect(parts.columns).toEqual(
      expect.arrayContaining(['isPublished', 'approval_status', 'is_active', 'transaction_type']),
    );
    expect(parts.params).toEqual(expect.arrayContaining([1, 'approved', 1, 'for_sale']));
  });

  it('returns development-derived Rent inventory only for an explicit for_rent source', async () => {
    const rentRow = {
      developmentId: 84,
      developmentName: 'Rental Heights',
      developmentSlug: 'rental-heights',
      developmentStatus: 'launching-soon',
      developmentType: 'residential',
      transactionType: 'for_rent',
      structuralType: 'apartment',
      bedrooms: 2,
      bathrooms: 1,
      monthlyRentFrom: '12000.00',
      monthlyRentTo: '14000.00',
      developmentImages: '[]',
      unitBaseMedia: '{}',
      developmentCreatedAt: new Date('2026-04-01T00:00:00.000Z'),
      unitCreatedAt: new Date('2026-04-02T00:00:00.000Z'),
      availableUnits: 4,
      totalUnits: 8,
      unitTypeId: 'unit-rent-2-bed',
    };

    mockOrderBy.mockImplementationOnce(async () => {
      const whereClause = mockWhere.mock.calls[mockWhere.mock.calls.length - 1]?.[0];
      const parts = collectSqlParts(whereClause);
      expect(parts.params).toContain('for_rent');
      return [rentRow];
    });

    const result = await searchListings(
      {
        listingType: 'rent',
      },
      'date_desc',
      1,
      20,
    );

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      listingType: 'rent',
      transactionType: 'for_rent',
      price: 12000,
    });
  });

  it.each(['for_sale', 'unknown', undefined])(
    'does not admit a %s development source into a Rent query',
    async sourceTransactionType => {
      const sourceRow = { transactionType: sourceTransactionType };
      mockOrderBy.mockImplementationOnce(async () => {
        const whereClause = mockWhere.mock.calls[mockWhere.mock.calls.length - 1]?.[0];
        const parts = collectSqlParts(whereClause);

        expect(parts.params).toContain('for_rent');
        return sourceRow.transactionType === 'for_rent' ? [sourceRow] : [];
      });

      const result = await searchListings(
        {
          listingType: 'rent',
        },
        'date_desc',
        1,
        20,
      );

      const whereClause = mockWhere.mock.calls[mockWhere.mock.calls.length - 1]?.[0];
      const parts = collectSqlParts(whereClause);

      expect(parts.params).toContain('for_rent');
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(sourceTransactionType).not.toBe('for_rent');
    },
  );

  it('prefers richer unit content when applying organic date-desc ranking', async () => {
    mockOrderBy.mockResolvedValueOnce([
      {
        developmentId: 42,
        developmentName: 'The Junction',
        developmentSlug: 'the-junction',
        developmentStatus: 'launching-soon',
        developmentType: 'residential',
        transactionType: 'for_sale',
        completionDate: '2027-05-01 00:00:00',
        legacyStatus: 'pre_launch',
        constructionPhase: 'planning',
        developmentImages: '[{"url":"https://example.com/dev-cover.jpg"}]',
        developmentCreatedAt: '2026-03-20 10:00:00',
        developerId: 7,
        cataloguePublisherId: 9,
        developerName: 'Builder Group',
        developerLogo: 'https://example.com/developer-logo.jpg',
        brandName: 'Builder Group',
        brandSlug: 'builder-group',
        brandLogoUrl: 'https://example.com/brand-logo.jpg',
        brandPublicContactEmail: 'sales@builder-group.com',
        unitTypeId: 'unit-premium',
        unitName: 'Premium 2 Bed Apartment',
        structuralType: 'apartment',
        bedrooms: 2,
        bathrooms: 2,
        unitSize: 78,
        yardSize: 0,
        priceFrom: '1295000.00',
        priceTo: '1395000.00',
        basePriceFrom: '1295000.00',
        basePriceTo: '1395000.00',
        monthlyRentFrom: null,
        monthlyRentTo: null,
        startingBid: null,
        auctionStatus: 'scheduled',
        availableUnits: 5,
        totalUnits: 9,
        unitBaseMedia:
          '{"gallery":[{"url":"https://example.com/unit-1.jpg"},{"url":"https://example.com/unit-2.jpg"},{"url":"https://example.com/unit-3.jpg"}]}',
        unitCreatedAt: '2026-03-26 09:00:00',
      },
      {
        developmentId: 43,
        developmentName: 'The Junction Annex',
        developmentSlug: 'the-junction-annex',
        developmentStatus: 'launching-soon',
        developmentType: 'residential',
        transactionType: 'for_sale',
        completionDate: '2027-05-01 00:00:00',
        legacyStatus: 'pre_launch',
        constructionPhase: 'planning',
        developmentImages: '[{"url":"https://example.com/dev-fallback.jpg"}]',
        developmentCreatedAt: '2026-03-20 10:00:00',
        developerId: 7,
        cataloguePublisherId: 9,
        developerName: 'Builder Group',
        developerLogo: 'https://example.com/developer-logo.jpg',
        brandName: 'Builder Group',
        brandSlug: 'builder-group',
        brandLogoUrl: 'https://example.com/brand-logo.jpg',
        brandPublicContactEmail: 'sales@builder-group.com',
        unitTypeId: 'unit-basic',
        unitName: '',
        structuralType: 'apartment',
        bedrooms: 1,
        bathrooms: 1,
        unitSize: null,
        yardSize: 0,
        priceFrom: '0',
        priceTo: '0',
        basePriceFrom: '0',
        basePriceTo: '0',
        monthlyRentFrom: null,
        monthlyRentTo: null,
        startingBid: null,
        auctionStatus: 'scheduled',
        availableUnits: 0,
        totalUnits: 3,
        unitBaseMedia: '{}',
        unitCreatedAt: '2026-03-25 09:00:00',
      },
    ]);

    const result = await searchListings(
      {
        listingType: 'sale',
      },
      'date_desc',
      1,
      20,
    );

    expect(result.items).toHaveLength(2);
    expect(result.items[0].unitTypeId).toBe('unit-premium');
    expect(result.items[0].rankingScore).toBeGreaterThan(result.items[1].rankingScore || 0);
    expect(result.items[1]).toMatchObject({
      unitTypeId: 'unit-basic',
      availableUnits: 0,
      totalUnits: 3,
    });
  });
});
