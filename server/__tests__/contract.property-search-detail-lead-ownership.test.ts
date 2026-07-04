import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockSearchProperties,
  mockIncrementPropertyViews,
  mockGetPropertyById,
  mockGetPropertyImages,
  mockGetListingById,
  mockGetListingMedia,
  mockGetLeadDb,
  mockGetDetailDb,
  mockDetailSelect,
  mockLeadSelect,
  mockLeadInsert,
  mockLeadValues,
  mockLeadUpdate,
  mockLeadSet,
  mockLeadUpdateWhere,
  mockCaptureBrandLead,
  mockRecordAgentOsEventForAgentId,
} = vi.hoisted(() => ({
  mockSearchProperties: vi.fn(),
  mockIncrementPropertyViews: vi.fn(),
  mockGetPropertyById: vi.fn(),
  mockGetPropertyImages: vi.fn(),
  mockGetListingById: vi.fn(),
  mockGetListingMedia: vi.fn(),
  mockGetLeadDb: vi.fn(),
  mockGetDetailDb: vi.fn(),
  mockDetailSelect: vi.fn(),
  mockLeadSelect: vi.fn(),
  mockLeadInsert: vi.fn(),
  mockLeadValues: vi.fn(),
  mockLeadUpdate: vi.fn(),
  mockLeadSet: vi.fn(),
  mockLeadUpdateWhere: vi.fn(),
  mockCaptureBrandLead: vi.fn(),
  mockRecordAgentOsEventForAgentId: vi.fn(),
}));

vi.mock('../services/propertySearchService', () => ({
  propertySearchService: {
    searchProperties: mockSearchProperties,
  },
}));

vi.mock('../db', () => ({
  getDb: mockGetLeadDb,
  incrementPropertyViews: mockIncrementPropertyViews,
  getPropertyById: mockGetPropertyById,
  getPropertyImages: mockGetPropertyImages,
  getListingById: mockGetListingById,
  getListingMedia: mockGetListingMedia,
  searchListings: vi.fn(),
}));

vi.mock('../db-connection', () => ({
  getDb: mockGetDetailDb,
}));

vi.mock('../services/brandLeadService', () => ({
  brandLeadService: {
    captureBrandLead: mockCaptureBrandLead,
  },
}));

vi.mock('../services/agentOsEventService', () => ({
  recordAgentOsEventForAgentId: mockRecordAgentOsEventForAgentId,
}));

import { appRouter } from '../routers';

function limitQuery(result: unknown[]) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn(() => ({ limit }));
  const leftJoin = vi.fn(() => ({ where }));
  const from = vi.fn(() => ({ leftJoin, where }));

  return { from, leftJoin, where, limit };
}

function whereQuery(result: unknown[]) {
  const where = vi.fn().mockResolvedValue(result);
  const from = vi.fn(() => ({ where }));

  return { from, where };
}

const caller = () =>
  appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: null,
  } as any);

