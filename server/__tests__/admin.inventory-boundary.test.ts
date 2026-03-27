import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetDb,
  mockGetAllPlatformSettings,
  mockSetPlatformSetting,
  mockResolvePropertiesForListings,
} = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockGetAllPlatformSettings: vi.fn(),
  mockSetPlatformSetting: vi.fn(),
  mockResolvePropertiesForListings: vi.fn(),
}));

vi.mock('../db', () => ({
  getDb: mockGetDb,
  getPlatformAnalytics: vi.fn(),
  getListingStats: vi.fn(),
  updateProperty: vi.fn(),
  getPlatformSetting: vi.fn(),
  setPlatformSetting: mockSetPlatformSetting,
  getAllPlatformSettings: mockGetAllPlatformSettings,
  countPendingAgents: vi.fn(),
  countPendingListings: vi.fn(),
  countPendingDevelopments: vi.fn(),
  getEcosystemStats: vi.fn(),
}));

vi.mock('../services/inventoryLinkResolver', () => ({
  resolvePropertiesForListings: mockResolvePropertiesForListings,
}));

vi.mock('../services/developmentService', () => ({
  developmentService: {},
}));

vi.mock('../_core/auditLog', () => ({
  logAudit: vi.fn(),
  AuditActions: {},
}));

import { adminRouter } from '../adminRouter';

function createSuperAdminCaller() {
  return adminRouter.createCaller({
    user: {
      id: 99,
      role: 'super_admin',
      email: 'superadmin@test.com',
    } as any,
    req: {} as any,
    res: {} as any,
    requestId: 'admin-inventory-boundary-test',
  } as any);
}

describe('admin inventory boundary and settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds the inventory boundary summary from resolved listings and unresolved showing counts', async () => {
    const candidateListings = [
      {
        id: 1,
        ownerId: 10,
        agentId: 100,
        title: 'Resolved Listing',
        address: '1 Main Road',
        city: 'Cape Town',
        province: 'Western Cape',
        status: 'published',
        updatedAt: '2026-03-12T08:00:00.000Z',
      },
      {
        id: 2,
        ownerId: 11,
        agentId: 101,
        title: 'Legacy Listing',
        address: '2 Main Road',
        city: 'Cape Town',
        province: 'Western Cape',
        status: 'approved',
        updatedAt: '2026-03-12T09:00:00.000Z',
      },
    ];

    const db = {
      select: vi
        .fn()
        .mockImplementationOnce(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(async () => candidateListings),
            })),
          })),
        }))
        .mockImplementationOnce(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              groupBy: vi.fn(async () => [
                {
                  listingId: 2,
                  total: 3,
                },
              ]),
            })),
          })),
        })),
    } as any;

    mockGetDb.mockResolvedValue(db);
    mockResolvePropertiesForListings.mockResolvedValue(
      new Map([
        [1, { listingId: 1, propertyId: 2001, inventoryModel: 'property', matchReason: 'source_listing_id' }],
        [2, { listingId: 2, propertyId: null, inventoryModel: 'legacy_listing', matchReason: 'none' }],
      ]),
    );

    const caller = createSuperAdminCaller();
    const result = await caller.getAgentInventoryBoundaryReport();

    expect(result.summary).toEqual({
      totalListings: 2,
      resolvedListings: 1,
      unresolvedListings: 1,
      unresolvedShowings: 3,
      resolutionRate: 0.5,
    });
    expect(result.unresolvedListings).toHaveLength(1);
    expect(result.unresolvedListings[0]).toEqual(
      expect.objectContaining({
        listingId: 2,
        title: 'Legacy Listing',
        activeShowings: 3,
      }),
    );
  });

  it('maps persisted platform settings into frontend shape', async () => {
    mockGetAllPlatformSettings.mockResolvedValue([
      {
        id: 1,
        settingKey: 'agent_os_allow_legacy_scheduling_inventory',
        settingValue: 'true',
        description: 'Allow unresolved legacy listings in scheduling',
        category: 'agent_os',
        isPublic: false,
        updatedBy: 99,
        createdAt: '2026-03-12T08:00:00.000Z',
        updatedAt: '2026-03-12T09:00:00.000Z',
      },
    ]);

    const caller = createSuperAdminCaller();
    const result = await caller.getPlatformSettings();

    expect(result).toEqual([
      {
        id: 1,
        key: 'agent_os_allow_legacy_scheduling_inventory',
        value: 'true',
        description: 'Allow unresolved legacy listings in scheduling',
        category: 'agent_os',
        isPublic: false,
        updatedBy: 99,
        createdAt: '2026-03-12T08:00:00.000Z',
        updatedAt: '2026-03-12T09:00:00.000Z',
      },
    ]);
  });

  it('persists platform setting updates with the acting super admin id', async () => {
    const caller = createSuperAdminCaller();

    const result = await caller.updatePlatformSetting({
      key: 'agent_os_allow_legacy_scheduling_inventory',
      value: false,
    });

    expect(mockSetPlatformSetting).toHaveBeenCalledWith(
      'agent_os_allow_legacy_scheduling_inventory',
      false,
      99,
    );
    expect(result).toEqual({ success: true });
  });
});
