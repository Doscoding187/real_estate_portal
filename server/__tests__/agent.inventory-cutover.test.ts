import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb, mockGetAgentInventorySchedulingOptions, mockResolvePropertyForListing } =
  vi.hoisted(() => ({
    mockGetDb: vi.fn(),
    mockGetAgentInventorySchedulingOptions: vi.fn(),
    mockResolvePropertyForListing: vi.fn(),
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

describe('agent canonical inventory authority', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
