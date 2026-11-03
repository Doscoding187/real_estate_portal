import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockSearchPublicInventory,
  mockSearchProperties,
  mockSearchDevelopments,
  mockGetPublicDevelopmentBySlug,
  mockListPublicDevelopments,
  mockGetDb,
  mockSelect,
  mockFrom,
  mockWhere,
  mockLimit,
  mockUpdate,
  mockSet,
  mockUpdateWhere,
  mockInsert,
  mockInsertValues,
  insertedAttributions,
  mockCaptureBrandLead,
  mockRecordAgentOsEventForAgentId,
} = vi.hoisted(() => ({
  mockSearchPublicInventory: vi.fn(),
  mockSearchProperties: vi.fn(),
  mockSearchDevelopments: vi.fn(),
  mockGetPublicDevelopmentBySlug: vi.fn(),
  mockListPublicDevelopments: vi.fn(),
  mockGetDb: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockWhere: vi.fn(),
  mockLimit: vi.fn(),
  mockUpdate: vi.fn(),
  mockSet: vi.fn(),
  mockUpdateWhere: vi.fn(),
  mockInsert: vi.fn(),
  mockInsertValues: vi.fn(),
  insertedAttributions: [] as Array<Record<string, unknown>>,
  mockCaptureBrandLead: vi.fn(),
  mockRecordAgentOsEventForAgentId: vi.fn(),
}));

vi.mock('../services/propertySearchService', () => ({
  propertySearchService: {
    searchProperties: mockSearchProperties,
  },
}));

vi.mock('../services/publicSearchService', () => ({
  publicSearchService: {
    searchInventory: mockSearchPublicInventory,
  },
}));

vi.mock('../services/developmentService', () => ({
  developmentService: {
    getPublicDevelopmentBySlug: mockGetPublicDevelopmentBySlug,
    listPublicDevelopments: mockListPublicDevelopments,
  },
}));

vi.mock('../services/publicDevelopmentSearchService', () => ({
  publicDevelopmentSearchService: {
    search: mockSearchDevelopments,
  },
}));

vi.mock('../db', () => ({
  getDb: mockGetDb,
}));

vi.mock('../services/publisherLeadService', () => ({
  publisherLeadService: {
    capturePublisherLead: mockCaptureBrandLead,
  },
}));

vi.mock('../services/publicLeadCaptureService', () => ({
  capturePublicLead: mockCaptureBrandLead,
}));

vi.mock('../services/agentOsEventService', () => ({
  recordAgentOsEventForAgentId: mockRecordAgentOsEventForAgentId,
}));

import { appRouter } from '../routers';

const approvedDevelopmentDetail = {
  id: 77,
  developerId: 7,
  cataloguePublisherId: 13,
  name: 'Cosmopolitan Projects',
  slug: 'cosmopolitan-projects',
  isPublished: 1,
  approvalStatus: 'approved',
  publisher: {
    id: 13,
    name: 'Cosmopolitan Projects',
    authorityKind: 'platform_reference',
    sourceAttribution: 'Official Cosmopolitan Projects website',
    lastVerifiedAt: '2026-08-15T00:00:00.000Z',
  },
  unitTypes: [
    {
      id: 'unit-a',
      name: 'Type A',
      basePriceFrom: 1299000,
      bedrooms: 3,
      bathrooms: 2,
      availableUnits: 4,
      totalUnits: 8,
      isActive: 1,
    },
  ],
};

