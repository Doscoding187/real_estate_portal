import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
}));

vi.mock('../db', () => ({
  getDb: mockGetDb,
}));

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
  leadRows?: Array<{ status: string; createdAt: string; firstRespondedAt: string | null }>;
}) {
  const select = vi.fn((shape?: Record<string, unknown>) => {
    let tableName = '';

    const rowsForSelection = () => {
      const wantsCount = Boolean(shape && 'count' in shape);

      if (tableName === 'agents') return data.agents || [];
      if (tableName === 'leads') {
        if (wantsCount) throw new Error('Unexpected count selection on leads');
        return data.leadRows || [];
      }
      return [];
    };

    const builder: any = {
      from: (table: any) => {
        tableName = getTableName(table);
        return builder;
      },
      where: () => {
        const limited: any = { limit: () => Promise.resolve(rowsForSelection()) };
        return Object.assign(Promise.resolve(rowsForSelection()), {
          limit: limited.limit,
        });
      },
    };
    return builder;
  });

  return { select };
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

describe('agent.getLeadResponseSummary', () => {
  beforeEach(() => {
    mockGetDb.mockReset();
  });

  it('returns an empty summary when the caller has no approved agent record', async () => {
    mockGetDb.mockResolvedValue(
      createSelectDbMock({ agents: [], leadRows: [] }) as any,
    );

    const result = await createAgentCaller().getLeadResponseSummary();

    expect(result).toEqual({
      windowDays: 30,
      totalLeads: 0,
      respondedLeads: 0,
      awaitingFirstResponse: 0,
      medianHoursToFirstResponse: null,
    });
  });

  it('computes median first-response hours and awaiting counts from recorded timestamps', async () => {
    mockGetDb.mockResolvedValue(
      createSelectDbMock({
        agents: [{ id: 77 }],
        leadRows: [
          { status: 'new', createdAt: hoursAgo(50), firstRespondedAt: hoursAgo(49) },
          { status: 'contacted', createdAt: hoursAgo(40), firstRespondedAt: hoursAgo(37) },
          { status: 'viewing_scheduled', createdAt: hoursAgo(30), firstRespondedAt: hoursAgo(23) },
          { status: 'new', createdAt: hoursAgo(2), firstRespondedAt: null },
          { status: 'lost', createdAt: hoursAgo(20), firstRespondedAt: null },
        ],
      }) as any,
    );

    const result = await createAgentCaller().getLeadResponseSummary();

    expect(result.totalLeads).toBe(5);
    expect(result.respondedLeads).toBe(3);
    // Lost leads are terminal, not pending work.
    expect(result.awaitingFirstResponse).toBe(1);
    // Responded deltas: 1h, 3h, 7h -> lower median 3h.
    expect(result.medianHoursToFirstResponse).toBe(3);
  });

  it('reports no median while no enquiry has been answered yet', async () => {
    mockGetDb.mockResolvedValue(
      createSelectDbMock({
        agents: [{ id: 77 }],
        leadRows: [{ status: 'new', createdAt: hoursAgo(3), firstRespondedAt: null }],
      }) as any,
    );

    const result = await createAgentCaller().getLeadResponseSummary();

    expect(result.totalLeads).toBe(1);
    expect(result.respondedLeads).toBe(0);
    expect(result.awaitingFirstResponse).toBe(1);
    expect(result.medianHoursToFirstResponse).toBeNull();
  });
});
