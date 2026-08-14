import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockSearchProperties,
  mockSearchFeaturedProperties,
  mockSearchListings,
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
  mockSearchFeaturedProperties: vi.fn(),
  mockSearchListings: vi.fn(),
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
    searchFeaturedProperties: mockSearchFeaturedProperties,
  },
}));

vi.mock('../db', () => ({
  getDb: mockGetLeadDb,
  incrementPropertyViews: mockIncrementPropertyViews,
  getPropertyById: mockGetPropertyById,
  getPropertyImages: mockGetPropertyImages,
  getListingById: mockGetListingById,
  getListingMedia: mockGetListingMedia,
  searchListings: mockSearchListings,
}));

vi.mock('../db-connection', () => ({
  getDb: mockGetDetailDb,
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
    mockSearchFeaturedProperties.mockResolvedValue([]);

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
      cataloguePublisherId: null,
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
      .mockImplementationOnce(() => limitQuery([]))
      .mockImplementationOnce(() =>
        limitQuery([
          {
            id: 501,
            status: 'available',
            developmentId: null,
            cataloguePublisherId: null,
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
      success: true,
      leadId: 999,
      route: 'direct',
      delivered: true,
      deliveryMethod: 'crm_export',
      deliveryStatus: 'delivered',
      supplyOrigin: 'customer_managed',
      leadCustody: 'verified_customer_recipient',
      recipientType: 'agent',
      recipientId: 33,
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
      agentId: 999,
      agencyId: 999,
      name: 'Pat Buyer',
      email: 'pat@example.com',
      phone: '0840000000',
      leadType: 'viewing_request',
      leadSource: 'property_detail',
      sourceSurface: 'property_detail_contact_modal',
      captureRequestId: 'lead-request-property-ownership',
      consent: {
        accepted: true,
        version: '2026-08-02',
        source: 'property_ownership_contract',
      },
    });

    expect(lead).toMatchObject({
      success: true,
      leadId: 999,
      route: 'direct',
    });
    expect(mockCaptureBrandLead).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyId: 501,
        agentId: 999,
        agencyId: 999,
        sourceSurface: 'property_detail_contact_modal',
        leadSource: 'property_detail',
        leadType: 'viewing_request',
      }),
    );
  });

  it.each(['pending', 'rejected', 'archived', 'sold', 'rented', 'draft'])(
    'keeps %s property projections private on public detail',
    async status => {
      const trpc = caller();

      mockGetPropertyById.mockResolvedValueOnce({
        id: 777,
        title: 'Non Public Property',
        status,
        sourceListingId: 123,
      });

      const detail = await trpc.properties.getById({ id: 777 });

      expect(detail).toEqual({ property: null, images: [] });
      expect(mockIncrementPropertyViews).not.toHaveBeenCalled();
      expect(mockGetPropertyImages).not.toHaveBeenCalled();
      expect(mockGetListingById).not.toHaveBeenCalled();
      expect(mockGetListingMedia).not.toHaveBeenCalled();
      expect(mockDetailSelect).not.toHaveBeenCalled();
    },
  );

  it('does not expose images for non-public property projections', async () => {
    const trpc = caller();
    mockGetPropertyById.mockResolvedValueOnce({
      id: 778,
      title: 'Private Property Images',
      status: 'pending',
    });

    const images = await trpc.properties.getImages({ propertyId: 778 });

    expect(images).toEqual([]);
    expect(mockGetPropertyImages).not.toHaveBeenCalled();
  });

  it('returns images for public property projections', async () => {
    const trpc = caller();
    mockGetPropertyById.mockResolvedValueOnce({
      id: 779,
      title: 'Public Property Images',
      status: 'available',
    });
    mockGetPropertyImages.mockResolvedValueOnce([
      {
        id: 11,
        propertyId: 779,
        imageUrl: 'https://cdn.example.com/public-image.jpg',
        isPrimary: 1,
        displayOrder: 0,
      },
    ]);

    const images = await trpc.properties.getImages({ propertyId: 779 });

    expect(images).toHaveLength(1);
    expect(mockGetPropertyImages).toHaveBeenCalledWith(779);
  });

  it('keeps published property projections public on detail', async () => {
    const trpc = caller();

    mockGetPropertyById.mockResolvedValueOnce({
      id: 502,
      title: 'Published Agent Home',
      description: 'A public property projection created from an approved listing.',
      propertyType: 'house',
      listingType: 'sale',
      transactionType: 'sale',
      price: 2750000,
      bedrooms: 4,
      bathrooms: 3,
      area: 220,
      address: '2 Published Street',
      city: 'Johannesburg',
      province: 'Gauteng',
      status: 'published',
      featured: 0,
      views: 1,
      enquiries: 0,
      agentId: 33,
      ownerId: 100,
      developmentId: null,
      cataloguePublisherId: null,
      sourceListingId: null,
      amenities: 'Garden',
      propertySettings: '{}',
      mainImage: 'https://cdn.example.com/published.jpg',
    });

    const detail = await trpc.properties.getById({ id: 502 });

    expect(detail.property).toMatchObject({
      id: 502,
      status: 'published',
      agent: {
        id: '33',
        name: 'Jane Agent',
        agency: 'Canonical Realty',
        agencyId: 44,
      },
    });
    expect(mockIncrementPropertyViews).toHaveBeenCalledWith(502);
  });

  it('fails closed instead of blending a public projection with an invalid source lifecycle', async () => {
    const trpc = caller();

    mockGetPropertyById.mockResolvedValueOnce({
      id: 503,
      title: 'Approved Public Title',
      description: 'Approved public description.',
      propertyType: 'house',
      listingType: 'sale',
      transactionType: 'sale',
      price: 1900000,
      bedrooms: 2,
      bathrooms: 1,
      area: 140,
      address: '3 Approved Street',
      city: 'Johannesburg',
      province: 'Gauteng',
      status: 'available',
      featured: 0,
      views: 1,
      enquiries: 0,
      agentId: 33,
      ownerId: 100,
      developmentId: null,
      cataloguePublisherId: null,
      sourceListingId: 9003,
      amenities: 'Patio',
      propertySettings: '{}',
      mainImage: 'https://cdn.example.com/approved.jpg',
    });
    mockGetListingById.mockResolvedValueOnce({
      id: 9003,
      status: 'published',
      approvalStatus: 'pending',
      title: 'Unreviewed Edited Title',
      description: 'Unreviewed edited description.',
      action: 'sell',
      propertyDetails: { bedrooms: 99, bathrooms: 99, propertyHighlights: ['Unreviewed'] },
    });

    const detail = await trpc.properties.getById({ id: 503 });

    expect(detail).toEqual({ property: null, images: [] });
    expect(mockGetListingById).toHaveBeenCalledWith(9003);
    expect(mockGetListingMedia).not.toHaveBeenCalled();
    expect(mockIncrementPropertyViews).not.toHaveBeenCalled();
  });

  it('uses projection search results and public property IDs for the Detail continuation feed', async () => {
    mockSearchProperties.mockResolvedValueOnce({
      properties: [
        {
          id: '501',
          title: 'Approved projection result',
          price: 2_500_000,
          city: 'Johannesburg',
          propertyType: 'house',
          listingType: 'sale',
        },
      ],
      cards: [],
      total: 1,
      page: 1,
      pageSize: 10,
      hasMore: false,
    });

    const result = await caller().properties.getAll({
      city: 'Johannesburg',
      propertyType: 'house',
      limit: 10,
      offset: 0,
    });

    expect(result).toEqual([
      expect.objectContaining({ id: '501', title: 'Approved projection result' }),
    ]);
    expect(mockSearchProperties).toHaveBeenCalledWith(
      { city: 'Johannesburg', propertyType: ['house'] },
      'date_desc',
      1,
      10,
    );
    expect(mockSearchListings).not.toHaveBeenCalled();
  });

  it('uses the projection-only service for featured public inventory', async () => {
    mockSearchFeaturedProperties.mockResolvedValueOnce([
      { id: '502', title: 'Featured approved projection' },
    ]);

    const result = await caller().properties.featured({ limit: 6 });

    expect(result).toEqual([{ id: '502', title: 'Featured approved projection' }]);
    expect(mockSearchFeaturedProperties).toHaveBeenCalledWith(6);
  });

  it('keeps location featured inventory on public property identities too', async () => {
    mockSearchFeaturedProperties.mockResolvedValueOnce([
      { id: '503', title: 'Location featured projection' },
    ]);

    const result = await caller().location.getFeaturedListings({ limit: 4 });

    expect(result).toEqual([{ id: '503', title: 'Location featured projection' }]);
    expect(mockSearchFeaturedProperties).toHaveBeenCalledWith(4);
    expect(mockSearchListings).not.toHaveBeenCalled();
  });
});
