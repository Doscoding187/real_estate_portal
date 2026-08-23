import { getTableName } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import {
  endCanonicalAgencyMembership,
  establishCanonicalAgencyMembership,
} from '../agencyMembershipService';

type RecordedOp = { op: string; table: string; values?: Record<string, unknown> };

function makeFakeDb(existingMembership: Record<string, unknown> | null) {
  const ops: RecordedOp[] = [];
  const tableName = (table: { [key: symbol]: unknown }) => String(getTableName(table as never));

  const db = {
    select: vi.fn(() => ({
      from: () => ({
        where: () => ({
          limit: async () => (existingMembership ? [existingMembership] : []),
        }),
      }),
    })),
    update: vi.fn((table: object) => ({
      set: (values: Record<string, unknown>) => {
        ops.push({
          op: 'update',
          table: tableName(table),
          values,
        });
        return {
          where: async () => [{ affectedRows: 1 }],
        };
      },
    })),
    insert: vi.fn((table: object) => ({
      values: (values: Record<string, unknown>) => {
        ops.push({
          op: 'insert',
          table: tableName(table),
          values,
        });
        return Promise.resolve([{ insertId: 901 }]);
      },
    })),
  };

  return { db, ops };
}

const MEMBERSHIP_TABLE = 'agency_agent_memberships';

describe('canonical agency membership service', () => {
  it('creates an active current membership and closes competing currents first', async () => {
    const { db, ops } = makeFakeDb(null);

    const result = await establishCanonicalAgencyMembership({
      db: db as never,
      agencyId: 11,
      agentId: 22,
      actorUserId: 33,
    });

    expect(result).toEqual({ state: 'created' });

    const membershipOps = ops.filter(entry => entry.table === MEMBERSHIP_TABLE);
    expect(membershipOps.length).toBeGreaterThanOrEqual(2);

    const closeCompeting = membershipOps[0];
    expect(closeCompeting.op).toBe('update');
    expect(closeCompeting.values).toMatchObject({ status: 'left' });
    expect(closeCompeting.values?.effectiveTo).toBeInstanceOf(Date);

    const insert = membershipOps[1];
    expect(insert.op).toBe('insert');
    expect(insert.values).toMatchObject({
      agencyId: 11,
      agentId: 22,
      status: 'active',
      governanceMode: 'affiliated',
      role: 'agent',
    });
    expect(insert.values?.effectiveTo ?? null).toBeNull();
  });

  it('reactivates an existing pair row instead of inserting a duplicate', async () => {
    const existing = {
      id: 77,
      status: 'suspended',
      effectiveFrom: '2026-01-01 00:00:00',
      effectiveTo: '2026-02-01 00:00:00',
      governanceMode: 'affiliated',
      role: 'agent',
      permissionsOverrides: null,
    };
    const { db, ops } = makeFakeDb(existing);

    const result = await establishCanonicalAgencyMembership({
      db: db as never,
      agencyId: 11,
      agentId: 22,
      actorUserId: 33,
    });

    expect(result).toEqual({ state: 'reactivated' });

    const membershipInserts = ops.filter(
      entry => entry.table === MEMBERSHIP_TABLE && entry.op === 'insert',
    );
    expect(membershipInserts).toHaveLength(0);

    const reopen = ops.find(
      entry => entry.table === MEMBERSHIP_TABLE && entry.op === 'update' && entry.values?.status === 'active',
    );
    expect(reopen).toBeDefined();
    expect(reopen?.values).toMatchObject({
      status: 'active',
      role: 'agent',
      governanceMode: 'affiliated',
    });
    expect(reopen?.values?.effectiveTo ?? null).toBeNull();
  });

  it('ends the current membership with a terminal status and window close', async () => {
    const { db, ops } = makeFakeDb({
      id: 78,
      status: 'active',
      effectiveFrom: null,
      effectiveTo: null,
    });

    const changed = await endCanonicalAgencyMembership({
      db: db as never,
      agencyId: 11,
      agentId: 22,
      terminalStatus: 'left',
      actorUserId: 33,
    });

    expect(changed).toBe(true);

    const close = ops.find(
      entry => entry.table === MEMBERSHIP_TABLE && entry.op === 'update' && entry.values?.status === 'left',
    );
    expect(close).toBeDefined();
    expect(close?.values?.effectiveTo).toBeInstanceOf(Date);
  });
});
