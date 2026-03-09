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

    expect(mockGetDb).not.toHaveBeenCalled();
  });
});
