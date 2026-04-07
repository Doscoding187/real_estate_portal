import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb, mockGetRuntimeSchemaCapabilities, mockWarnSchemaCapabilityOnce } = vi.hoisted(
  () => ({
    mockGetDb: vi.fn(),
    mockGetRuntimeSchemaCapabilities: vi.fn(),
    mockWarnSchemaCapabilityOnce: vi.fn(),
  }),
);

vi.mock('../db', () => ({
  getDb: mockGetDb,
}));

vi.mock('../services/runtimeSchemaCapabilities', async () => {
  const actual = await vi.importActual('../services/runtimeSchemaCapabilities');
  return {
    ...actual,
    getRuntimeSchemaCapabilities: mockGetRuntimeSchemaCapabilities,
    warnSchemaCapabilityOnce: mockWarnSchemaCapabilityOnce,
  };
});

import { agentRouter } from '../agentRouter';

function createAgentCaller() {
  return agentRouter.createCaller({
    user: {
      id: 55,
      role: 'agent',
      email: 'agent@example.com',
    } as any,
    req: {} as any,
    res: {} as any,
    requestId: 'test-request',
  } as any);
}

function getTableName(table: any): string {
  const baseNameSymbol = Object.getOwnPropertySymbols(table).find(symbol =>
    String(symbol).includes('BaseName'),
  );
  return String((baseNameSymbol && table[baseNameSymbol]) || '');
}

function createSelectDbMock(data: {
  agents?: Array<Record<string, unknown>>;
  propertiesCount?: number;
  leadsCount?: number;
  commissionsTotal?: number;
  execute?: ReturnType<typeof vi.fn>;
}) {
  const execute = data.execute || vi.fn();
  const select = vi.fn((shape?: Record<string, unknown>) => {
    let tableName = '';

    const rowsForSelection = () => {
      const isCount = Boolean(shape && Object.prototype.hasOwnProperty.call(shape, 'count'));
      const isTotal = Boolean(shape && Object.prototype.hasOwnProperty.call(shape, 'total'));

      if (tableName === 'agents') {
        return data.agents || [];
      }
      if (tableName === 'properties' && isCount) {
        return [{ count: data.propertiesCount ?? 0 }];
      }
      if (tableName === 'leads' && isCount) {
        return [{ count: data.leadsCount ?? 0 }];
      }
      if (tableName === 'commissions' && isTotal) {
        return [{ total: data.commissionsTotal ?? 0 }];
      }
      return [];
    };

    const chain: any = {
      from(table: any) {
        tableName = getTableName(table);
        return chain;
      },
      where() {
        return chain;
      },
      limit() {
        return Promise.resolve(rowsForSelection());
      },
      orderBy() {
        return Promise.resolve(rowsForSelection());
      },
      offset() {
        return chain;
      },
      then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
        return Promise.resolve(rowsForSelection()).then(resolve, reject);
      },
    };

    return chain;
  });

  return {
    select,
    execute,
  };
}

function createLegacyCapabilities() {
  return {
    checkedAt: '2026-04-04T10:00:00.000Z',
    demandEngineReady: false,
    demandEngineDetails: {},
    economicActorsReady: false,
    economicActorsDetails: {},
    showingsReady: true,
    showingsDetails: {
      table: true,
      listingIdColumn: false,
      propertyIdColumn: true,
      leadIdColumn: true,
      agentIdColumn: true,
      scheduledTimeColumn: false,
      scheduledAtColumn: true,
      statusColumn: true,
      notesColumn: true,
    },
  } as any;
}

describe('agent showings compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeSchemaCapabilities.mockResolvedValue(createLegacyCapabilities());
  });

  it('returns normalized showings for the legacy showings schema', async () => {
    const execute = vi.fn().mockResolvedValue([
      {
        id: 91,
        listingId: 401,
        propertyId: 401,
        leadId: 33,
        agentId: 77,
        scheduledAt: '2026-04-04T09:00:00.000Z',
        status: 'confirmed',
        notes: 'Buyer requested a viewing',
        createdAt: '2026-04-03T09:00:00.000Z',
        updatedAt: '2026-04-03T10:00:00.000Z',
      },
    ]);

    mockGetDb.mockResolvedValue(
      createSelectDbMock({
        agents: [{ id: 77, userId: 55 }],
        execute,
      }),
    );

    const caller = createAgentCaller();
    const result = await caller.getMyShowings({
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      status: 'all',
    });

    expect(result).toEqual([
      expect.objectContaining({
        id: 91,
        listingId: 401,
        propertyId: 401,
        leadId: 33,
        scheduledAt: '2026-04-04T09:00:00.000Z',
        scheduledTime: '2026-04-04T09:00:00.000Z',
        status: 'scheduled',
        property: null,
        client: null,
      }),
    ]);
  });

  it('uses the legacy showings table for dashboard stats counts', async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce([{ count_value: 2 }])
      .mockResolvedValueOnce([{ count_value: 1 }]);

    mockGetDb.mockResolvedValue(
      createSelectDbMock({
        agents: [{ id: 77, userId: 55 }],
        propertiesCount: 7,
        leadsCount: 4,
        commissionsTotal: 125000,
        execute,
      }),
    );

    const caller = createAgentCaller();
    const result = await caller.getDashboardStats();

    expect(result).toEqual({
      activeListings: 7,
      newLeadsThisWeek: 4,
      showingsToday: 2,
      offersInProgress: 1,
      commissionsPending: 125000,
    });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('maps the external scheduled status into canonical storage on update', async () => {
    const execute = vi.fn().mockResolvedValue({ affectedRows: 1 });

    mockGetDb.mockResolvedValue(
      createSelectDbMock({
        agents: [{ id: 77, userId: 55 }],
        execute,
      }),
    );

    const caller = createAgentCaller();
    const result = await caller.updateShowingStatus({
      showingId: 91,
      status: 'scheduled',
    });

    expect(result).toEqual({ success: true });
    expect(execute).toHaveBeenCalledTimes(1);

    const query = execute.mock.calls[0]?.[0];
    expect(query?.queryChunks).toContain('confirmed');
  });
});