describe('single-property search-detail-lead ownership contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';

    mockSearchProperties.mockResolvedValue({
      properties: [],
      cards: [
        {
          kind: 'property',
          id: '501',
          propertyId: 501,
          href: '/property/501',
          title: 'Canonical Agent Home',
          listingSource: 'manual',
          contactRole: 'agent',
          identity: {
            role: 'agent',
            name: 'Jane Agent',
            agentId: 33,
            agencyId: 44,
          },
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      hasMore: false,
    });

    mockIncrementPropertyViews.mockResolvedValue(undefined);
    mockGetPropertyById.mockResolvedValue({
      id: 501,
      title: 'Canonical Agent Home',
      description: 'A public property projection created from an approved listing.',
      propertyType: 'house',
      listingType: 'sale',
      transactionType: 'sale',
      price: 2500000,
      bedrooms: 3,
      bathrooms: 2,
      area: 180,
      address: '1 Canonical Street',
      city: 'Johannesburg',
      province: 'Gauteng',
      status: 'available',
      featured: 0,
      views: 1,
      enquiries: 0,
      agentId: 33,
      ownerId: 100,
      developmentId: null,
      developerBrandProfileId: null,
      sourceListingId: null,
      amenities: 'Pool',
      propertySettings: '{}',
      mainImage: 'https://cdn.example.com/property.jpg',
    });
    mockGetPropertyImages.mockResolvedValue([
      {
        id: 1,
        propertyId: 501,
        imageUrl: 'https://cdn.example.com/property.jpg',
        isPrimary: 1,
        displayOrder: 0,
      },
    ]);
    mockGetListingById.mockResolvedValue(null);
    mockGetListingMedia.mockResolvedValue([]);

    mockDetailSelect
      .mockImplementationOnce(() =>
        limitQuery([
          {
            id: 33,
            userId: 100,
            firstName: 'Jane',
            lastName: 'Agent',
            displayName: 'Jane Agent',
            profileImage: 'https://cdn.example.com/jane.jpg',
            phone: '+27110001111',
            whatsapp: '+27110001111',
            email: 'jane@example.com',
            agencyId: 44,
            agencyName: 'Canonical Realty',
            slug: 'jane-agent',
            yearsExperience: 7,
            areasServed: 'Johannesburg',
            rating: 4.8,
            reviewCount: 12,
            isVerified: 1,
          },
        ]),
      )
      .mockImplementationOnce(() => whereQuery([{ count: 1 }]));

    mockGetDetailDb.mockResolvedValue({
      select: mockDetailSelect,
    });

    mockLeadSelect
      .mockImplementationOnce(() =>
        limitQuery([
          {
            id: 501,
            status: 'available',
            developmentId: null,
            developerBrandProfileId: null,
            agentId: 33,
          },
        ]),
      )
      .mockImplementationOnce(() => limitQuery([{ id: 33, agencyId: 44 }]));
    mockLeadInsert.mockReturnValue({ values: mockLeadValues });
    mockLeadValues.mockResolvedValue([{ insertId: 808 }]);
    mockLeadUpdate.mockReturnValue({ set: mockLeadSet });
    mockLeadSet.mockReturnValue({ where: mockLeadUpdateWhere });
    mockLeadUpdateWhere.mockResolvedValue(undefined);
    mockGetLeadDb.mockResolvedValue({
      select: mockLeadSelect,
      insert: mockLeadInsert,
      update: mockLeadUpdate,
    });
    mockCaptureBrandLead.mockResolvedValue({
      leadId: 999,
      delivered: true,
      deliveryMethod: 'crm_export',
      brandLeadStatus: 'delivered_subscriber',
      message: 'Lead captured',
    });
    mockRecordAgentOsEventForAgentId.mockResolvedValue(undefined);
  });

  it('keeps public search, detail and enquiry on the canonical property agent owner', async () => {
    const trpc = caller();

    const search = await trpc.properties.search({
      city: 'Johannesburg',
      province: 'Gauteng',
      listingType: 'sale',
      limit: 20,
      offset: 0,
    });
    const card = (search as any).cards[0];

    expect(card).toMatchObject({
      kind: 'property',
      href: '/property/501',
      propertyId: 501,
      identity: {
        agentId: 33,
        agencyId: 44,
      },
    });

    const detail = await trpc.properties.getById({ id: card.propertyId });

    expect(detail.property).toMatchObject({
      id: 501,
      status: 'available',
      agent: {
        id: '33',
        name: 'Jane Agent',
        agency: 'Canonical Realty',
        agencyId: 44,
      },
    });

    const lead = await trpc.leads.create({
      propertyId: card.propertyId,
      developerBrandProfileId: 999,
      agentId: 999,
      agencyId: 999,
      name: 'Pat Buyer',
      email: 'pat@example.com',
      phone: '0840000000',
      leadSource: 'property_detail',
      sourceSurface: 'property_detail_contact_modal',
    });

    expect(lead).toMatchObject({
      success: true,
      leadId: 808,
      route: 'direct',
    });
    expect(mockCaptureBrandLead).not.toHaveBeenCalled();
    expect(mockLeadValues).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyId: 501,
        developerBrandProfileId: null,
        agentId: 33,
        agencyId: 44,
        source: 'property_detail_contact_modal',
        leadSource: 'property_detail',
      }),
    );
  });
});
