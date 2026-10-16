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
  leadRows?: Array<{
    id: number;
    status: string;
    createdAt: string;
    firstRespondedAt: string | null;
  }>;
  attemptRows?: Array<{ leadId: number; firstAttemptAt: string }>;
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
      if (tableName === 'lead_activities') return data.attemptRows || [];
      return [];
    };

    const builder: any = {
      from: (table: any) => {
        tableName = getTableName(table);
        return builder;
      },
      where: () => builder,
      groupBy: () => builder,
      limit: () => Promise.resolve(rowsForSelection()),
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve(rowsForSelection()).then(resolve, reject),
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
      outreachAttemptedLeads: 0,
      awaitingFirstOutreach: 0,
      medianHoursToFirstOutreach: null,
      connectedLeads: 0,
      awaitingTwoWayConnection: 0,
      medianHoursToConnection: null,
    });
  });

  it('separates logged outreach attempts from two-way connections', async () => {
    mockGetDb.mockResolvedValue(
      createSelectDbMock({
        agents: [{ id: 77 }],
        leadRows: [
          { id: 1, status: 'new', createdAt: hoursAgo(50), firstRespondedAt: hoursAgo(49) },
          { id: 2, status: 'contacted', createdAt: hoursAgo(40), firstRespondedAt: hoursAgo(37) },
          { id: 3, status: 'viewing_scheduled', createdAt: hoursAgo(30), firstRespondedAt: hoursAgo(23) },
          { id: 4, status: 'new', createdAt: hoursAgo(2), firstRespondedAt: null },
          { id: 5, status: 'lost', createdAt: hoursAgo(20), firstRespondedAt: null },
          { id: 6, status: 'new', createdAt: hoursAgo(20), firstRespondedAt: null },
        ],
        attemptRows: [
          { leadId: 1, firstAttemptAt: hoursAgo(49.5) },
          // An unanswered attempt is outreach, but not a two-way connection.
          { leadId: 6, firstAttemptAt: hoursAgo(19) },
        ],
      }) as any,
    );

    const result = await createAgentCaller().getLeadResponseSummary();

    expect(result.totalLeads).toBe(6);
    expect(result.outreachAttemptedLeads).toBe(4);
    // Only active leads with no attempt or connection need first outreach.
    expect(result.awaitingFirstOutreach).toBe(1);
    // Attempt deltas: 0.5h, 1h, 3h (legacy connection fallback), 7h -> lower median 1h.
    expect(result.medianHoursToFirstOutreach).toBe(1);
    expect(result.connectedLeads).toBe(3);
    // The unanswered attempt still awaits a two-way conversation; lost is terminal.
    expect(result.awaitingTwoWayConnection).toBe(2);
    expect(result.medianHoursToConnection).toBe(3);
  });

  it('reports distinct empty medians when no attempt or connection exists', async () => {
    mockGetDb.mockResolvedValue(
      createSelectDbMock({
        agents: [{ id: 77 }],
        leadRows: [{ id: 7, status: 'new', createdAt: hoursAgo(3), firstRespondedAt: null }],
      }) as any,
    );

    const result = await createAgentCaller().getLeadResponseSummary();

    expect(result.totalLeads).toBe(1);
    expect(result.outreachAttemptedLeads).toBe(0);
    expect(result.awaitingFirstOutreach).toBe(1);
    expect(result.medianHoursToFirstOutreach).toBeNull();
    expect(result.connectedLeads).toBe(0);
    expect(result.awaitingTwoWayConnection).toBe(1);
    expect(result.medianHoursToConnection).toBeNull();
  });
});
