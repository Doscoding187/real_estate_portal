import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb, mockGetDistributionSchemaReadinessSnapshot } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockGetDistributionSchemaReadinessSnapshot: vi.fn(),
}));

vi.mock('../db', () => ({
  getDb: mockGetDb,
}));

vi.mock('../services/runtimeSchemaCapabilities', () => ({
  getDistributionSchemaReadinessSnapshot: mockGetDistributionSchemaReadinessSnapshot,
  warnSchemaCapabilityOnce: vi.fn(),
}));

vi.mock('../_core/env', () => ({
  ENV: {
    distributionNetworkEnabled: true,
    appUrl: 'http://localhost:5173',
  },
}));

import { distributionRouter } from '../distributionRouter';

function createSuperAdminCaller() {
  return distributionRouter.createCaller({
    user: {
      id: 1,
      role: 'super_admin',
      email: 'superadmin@test.com',
    } as any,
    req: {} as any,
    res: {} as any,
    requestId: 'test-request',
  } as any);
}

function createNotReadySnapshot() {
  return {
    checkedAt: '2026-03-09T10:00:00.000Z',
    ready: false,
    missingItems: ['platform_team_registrations.status'],
    operations: {
      'distribution.admin.listDevelopmentCatalog': {
        ready: false,
        missingItems: ['distribution_programs.platform_commission_type'],
        requiredItems: [],
      },
      'distribution.admin.listPrograms': {
        ready: false,
        missingItems: ['distribution_programs.platform_commission_type'],
        requiredItems: [],
      },
      'distribution.admin.listTeamRegistrations': {
        ready: false,
        missingItems: ['platform_team_registrations.status'],
        requiredItems: [],
      },
      'distribution.admin.createManagerInvite': {
        ready: false,
        missingItems: ['platform_team_registrations.status'],
        requiredItems: [],
      },
      'distribution.admin.upsertBrandPartnership': {
        ready: false,
        missingItems: ['distribution_brand_partnerships.status'],
        requiredItems: [],
      },
      'distribution.admin.upsertDevelopmentAccess': {
        ready: false,
        missingItems: ['distribution_development_access.status'],
        requiredItems: [],
      },
      'distribution.admin.getBrandPartnership': {
        ready: false,
        missingItems: ['distribution_brand_partnerships.brand_profile_id'],
        requiredItems: [],
      },
      'distribution.admin.getDevelopmentAccess': {
        ready: false,
        missingItems: ['distribution_development_access.development_id'],
        requiredItems: [],
      },
      'distribution.admin.listDevelopmentAccess': {
        ready: false,
        missingItems: ['distribution_development_access.status'],
        requiredItems: [],
      },
    },
  };
}

describe('distribution admin schema guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDb.mockResolvedValue({ unexpected: true });
    mockGetDistributionSchemaReadinessSnapshot.mockResolvedValue(createNotReadySnapshot());
  });

  it('blocks guarded admin routes before running database queries when schema is not ready', async () => {
    const caller = createSuperAdminCaller();

    await expect(caller.admin.listPrograms()).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining('DISTRIBUTION_SCHEMA_NOT_READY'),
    });
    await expect(caller.admin.listDevelopmentCatalog({ limit: 10 })).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining('DISTRIBUTION_SCHEMA_NOT_READY'),
    });
    await expect(
      caller.admin.listTeamRegistrations({ requestedArea: 'distribution_manager', limit: 10 }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining('DISTRIBUTION_SCHEMA_NOT_READY'),
    });
    await expect(
      caller.admin.createManagerInvite({
        fullName: 'Manager Example',
        email: 'manager@example.com',
      }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining('DISTRIBUTION_SCHEMA_NOT_READY'),
    });
    await expect(
      caller.admin.upsertBrandPartnership({
        brandProfileId: 12,
        status: 'active',
      }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining('DISTRIBUTION_SCHEMA_NOT_READY'),
    });
    await expect(
      caller.admin.upsertDevelopmentAccess({
        developmentId: 99,
        status: 'included',
      }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining('DISTRIBUTION_SCHEMA_NOT_READY'),
    });
    await expect(
      caller.admin.getBrandPartnership({
        brandProfileId: 12,
      }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining('DISTRIBUTION_SCHEMA_NOT_READY'),
    });
    await expect(
      caller.admin.getDevelopmentAccess({
        developmentId: 99,
      }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining('DISTRIBUTION_SCHEMA_NOT_READY'),
    });
    await expect(
      caller.admin.listDevelopmentAccess({
        limit: 10,
      }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining('DISTRIBUTION_SCHEMA_NOT_READY'),
    });
    await expect(
      caller.admin.onboardDevelopmentToPartnerNetwork({
        developmentId: 99,
      }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining('DISTRIBUTION_SCHEMA_NOT_READY'),
    });

    expect(mockGetDb).not.toHaveBeenCalled();
  });

  it('requires justification notes for forced admin stage overrides before running database queries', async () => {
    const caller = createSuperAdminCaller();

    await expect(
      caller.admin.transitionDealStage({
        dealId: 10,
        toStage: 'commission_paid',
        force: true,
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Forced admin deal-stage transitions require justification notes.',
    });

    await expect(
      caller.admin.transitionDealStage({
        dealId: 10,
        toStage: 'commission_paid',
        force: true,
        notes: '   ',
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Forced admin deal-stage transitions require justification notes.',
    });

    expect(mockGetDb).not.toHaveBeenCalled();
  });

  it('requires justification notes for admin commission overrides before running database queries', async () => {
    const caller = createSuperAdminCaller();

    await expect(
      caller.admin.updateCommissionEntryStatus({
        entryId: 44,
        entryStatus: 'approved',
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Admin commission status overrides require justification notes.',
    });

    await expect(
      caller.admin.updateCommissionEntryStatus({
        entryId: 44,
        entryStatus: 'approved',
        notes: '   ',
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Admin commission status overrides require justification notes.',
    });

    expect(mockGetDb).not.toHaveBeenCalled();
  });

  it('rejects duplicate standard required document codes before touching the database', async () => {
    const caller = createSuperAdminCaller();

    await expect(
      caller.admin.setDevelopmentRequiredDocuments({
        developmentId: 77,
        documents: [
          {
            documentCode: 'bank_statement',
            documentLabel: 'Bank Statements',
            isRequired: true,
            sortOrder: 0,
            isActive: true,
          },
          {
            documentCode: 'bank_statement',
            documentLabel: 'Updated Bank Statements',
            isRequired: true,
            sortOrder: 1,
            isActive: true,
          },
        ],
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Only one bank_statement template can be configured per development.',
    });

    expect(mockGetDb).not.toHaveBeenCalled();
  });

  it('rejects duplicate custom document labels before touching the database', async () => {
    const caller = createSuperAdminCaller();

    await expect(
      caller.admin.setDevelopmentRequiredDocuments({
        developmentId: 77,
        documents: [
          {
            documentCode: 'custom',
            documentLabel: 'Price Structure',
            isRequired: true,
            sortOrder: 0,
            isActive: true,
          },
          {
            documentCode: 'custom',
            documentLabel: 'Price Structure',
            isRequired: true,
            sortOrder: 1,
            isActive: true,
          },
        ],
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message:
        'Custom document labels must be unique per development. Duplicate label: price structure.',
    });

    expect(mockGetDb).not.toHaveBeenCalled();
  });
});
