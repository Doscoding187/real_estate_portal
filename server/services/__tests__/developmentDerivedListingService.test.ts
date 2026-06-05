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

import {
  developmentDerivedListingService,
  mapListingTypeFilterToDevelopmentTransactionType,
  mapTransactionTypeToListingType,
  normalizeDevelopmentTransactionType,
} from '../developmentDerivedListingService';

const buildSearchRow = (overrides: Record<string, unknown>) => ({
  developmentId: 900,
  developmentName: 'Derived Sort Estate',
  developmentSlug: 'derived-sort-estate',
  developmentStatus: 'selling',
  developmentType: 'residential',
  transactionType: 'for_sale',
  city: 'Johannesburg',
  suburb: 'Berea',
  province: 'Gauteng',
  completionDate: '2027-05-01 00:00:00',
  legacyStatus: 'ready',
  constructionPhase: 'completed',
  developmentImages: '[]',
  developmentCreatedAt: '2026-03-20 10:00:00',
  developerId: 7,
  developerBrandProfileId: 9,
  developerName: 'Builder Group',
  developerLogo: null,
  brandName: 'Builder Group',
  brandSlug: 'builder-group',
  brandLogoUrl: null,
  brandPublicContactEmail: 'sales@builder-group.com',
  unitTypeId: 'unit-sort',
  unitName: 'Sort Test Unit',
  structuralType: 'apartment',
  bedrooms: 2,
  bathrooms: 1,
  unitSize: 70,
  yardSize: 0,
  priceFrom: null,
  priceTo: null,
  basePriceFrom: null,
  basePriceTo: null,
  monthlyRentFrom: null,
  monthlyRentTo: null,
  startingBid: null,
  reservePrice: null,
  auctionStatus: 'scheduled',
  availableUnits: 1,
  reservedUnits: 0,
  totalUnits: 1,
  unitDisplayOrder: 0,
  unitBaseMedia: '{}',
  unitCreatedAt: '2026-03-21 09:00:00',
  ...overrides,
});

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
        developmentImages:
          '[{"url":"https://example.com/dev-cover.jpg"}]',
        developmentCreatedAt: '2026-03-20 10:00:00',
        developerId: 7,
        developerBrandProfileId: 9,
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
        unitBaseMedia:
          '{"gallery":[{"url":"https://example.com/unit-primary.jpg"}]}',
        unitCreatedAt: '2026-03-21 09:00:00',
      },
    ]);
  });

  it('normalizes development transaction aliases for filters and public cards', () => {
    expect(normalizeDevelopmentTransactionType('to-rent')).toBe('for_rent');
    expect(normalizeDevelopmentTransactionType('auctions')).toBe('auction');
    expect(mapTransactionTypeToListingType('auction')).toBe('auction');
    expect(mapListingTypeFilterToDevelopmentTransactionType('to-rent')).toBe('for_rent');
    expect(mapListingTypeFilterToDevelopmentTransactionType('auctions')).toBe('auction');
    expect(mapListingTypeFilterToDevelopmentTransactionType('unexpected')).toBeNull();
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
      totalUnits: 12,
      availableUnits: 7,
      auctionStatus: 'scheduled',
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
      contactRole: 'developer',
      identity: {
        name: 'Builder Group',
        avatarUrl: 'https://example.com/brand-logo.jpg',
      },
      image: 'https://example.com/unit-primary.jpg',
      totalUnits: 12,
      availableUnits: 7,
      auctionStatus: 'scheduled',
    });
  });

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
        developerBrandProfileId: 9,
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
        developerBrandProfileId: 9,
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
        developerBrandProfileId: 9,
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
        developerBrandProfileId: 9,
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
        developerBrandProfileId: 9,
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

  it('maps auction developments to auction listing cards with starting bid pricing', async () => {
    mockOrderBy.mockResolvedValueOnce([
      {
        developmentId: 51,
        developmentName: 'Auction Yard',
        developmentSlug: 'auction-yard',
        developmentStatus: 'launching-soon',
        developmentType: 'residential',
        transactionType: 'auction',
        city: 'Pretoria',
        suburb: 'Menlyn',
        province: 'Gauteng',
        completionDate: '2027-05-01 00:00:00',
        legacyStatus: 'pre_launch',
        constructionPhase: 'off_plan',
        developmentCreatedAt: '2026-03-20 09:00:00',
        developerBrandProfileId: 9,
        brandName: 'Builder Group',
        brandSlug: 'builder-group',
        unitTypeId: 'unit-auction',
        unitName: '',
        structuralType: 'house',
        bedrooms: 3,
        bathrooms: 2,
        unitSize: 120,
        yardSize: 300,
        priceFrom: '3500000.00',
        priceTo: '3900000.00',
        basePriceFrom: '3500000.00',
        basePriceTo: '3900000.00',
        monthlyRentFrom: null,
        monthlyRentTo: null,
        startingBid: '2750000.00',
        reservePrice: '3000000.00',
        auctionStatus: 'scheduled',
        availableUnits: 1,
        totalUnits: 1,
        unitBaseMedia: '{}',
        unitCreatedAt: '2026-03-21 09:00:00',
      },
    ]);

    const result = await developmentDerivedListingService.searchListings(
      {
        city: 'Pretoria',
        province: 'Gauteng',
        listingType: 'auction',
      },
      'date_desc',
      1,
      20,
    );

    expect(result.items[0]).toMatchObject({
      listingType: 'auction',
      transactionType: 'auction',
      title: '3 Bedroom House on Auction',
      price: 2750000,
      priceTo: 3000000,
    });
    expect(result.cards[0]).toMatchObject({
      listingType: 'auction',
      transactionType: 'auction',
      title: '3 Bedroom House on Auction',
      price: 2750000,
      priceTo: 3000000,
    });
  });

  it('sorts rental and auction development listings by derived commercial entry price', async () => {
    mockOrderBy.mockResolvedValueOnce([
      buildSearchRow({
        developmentId: 71,
        transactionType: 'for_rent',
        unitTypeId: 'rent-high',
        unitName: 'High Rent With Cheap Sale Shadow',
        priceFrom: '100000.00',
        basePriceFrom: '100000.00',
        monthlyRentFrom: '22000.00',
      }),
      buildSearchRow({
        developmentId: 72,
        transactionType: 'for_rent',
        unitTypeId: 'rent-low',
        unitName: 'Low Rent With Expensive Sale Shadow',
        priceFrom: '9000000.00',
        basePriceFrom: '9000000.00',
        monthlyRentFrom: '15000.00',
      }),
    ]);

    const rentalResult = await developmentDerivedListingService.searchListings(
      {
        city: 'Johannesburg',
        province: 'Gauteng',
        listingType: 'rent',
      },
      'price_asc',
      1,
      20,
    );

    mockOrderBy.mockResolvedValueOnce([
      buildSearchRow({
        developmentId: 81,
        transactionType: 'auction',
        unitTypeId: 'auction-high',
        unitName: 'Higher Starting Bid',
        priceFrom: '500000.00',
        basePriceFrom: '500000.00',
        startingBid: '950000.00',
        reservePrice: '1200000.00',
      }),
      buildSearchRow({
        developmentId: 82,
        transactionType: 'auction',
        unitTypeId: 'auction-low',
        unitName: 'Lower Starting Bid',
        priceFrom: '9000000.00',
        basePriceFrom: '9000000.00',
        startingBid: '750000.00',
        reservePrice: '1500000.00',
      }),
    ]);

    const auctionResult = await developmentDerivedListingService.searchListings(
      {
        city: 'Johannesburg',
        province: 'Gauteng',
        listingType: 'auction',
      },
      'price_asc',
      1,
      20,
    );

    expect(rentalResult.items.map(item => item.unitTypeId)).toEqual(['rent-low', 'rent-high']);
    expect(rentalResult.items.map(item => item.price)).toEqual([15000, 22000]);
    expect(auctionResult.items.map(item => item.unitTypeId)).toEqual([
      'auction-low',
      'auction-high',
    ]);
    expect(auctionResult.items.map(item => item.price)).toEqual([750000, 950000]);
  });

  it('keeps same-development public listings in canonical unit display order for default search', async () => {
    mockOrderBy.mockResolvedValueOnce([
      buildSearchRow({
        unitTypeId: 'display-second',
        unitName: 'Display Second',
        unitDisplayOrder: 1,
        unitCreatedAt: '2026-03-21 09:00:00',
        priceFrom: '1250000.00',
      }),
      buildSearchRow({
        unitTypeId: 'display-first',
        unitName: 'Display First',
        unitDisplayOrder: 0,
        unitCreatedAt: '2026-03-21 09:00:00',
        priceFrom: '1250000.00',
      }),
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

    expect(result.items.map(item => item.unitTypeId)).toEqual(['display-first', 'display-second']);
    expect(result.items.map(item => item.unitDisplayOrder)).toEqual([0, 1]);
    expect(result.cards?.map(card => card.unitTypeId)).toEqual(['display-first', 'display-second']);
    expect(result.cards?.map(card => card.unitDisplayOrder)).toEqual([0, 1]);
  });

  it('uses shared derived helpers for public price ranges and availability', async () => {
    mockOrderBy.mockResolvedValueOnce([
      {
        developmentId: 61,
        developmentName: 'Range Guard',
        developmentSlug: 'range-guard',
        developmentStatus: 'selling',
        developmentType: 'residential',
        transactionType: 'for_sale',
        city: 'Cape Town',
        suburb: 'Gardens',
        province: 'Western Cape',
        completionDate: '2027-05-01 00:00:00',
        legacyStatus: 'ready',
        constructionPhase: 'completed',
        developmentCreatedAt: '2026-03-20 09:00:00',
        developerBrandProfileId: 9,
        brandName: 'Builder Group',
        brandSlug: 'builder-group',
        unitTypeId: 'unit-inverted-range',
        unitName: 'Inverted Range Test',
        structuralType: 'apartment',
        bedrooms: 2,
        bathrooms: 1,
        unitSize: 68,
        yardSize: 0,
        priceFrom: '1500000.00',
        priceTo: '1200000.00',
        basePriceFrom: '1500000.00',
        basePriceTo: '1200000.00',
        monthlyRentFrom: null,
        monthlyRentTo: null,
        startingBid: null,
        auctionStatus: 'scheduled',
        availableUnits: 9,
        reservedUnits: 4,
        totalUnits: 5,
        unitBaseMedia: '{}',
        unitCreatedAt: '2026-03-21 09:00:00',
      },
    ]);

    const result = await developmentDerivedListingService.searchListings(
      {
        city: 'Cape Town',
        province: 'Western Cape',
        listingType: 'sale',
      },
      'date_desc',
      1,
      20,
    );

    expect(result.items[0]).toMatchObject({
      price: 1500000,
      priceTo: undefined,
      availableUnits: 1,
    });
    expect(result.cards[0]).toMatchObject({
      price: 1500000,
      availableUnits: 1,
    });
    expect(result.cards[0]).not.toHaveProperty('priceTo');
  });
});
