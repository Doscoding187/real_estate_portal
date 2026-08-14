import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockSearchDevelopmentListings,
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
  mockSearchDevelopmentListings: vi.fn(),
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

vi.mock('../services/developmentDerivedListingService', () => ({
  developmentDerivedListingService: {
    searchListings: mockSearchDevelopmentListings,
  },
}));

vi.mock('../services/developmentService', () => ({
  developmentService: {
    getPublicDevelopmentBySlug: mockGetPublicDevelopmentBySlug,
    listPublicDevelopments: mockListPublicDevelopments,
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
    mockSearchDevelopmentListings.mockResolvedValue({
      items: [
        {
          id: 'dev-77-unit-a',
          unitTypeId: 'unit-a',
          developmentId: 77,
          title: 'Type A Apartment for Sale',
          price: 1299000,
          city: 'Johannesburg',
          suburb: 'Berea',
          province: 'Gauteng',
          propertyType: 'apartment',
          listingType: 'sale',
          transactionType: 'for_sale',
          listingSource: 'development',
          bedrooms: 3,
          bathrooms: 2,
          availableUnits: 4,
          totalUnits: 8,
          images: [],
          listedDate: new Date('2026-03-20T00:00:00.000Z'),
          development: {
            id: 77,
            name: 'Cosmopolitan Projects',
            slug: 'cosmopolitan-projects',
            status: 'selling',
          },
          developerBrand: {
            id: 13,
            brandName: 'Cosmopolitan Projects',
            slug: 'cosmopolitan-projects',
            publicContactEmail: 'sales@example.com',
          },
        },
      ],
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

    const search = await caller.properties.searchDevelopmentListings({
      city: 'Johannesburg',
      province: 'Gauteng',
      listingType: 'sale',
      limit: 20,
      offset: 0,
    });

    const card = (search as any).cards[0];
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
});
