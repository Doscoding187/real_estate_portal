import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetDb,
  mockGetAgentInventorySchedulingOptions,
  mockResolvePropertyForListing,
  mockCommercialLeadContextCandidateIds,
  mockLoadCommercialLeadContext,
} =
  vi.hoisted(() => ({
    mockGetDb: vi.fn(),
    mockGetAgentInventorySchedulingOptions: vi.fn(),
    mockResolvePropertyForListing: vi.fn(),
    mockCommercialLeadContextCandidateIds: vi.fn(),
    mockLoadCommercialLeadContext: vi.fn(),
  }));

vi.mock('../db', () => ({
  getDb: mockGetDb,
}));

vi.mock('../services/inventoryLinkResolver', () => ({
  getAgentInventorySchedulingOptions: mockGetAgentInventorySchedulingOptions,
  resolvePropertiesForListings: vi.fn(),
  resolvePropertyForListing: mockResolvePropertyForListing,
}));

vi.mock('../services/agentOsEventService', () => ({
  recordAgentOsEvent: vi.fn(),
}));

vi.mock('../services/commercialLeadContextService', () => ({
  COMMERCIAL_LEAD_DEDICATED_WORKFLOW_MESSAGE:
    'Commercial enquiries stay linked to their verified marketing listing and require the dedicated Commercial workflow for viewings or offers.',
  commercialLeadContextCandidateIds: mockCommercialLeadContextCandidateIds,
  loadCommercialLeadContext: mockLoadCommercialLeadContext,
  loadCommercialLeadContexts: vi.fn(),
}));

import { agentRouter } from '../agentRouter';

function createAgentCaller() {
  return agentRouter.createCaller({
    user: {
      id: 1,
      role: 'agent',
      email: 'agent@test.com',
    } as any,
    req: {} as any,
    res: {} as any,
    requestId: 'agent-inventory-authority-test',
  } as any);
}

function createSelectSequence(results: unknown[]) {
  const queue = [...results];

  return vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => queue.shift() ?? []),
      })),
    })),
  }));
}

function createOrderedSelectSequence(results: unknown[]) {
  const queue = [...results];

  return vi.fn(() => {
    const limit = vi.fn(async () => queue.shift() ?? []);
    const orderBy = vi.fn(() => ({ limit }));
    const where = vi.fn(() => ({ limit, orderBy }));
    return { from: vi.fn(() => ({ where })) };
  });
}

