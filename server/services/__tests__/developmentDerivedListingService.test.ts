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
} = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockInnerJoin: vi.fn(),
  mockLeftJoinOne: vi.fn(),
  mockLeftJoinTwo: vi.fn(),
  mockWhere: vi.fn(),
  mockOrderBy: vi.fn(),
}));

vi.mock('../../db-connection', () => ({
  getDb: mockGetDb,
}));

import { developmentDerivedListingService } from '../developmentDerivedListingService';

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
    mockOrderBy.mockResolvedValue([
      {
        developmentId: 42,
        developmentName: 'The Junction',
        developmentSlug: 'the-junction',
        developmentStatus: 'launching-soon',
        developmentType: 'residential',
        transactionType: 'for_sale',
        city: 'Johannesburg',
        suburb: 'Berea',
        province: 'Gauteng',
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

  it('maps public unit types into development-derived listings', async () => {
    const result = await developmentDerivedListingService.searchListings(
      {
        city: 'Johannesburg',
        province: 'Gauteng',
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

  it('uses one canonical sibling boundary for development-derived OR filtering and totals', async () => {
    const result = await developmentDerivedListingService.searchListings(
      { listingType: 'sale' },
      'date_desc',
      1,
      20,
      {
        kind: 'canonical_locations',
        authorityKey: 'canonical-location-union:v1:suburb:suburb:34,suburb:35',
        level: 'suburb',
        parentCanonicalLocationId: 'city:12',
        parentName: 'Johannesburg',
        members: [
          {
            canonicalLocationId: 'suburb:34',
            level: 'suburb',
            name: 'Sandton',
            provinceId: 1,
            provinceName: 'Gauteng',
            cityId: 12,
            cityName: 'Johannesburg',
            suburbId: 34,
            suburbName: 'Sandton',
          },
          {
            canonicalLocationId: 'suburb:35',
            level: 'suburb',
            name: 'Berea',
            provinceId: 1,
            provinceName: 'Gauteng',
            cityId: 12,
            cityName: 'Johannesburg',
            suburbId: 35,
            suburbName: 'Berea',
          },
        ],
      },
    );

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].suburb).toBe('Berea');
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
        city: 'Johannesburg',
        suburb: 'Sandton',
        province: 'Gauteng',
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
        city: 'Johannesburg',
        suburb: 'Sandton',
        province: 'Gauteng',
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

    const result = await developmentDerivedListingService.searchListings(
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
    const result = await developmentDerivedListingService.searchListings(
      {
        city: 'Johannesburg',
        province: 'Gauteng',
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
    const result = await developmentDerivedListingService.searchListings(
      {
        city: 'Johannesburg',
        province: 'Gauteng',
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
    await developmentDerivedListingService.searchListings(
      {
        city: 'Johannesburg',
        province: 'Gauteng',
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
      city: 'Johannesburg',
      suburb: 'Rosebank',
      province: 'Gauteng',
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

    const result = await developmentDerivedListingService.searchListings(
      {
        city: 'Johannesburg',
        province: 'Gauteng',
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

      const result = await developmentDerivedListingService.searchListings(
        {
          city: 'Johannesburg',
          province: 'Gauteng',
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
        city: 'Johannesburg',
        suburb: 'Berea',
        province: 'Gauteng',
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
        city: 'Johannesburg',
        suburb: 'Berea',
        province: 'Gauteng',
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

    const result = await developmentDerivedListingService.searchListings(
      {
        city: 'Johannesburg',
        province: 'Gauteng',
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

  it('filters development-derived listings by text location slugs when provided', async () => {
    mockOrderBy.mockResolvedValueOnce([
      {
        developmentId: 42,
        developmentName: 'The Junction',
        developmentSlug: 'the-junction',
        developmentStatus: 'launching-soon',
        developmentType: 'residential',
        transactionType: 'for_sale',
        city: 'Johannesburg',
        suburb: 'Berea',
        province: 'Gauteng',
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
        unitTypeId: 'unit-jhb',
        unitName: 'Johannesburg Apartment',
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
      {
        developmentId: 43,
        developmentName: 'Sky City',
        developmentSlug: 'sky-city',
        developmentStatus: 'selling-fast',
        developmentType: 'residential',
        transactionType: 'for_sale',
        city: 'Alberton',
        suburb: 'Sky City',
        province: 'Gauteng',
        completionDate: '2027-05-01 00:00:00',
        legacyStatus: 'ready',
        constructionPhase: 'completed',
        developmentImages: '[{"url":"https://example.com/dev-cover-2.jpg"}]',
        developmentCreatedAt: '2026-03-20 10:00:00',
        developerId: 7,
        cataloguePublisherId: 9,
        developerName: 'Builder Group',
        developerLogo: 'https://example.com/developer-logo.jpg',
        brandName: 'Builder Group',
        brandSlug: 'builder-group',
        brandLogoUrl: 'https://example.com/brand-logo.jpg',
        brandPublicContactEmail: 'sales@builder-group.com',
        unitTypeId: 'unit-alberton',
        unitName: 'Sky City Starter Home',
        structuralType: 'house',
        bedrooms: 2,
        bathrooms: 1,
        unitSize: 52,
        yardSize: 180,
        priceFrom: '758000.00',
        priceTo: '810000.00',
        basePriceFrom: '758000.00',
        basePriceTo: '810000.00',
        monthlyRentFrom: null,
        monthlyRentTo: null,
        startingBid: null,
        auctionStatus: 'scheduled',
        availableUnits: 4,
        totalUnits: 10,
        unitBaseMedia: '{"gallery":[{"url":"https://example.com/unit-alberton.jpg"}]}',
        unitCreatedAt: '2026-03-22 09:00:00',
      },
    ]);

    const result = await developmentDerivedListingService.searchListings(
      {
        locations: ['alberton'],
        listingType: 'sale',
      },
      'date_desc',
      1,
      20,
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].unitTypeId).toBe('unit-alberton');
    expect(result.items[0].city).toBe('Alberton');
  });

  it('matches lowercase city and province search inputs against title-cased database values', async () => {
    mockOrderBy.mockResolvedValueOnce([
      {
        developmentId: 43,
        developmentName: 'Sky City',
        developmentSlug: 'sky-city',
        developmentStatus: 'selling-fast',
        developmentType: 'residential',
        transactionType: 'for_sale',
        city: 'Alberton',
        suburb: 'Sky City',
        province: 'Gauteng',
        completionDate: '2027-05-01 00:00:00',
        legacyStatus: 'ready',
        constructionPhase: 'completed',
        developmentImages: '[{"url":"https://example.com/dev-cover-2.jpg"}]',
        developmentCreatedAt: '2026-03-20 10:00:00',
        developerId: 7,
        cataloguePublisherId: 9,
        developerName: 'Builder Group',
        developerLogo: 'https://example.com/developer-logo.jpg',
        brandName: 'Builder Group',
        brandSlug: 'builder-group',
        brandLogoUrl: 'https://example.com/brand-logo.jpg',
        brandPublicContactEmail: 'sales@builder-group.com',
        unitTypeId: 'unit-alberton',
        unitName: 'Sky City Starter Home',
        structuralType: 'house',
        bedrooms: 2,
        bathrooms: 1,
        unitSize: 52,
        yardSize: 180,
        priceFrom: '758000.00',
        priceTo: '810000.00',
        basePriceFrom: '758000.00',
        basePriceTo: '810000.00',
        monthlyRentFrom: null,
        monthlyRentTo: null,
        startingBid: null,
        auctionStatus: 'scheduled',
        availableUnits: 4,
        totalUnits: 10,
        unitBaseMedia: '{"gallery":[{"url":"https://example.com/unit-alberton.jpg"}]}',
        unitCreatedAt: '2026-03-22 09:00:00',
      },
    ]);

    const result = await developmentDerivedListingService.searchListings(
      {
        city: 'alberton',
        province: 'gauteng',
        listingType: 'sale',
      },
      'date_desc',
      1,
      20,
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].unitTypeId).toBe('unit-alberton');
    expect(result.items[0].city).toBe('Alberton');
    expect(result.items[0].province).toBe('Gauteng');
  });
});