describe('development search-detail-lead public journey contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';

    mockListPublicDevelopments.mockResolvedValue([]);
    mockSearchDevelopments.mockResolvedValue({
      items: [],
      total: 0,
      page: 0,
      pageSize: 20,
      hasMore: false,
      locationState: 'not_requested',
    });
    mockSearchPublicInventory.mockResolvedValue({
      cards: [
        {
          kind: 'development',
          id: 'dev-77-unit-a',
          href: '/development/cosmopolitan-projects/unit/unit-a',
          title: 'Type A Apartment for Sale',
          location: 'Berea, Johannesburg, Gauteng',
          city: 'Johannesburg',
          suburb: 'Berea',
          province: 'Gauteng',
          price: 1299000,
          image: 'https://example.com/unit-a.jpg',
          images: [],
          propertyType: 'apartment',
          listingType: 'sale',
          listingSource: 'development',
          contactRole: 'developer',
          identity: {
            role: 'developer',
            name: 'Cosmopolitan Projects',
            cataloguePublisherId: 13,
          },
          development: {
            id: 77,
            name: 'Cosmopolitan Projects',
            slug: 'cosmopolitan-projects',
          },
          developerBrand: {
            id: 13,
            brandName: 'Cosmopolitan Projects',
            slug: 'cosmopolitan-projects',
            publicContactEmail: 'sales@example.com',
          },
          highlights: [],
          listedDate: new Date('2026-03-20T00:00:00.000Z'),
          developmentId: 77,
          unitTypeId: 'unit-a',
          availableUnits: 4,
          totalUnits: 8,
        },
      ],
      total: 1,
      page: 0,
      pageSize: 20,
      hasMore: false,
    });
    mockSearchProperties.mockResolvedValue({
      properties: [],
      cards: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: false,
    });
    mockGetPublicDevelopmentBySlug.mockResolvedValue(approvedDevelopmentDetail);
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdateWhere.mockResolvedValue(undefined);
    insertedAttributions.length = 0;
    mockInsertValues.mockImplementation(async (values: Record<string, unknown>) => {
      insertedAttributions.push(values);
    });
    mockInsert.mockReturnValue({ values: mockInsertValues });
    mockCaptureBrandLead.mockResolvedValue({
      success: true,
      leadId: 909,
      route: 'brand',
      delivered: true,
      deliveryMethod: 'crm_export',
      deliveryStatus: 'delivered',
      supplyOrigin: 'customer_managed',
      leadCustody: 'verified_customer_recipient',
      recipientType: 'developer',
      recipientId: 7,
      brandLeadStatus: 'delivered_subscriber',
      message: 'Lead captured',
    });
    mockRecordAgentOsEventForAgentId.mockResolvedValue(undefined);
    mockGetDb.mockResolvedValue({
      select: mockSelect,
      update: mockUpdate,
      insert: mockInsert,
    });
  });

  it('carries a published approved unit from public search to detail and lead capture', async () => {
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    const canonicalPlaceId = 'pl-place-01-000000000000000000000001';
    const search = await caller.properties.searchPublicInventory({
      canonicalPlaceId,
      listingType: 'sale',
      listingSource: 'development',
      page: 0,
      pageSize: 20,
      sortOption: 'date_desc',
    });

    const card = (search as any).cards[0];
    expect(mockSearchPublicInventory).toHaveBeenCalledWith(
      expect.objectContaining({ canonicalPlaceId, listingSource: 'development' }),
    );
    expect(mockSearchPublicInventory.mock.calls[0][0]).not.toHaveProperty('city');
    expect(mockSearchPublicInventory.mock.calls[0][0]).not.toHaveProperty('province');
    expect(card).toMatchObject({
      href: '/development/cosmopolitan-projects/unit/unit-a',
      developmentId: 77,
      unitTypeId: 'unit-a',
      availableUnits: 4,
      totalUnits: 8,
      identity: {
        cataloguePublisherId: 13,
      },
    });

    const [, slug, unitTypeId] = card.href.match(/^\/development\/([^/]+)\/unit\/([^/]+)$/) ?? [];
    expect(slug).toBe('cosmopolitan-projects');
    expect(unitTypeId).toBe('unit-a');

    const detail = await caller.developer.getPublicDevelopmentBySlug({
      slugOrId: slug,
    });
    const unit = (detail as any).unitTypes.find((candidate: any) => candidate.id === unitTypeId);

    expect(detail).toMatchObject({
      id: 77,
      cataloguePublisherId: 13,
      isPublished: 1,
      approvalStatus: 'approved',
      publisher: {
        authorityKind: 'platform_reference',
        sourceAttribution: 'Official Cosmopolitan Projects website',
        lastVerifiedAt: '2026-08-15T00:00:00.000Z',
      },
    });
    expect(unit).toMatchObject({
      id: 'unit-a',
      name: 'Type A',
      availableUnits: 4,
      totalUnits: 8,
      isActive: 1,
    });

    const affordabilityData = {
      monthlyIncome: 65000,
      monthlyExpenses: 12000,
      monthlyDebts: 3000,
      availableDeposit: 150000,
      maxAffordable: 1400000,
      calculatedAt: '2026-07-04T10:00:00.000Z',
    };
    const lead = await caller.developer.createLead({
      developmentId: card.developmentId,
      cataloguePublisherId: 999,
      transactionType: 'for_sale',
      unitId: unit.id,
      unitName: unit.name,
      unitPriceFrom: unit.basePriceFrom,
      unitBedrooms: unit.bedrooms,
      unitBathrooms: unit.bathrooms,
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '0820000000',
      message: 'Please send me more information.',
      sourceSurface: `unit_floor_plan_dialog_${unit.id}_info`,
      leadSource: 'development_detail_info',
      referrerUrl:
        'https://property-listify.test/development/cosmopolitan-projects/unit/unit-a?utm_source=google&utm_medium=cpc&utm_campaign=launch',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'launch',
      affordabilityData,
      captureRequestId: 'lead-request-development-journey',
      consent: {
        accepted: true,
        version: '2026-08-02',
        source: 'development_journey_contract',
      },
    });

    expect(lead).toMatchObject({
      success: true,
      leadId: 909,
      route: 'brand',
    });
    expect(mockCaptureBrandLead).toHaveBeenCalledWith(
      expect.objectContaining({
        developmentId: 77,
        cataloguePublisherId: 999,
        transactionType: 'for_sale',
        unitId: 'unit-a',
        unitName: 'Type A',
        unitPriceFrom: 1299000,
        unitBedrooms: 3,
        unitBathrooms: 2,
        sourceSurface: 'unit_floor_plan_dialog_unit-a_info',
        leadSource: 'development_detail_info',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'launch',
        affordabilityData,
        captureRequestId: 'lead-request-development-journey',
        consent: {
          accepted: true,
          version: '2026-08-02',
          source: 'development_journey_contract',
        },
      }),
    );
    expect(insertedAttributions).toHaveLength(0);
  });

  it('does not expose published but unapproved detail through the public detail contract', async () => {
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);
    mockGetPublicDevelopmentBySlug.mockResolvedValueOnce(null);

    const detail = await caller.developer.getPublicDevelopmentBySlug({
      slugOrId: 'published-but-pending',
    });

    expect(detail).toBeNull();
  });

  it('uses the shared public development projection for homepage development feeds', async () => {
    mockSearchDevelopments.mockResolvedValueOnce({
      items: [
        {
          id: 77,
          name: 'Rental Heights',
          slug: 'rental-heights',
          canonicalRoute: '/development/rental-heights',
          description: null,
          images: [],
          canonicalPlaceId: 'pl-place-01-000000000000000000000001',
          locationLabels: ['Johannesburg'],
          developmentType: 'residential',
          transactionType: 'for_rent',
          status: 'selling',
          nature: 'new',
          completionDate: null,
          createdAt: '2026-08-15T00:00:00.000Z',
          isFeatured: false,
          rating: null,
          highlights: [],
          publisher: {
            id: 13,
            name: 'Rental Homes Publisher',
            logoUrl: null,
            authorityKind: 'platform_reference',
          },
          priceFrom: null,
          priceTo: null,
          listingType: 'rent',
          bedroomRange: { min: 2, max: 3 },
          unitTypes: [],
          unitTypeCount: 0,
          availableUnitTypeCount: 0,
          availableUnits: null,
          totalUnits: null,
          availabilityState: 'not_stated',
        },
      ],
      total: 1,
      page: 0,
      pageSize: 1,
      hasMore: false,
      locationState: 'resolved',
    });

    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    const result = await caller.developer.getHomeTrendingFeed({
      tab: 'developments',
      canonicalPlaceId: 'pl-place-01-000000000000000000000001',
      limit: 1,
    });

    expect(result.items[0]).toMatchObject({
      id: '77',
      href: '/development/rental-heights',
      listingType: 'rent',
      priceFrom: null,
      priceTo: null,
      bedroomRange: { min: 2, max: 3 },
      availabilityState: 'not_stated',
      publisherName: 'Rental Homes Publisher',
      publisherAuthorityKind: 'platform_reference',
      canonicalPlaceId: 'pl-place-01-000000000000000000000001',
      locationLabels: ['Johannesburg'],
    });
    expect(result.items[0]).not.toHaveProperty('city');
    expect(result.items[0]).not.toHaveProperty('suburb');
    expect(result.meta).toMatchObject({ requestedScope: 'canonical_place' });
    expect(mockSearchDevelopments).toHaveBeenCalledWith(
      expect.objectContaining({
        canonicalPlaceId: 'pl-place-01-000000000000000000000001',
        developmentType: 'residential',
        pageSize: 1,
        sortOption: 'relevance',
      }),
    );
    expect(mockListPublicDevelopments).not.toHaveBeenCalled();
  });

  it('rejects Development browse requests with text or malformed Place geography', async () => {
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    await expect(
      caller.developer.getHomeTrendingFeed({
        tab: 'developments',
        province: 'Gauteng',
        limit: 1,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(
      caller.developer.getHomeTrendingFeed({
        tab: 'developments',
        canonicalPlaceId: 'malformed',
        limit: 1,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(mockSearchDevelopments).not.toHaveBeenCalled();
  });

  it('preserves the canonical property type and compact parking fact for the homepage Buy rail', async () => {
    mockSearchProperties.mockResolvedValueOnce({
      properties: [
        {
          id: '501',
          title: 'Family home with garden',
          image: '/media/family-home.jpg',
          city: 'Johannesburg',
          suburb: 'Sandton',
          price: 3_850_000,
          listingType: 'sale',
          propertyType: 'house',
          bedrooms: 4,
          bathrooms: 3,
          floorSize: 238,
          erfSize: 520,
        },
        {
          id: '502',
          title: 'City apartment',
          image: '/media/city-apartment.jpg',
          city: 'Johannesburg',
          suburb: 'Rosebank',
          price: 1_850_000,
          listingType: 'sale',
          propertyType: 'apartment',
          bedrooms: 2,
          bathrooms: 2,
          floorSize: 96,
        },
      ],
      cards: [
        {
          id: '501',
          title: 'Family home with garden',
          href: '/property/501',
          kind: 'property',
          canonicalPlaceId: 'pl-place-01-000000000000000000000001',
          locationLabels: ['Sandton', 'Johannesburg'],
          price: 3_850_000,
          image: '/media/family-home.jpg',
          bedrooms: 4,
          bathrooms: 3,
          area: 238,
          yardSize: 520,
          propertyType: 'house',
          parking: { compactValue: '4' },
        },
        {
          id: '502',
          title: 'City apartment',
          href: '/property/502',
          kind: 'property',
          canonicalPlaceId: 'pl-place-01-000000000000000000000001',
          locationLabels: ['Rosebank', 'Johannesburg'],
          price: 1_850_000,
          image: '/media/city-apartment.jpg',
          bedrooms: 2,
          bathrooms: 2,
          area: 96,
          propertyType: 'apartment',
          parking: { compactValue: '1' },
        },
      ],
      total: 2,
      page: 1,
      pageSize: 12,
      hasMore: false,
    });
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    const result = await caller.developer.getHomeTrendingFeed({
      tab: 'buy',
      canonicalPlaceId: 'pl-place-01-000000000000000000000001',
      limit: 10,
    });

    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: '501',
          propertyType: 'house',
          area: 238,
          yardSize: 520,
          parkingCount: 4,
        }),
        expect.objectContaining({
          id: '502',
          propertyType: 'apartment',
          area: 96,
          parkingCount: 1,
        }),
      ]),
    );
    expect(mockSearchProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        listingType: 'sale',
        canonicalPlaceIds: ['pl-place-01-000000000000000000000001'],
      }),
      'date_desc',
      1,
      10,
      { publicOnly: true, requirePhoto: true },
    );
  });

  it('does not widen an empty selected province to unrelated homepage inventory', async () => {
    mockSearchProperties.mockResolvedValueOnce({
      properties: [],
      cards: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: false,
    });
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    const result = await caller.developer.getHomeTrendingFeed({
      tab: 'buy',
      canonicalPlaceId: 'pl-place-01-000000000000000000000001',
      limit: 10,
    });

    expect(result.items).toEqual([]);
    expect(result.meta).toMatchObject({
      canonicalPlaceId: 'pl-place-01-000000000000000000000001',
      requestedScope: 'canonical_place',
      selectedScope: 'canonical_place',
      usedFallback: false,
      fallbackLevel: 'none',
    });
    expect(mockSearchProperties).toHaveBeenCalledTimes(1);
    expect(mockSearchProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        canonicalPlaceIds: ['pl-place-01-000000000000000000000001'],
      }),
      'date_desc',
      1,
      10,
      { publicOnly: true, requirePhoto: true },
    );
  });
});