describe('agent canonical inventory authority', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCommercialLeadContextCandidateIds.mockImplementation((leadRows: any[]) =>
      leadRows
        .filter(lead => lead?.id && lead?.listingId && !lead?.propertyId)
        .map(lead => Number(lead.id)),
    );
    mockLoadCommercialLeadContext.mockResolvedValue(null);
  });

  it('requests only canonical scheduling options', async () => {
    const select = createSelectSequence([[{ id: 7 }]]);
    mockGetDb.mockResolvedValue({ select } as any);
    mockGetAgentInventorySchedulingOptions.mockResolvedValue([]);

    const caller = createAgentCaller();
    await caller.getShowingListingOptions();

    expect(mockGetAgentInventorySchedulingOptions).toHaveBeenCalledWith(expect.anything(), 1, 7);
  });

  it('blocks showing booking when no canonical property link exists', async () => {
    const select = createSelectSequence([
      [{ id: 7 }],
      [
        {
          id: 55,
          ownerId: 1,
          agentId: 7,
          title: 'Unlinked Listing',
          address: '1 Main Road',
          city: 'Cape Town',
          province: 'Western Cape',
          status: 'published',
        },
      ],
    ]);
    const insert = vi.fn(() => ({
      values: vi.fn(async () => [{ insertId: 99 }]),
    }));

    mockGetDb.mockResolvedValue({
      select,
      insert,
    } as any);
    mockResolvePropertyForListing.mockResolvedValue({
      listingId: 55,
      propertyId: null,
      isResolved: false,
      matchReason: 'missing_source_listing_id',
    });

    const caller = createAgentCaller();

    await expect(
      caller.bookShowing({
        listingId: 55,
        scheduledAt: '2026-03-12T10:00:00.000Z',
        visitorName: 'Buyer Example',
      }),
    ).rejects.toThrow('not linked to canonical property inventory');

    expect(insert).not.toHaveBeenCalled();
  });

  it('persists the canonical property id when booking a showing', async () => {
    const select = createSelectSequence([
      [{ id: 7 }],
      [
        {
          id: 55,
          ownerId: 1,
          agentId: 7,
          title: 'Canonical Listing',
          address: '1 Main Road',
          city: 'Cape Town',
          province: 'Western Cape',
          status: 'published',
        },
      ],
    ]);
    const insertValues = vi.fn(async () => [{ insertId: 99 }]);
    const insert = vi.fn(() => ({
      values: insertValues,
    }));

    mockGetDb.mockResolvedValue({
      select,
      insert,
    } as any);
    mockResolvePropertyForListing.mockResolvedValue({
      listingId: 55,
      propertyId: 5001,
      isResolved: true,
      matchReason: 'source_listing_id',
    });

    const caller = createAgentCaller();
    const result = await caller.bookShowing({
      listingId: 55,
      scheduledAt: '2026-03-12T10:00:00.000Z',
      visitorName: 'Buyer Example',
    });

    expect(result).toEqual({ success: true, showingId: 99 });
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        listingId: 55,
        propertyId: 5001,
        agentId: 7,
        visitorName: 'Buyer Example',
        scheduledAt: '2026-03-12T10:00:00.000Z',
        status: 'confirmed',
      }),
    );
  });

  it('does not let a Commercial lead be booked against unrelated generic inventory', async () => {
    const select = createSelectSequence([
      [{ id: 7 }],
      [
        {
          id: 55,
          ownerId: 1,
          agentId: 7,
          title: 'Generic residential listing',
          address: '1 Main Road',
          city: 'Cape Town',
          province: 'Western Cape',
          propertyType: 'house',
          status: 'published',
        },
      ],
      [
        {
          id: 88,
          agentId: 7,
          listingId: 912,
          propertyId: null,
          name: 'Commercial tenant',
        },
      ],
    ]);
    const insert = vi.fn(() => ({ values: vi.fn() }));
    mockGetDb.mockResolvedValue({ select, insert } as any);
    mockResolvePropertyForListing.mockResolvedValue({
      listingId: 55,
      propertyId: 5001,
      isResolved: true,
      matchReason: 'source_listing_id',
    });
    mockLoadCommercialLeadContext.mockResolvedValue({
      listingId: 912,
      commercialAvailabilityId: 3001,
    });

    await expect(
      createAgentCaller().bookShowing({
        listingId: 55,
        leadId: 88,
        scheduledAt: '2026-03-12T10:00:00.000Z',
        visitorName: 'Commercial tenant',
      }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message:
        'Commercial enquiries stay linked to their verified marketing listing and require the dedicated Commercial workflow for viewings or offers.',
    });

    expect(insert).not.toHaveBeenCalled();
  });

  it('keeps Commercial property records out of generic agent inventory', async () => {
    const select = createOrderedSelectSequence([
      [{ id: 7 }],
      [
        {
          id: 501,
          propertyType: 'house',
          title: 'Residential inventory record',
          enquiries: 0,
        },
        {
          id: 502,
          propertyType: 'commercial',
          title: 'Commercial inventory record',
          enquiries: 0,
        },
      ],
      [],
    ]);
    mockGetDb.mockResolvedValue({ select } as any);

    const caller = createAgentCaller();
    const result = await caller.getMyListings({ status: 'all', limit: 50 });

    expect(result.map(listing => listing.id)).toEqual([501]);
  });

  it('refuses a generic agent archive for a Commercial property record', async () => {
    const select = createSelectSequence([
      [
        {
          id: 503,
          ownerId: 1,
          agentId: null,
          propertyType: 'commercial',
          sourceListingId: null,
        },
      ],
      [],
    ]);
    const update = vi.fn();
    mockGetDb.mockResolvedValue({ select, update } as any);

    const caller = createAgentCaller();
    await expect(caller.archiveProperty({ id: 503 })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Commercial leasing listings are managed through Commercial inventory.',
    });

    expect(update).not.toHaveBeenCalled();
  });
});
