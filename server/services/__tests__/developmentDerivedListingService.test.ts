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
  });
});
