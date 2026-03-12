import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetDb,
  mockGetPlatformSetting,
  mockGetAgentInventorySchedulingOptions,
  mockGetInventoryBridgeSchemaCapabilities,
  mockResolvePropertyForListing,
} = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockGetPlatformSetting: vi.fn(),
  mockGetAgentInventorySchedulingOptions: vi.fn(),
  mockGetInventoryBridgeSchemaCapabilities: vi.fn(),
  mockResolvePropertyForListing: vi.fn(),
}));

vi.mock('../db', () => ({
  getDb: mockGetDb,
  getPlatformSetting: mockGetPlatformSetting,
}));

vi.mock('../services/inventoryLinkResolver', () => ({
  getAgentInventorySchedulingOptions: mockGetAgentInventorySchedulingOptions,
  getInventoryBridgeSchemaCapabilities: mockGetInventoryBridgeSchemaCapabilities,
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
    requestId: 'agent-inventory-cutover-test',
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

describe('agent inventory cutover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes the legacy fallback setting into scheduling options resolution', async () => {
    const select = createSelectSequence([[{ id: 7 }]]);
    mockGetDb.mockResolvedValue({ select } as any);
    mockGetPlatformSetting.mockResolvedValue({
      settingValue: 'false',
    });
    mockGetAgentInventorySchedulingOptions.mockResolvedValue([]);

    const caller = createAgentCaller();
    await caller.getShowingListingOptions();

    expect(mockGetAgentInventorySchedulingOptions).toHaveBeenCalledWith(
      expect.anything(),
      1,
      7,
      { allowLegacyFallback: false },
    );
  });

  it('blocks showing booking for unresolved legacy inventory when fallback is disabled', async () => {
    const select = createSelectSequence([
      [{ id: 7 }],
      [
        {
          id: 55,
          ownerId: 1,
          agentId: 7,
          title: 'Legacy Listing',
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
    mockGetPlatformSetting.mockResolvedValue({
      settingValue: 'false',
    });
    mockResolvePropertyForListing.mockResolvedValue({
      listingId: 55,
      propertyId: null,
      inventoryModel: 'legacy_listing',
      matchReason: 'none',
    });

    const caller = createAgentCaller();

    await expect(
      caller.bookShowing({
        listingId: 55,
        scheduledAt: '2026-03-12T10:00:00.000Z',
        visitorName: 'Buyer Example',
      }),
    ).rejects.toThrow('Legacy scheduling fallback is disabled');

    expect(insert).not.toHaveBeenCalled();
  });

  it('allows showing booking when fallback remains enabled', async () => {
    const select = createSelectSequence([
      [{ id: 7 }],
      [
        {
          id: 55,
          ownerId: 1,
          agentId: 7,
          title: 'Legacy Listing',
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
    mockGetPlatformSetting.mockResolvedValue({
      settingValue: 'true',
    });
    mockResolvePropertyForListing.mockResolvedValue({
      listingId: 55,
      propertyId: null,
      inventoryModel: 'legacy_listing',
      matchReason: 'none',
    });
    mockGetInventoryBridgeSchemaCapabilities.mockResolvedValue({
      propertiesSourceListingIdColumn: false,
      showingsPropertyIdColumn: false,
      showingsLeadIdColumn: false,
    });

    const caller = createAgentCaller();
    const result = await caller.bookShowing({
      listingId: 55,
      scheduledAt: '2026-03-12T10:00:00.000Z',
      visitorName: 'Buyer Example',
    });

    expect(result).toEqual({ success: true, showingId: 99 });
    expect(insert).toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        listingId: 55,
        agentId: 7,
        visitorName: 'Buyer Example',
        status: 'scheduled',
      }),
    );
  });
});
