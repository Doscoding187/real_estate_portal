import { MySqlDialect } from 'drizzle-orm/mysql-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  canEditContact,
  contactReadPredicate,
  contactWritePredicate,
  getContactActorScope,
  requireReadableContact,
  requireWritableContact,
} from '../contactAccessService';

function selectChain(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  return { from, where, limit };
}

function rendered(predicate: Parameters<MySqlDialect['sqlToQuery']>[0]) {
  return new MySqlDialect().sqlToQuery(predicate);
}

describe('Contact access authority', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('treats an agent without an agency as a first-class private scope', async () => {
    const db = { select: vi.fn() };
    await expect(getContactActorScope(db, { id: 41, role: 'agent' })).resolves.toEqual({
      userId: 41,
      agencyId: null,
      agentId: null,
      isManager: false,
    });
    expect(db.select).not.toHaveBeenCalled();

    const sql = rendered(
      contactReadPredicate({
        userId: 41,
        agencyId: null,
        agentId: null,
        isManager: false,
      }),
    );
    expect(sql.sql).toContain('`contacts`.`owner_user_id` = ?');
    expect(sql.sql).toContain('`contacts`.`agency_id` is null');
    expect(sql.params).toEqual([41]);
  });

  it('resolves only an approved agency agent from server-side membership', async () => {
    const chain = selectChain([{ id: 701 }]);
    const db = { select: vi.fn(() => chain) };

    await expect(getContactActorScope(db, { id: 41, role: 'agent', agencyId: 9 })).resolves.toEqual(
      {
        userId: 41,
        agencyId: 9,
        agentId: 701,
        isManager: false,
      },
    );

    const deniedDb = { select: vi.fn(() => selectChain([])) };
    await expect(
      getContactActorScope(deniedDb, { id: 41, role: 'agent', agencyId: 9 }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('does not turn an agency manager without an agency into an independent owner', async () => {
    await expect(
      getContactActorScope({ select: vi.fn() }, { id: 41, role: 'agency_admin' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('keeps agency-private records owner-only while shared records remain agency-readable', () => {
    const sql = rendered(
      contactReadPredicate({ userId: 41, agencyId: 9, agentId: 701, isManager: false }),
    );

    expect(sql.sql).toContain('`contacts`.`agency_id` is null');
    expect(sql.sql).toContain('`contacts`.`agency_id` = ?');
    expect(sql.sql).toContain('`contacts`.`owner_user_id` = ?');
    expect(sql.sql).toContain('`contacts`.`visibility` = ?');
    expect(sql.params).toEqual([41, 9, 41, 'agency_shared']);
  });

  it('gives managers only their own agency scope, including write scope', () => {
    const scope = { userId: 51, agencyId: 12, agentId: null, isManager: true } as const;
    const readSql = rendered(contactReadPredicate(scope));
    const writeSql = rendered(contactWritePredicate(scope));

    expect(readSql.sql).toContain('`contacts`.`agency_id` = ?');
    expect(writeSql.sql).toContain('`contacts`.`agency_id` = ?');
    expect(readSql.params).toEqual([51, 12]);
    expect(writeSql.params).toEqual([51, 12]);
    expect(readSql.sql).not.toContain('visibility');
    expect(writeSql.sql).not.toContain('visibility');
  });

  it('does not turn a readable shared record into an editable record for another agent', () => {
    const agentScope = { userId: 41, agencyId: 9, agentId: 701, isManager: false } as const;
    expect(canEditContact(agentScope, { ownerUserId: 99, agencyId: 9 })).toBe(false);
    expect(canEditContact(agentScope, { ownerUserId: 41, agencyId: 9 })).toBe(true);
    expect(canEditContact(agentScope, { ownerUserId: 41, agencyId: null })).toBe(true);
    expect(canEditContact(agentScope, { ownerUserId: 41, agencyId: 10 })).toBe(false);
  });

  it('returns not-found for direct IDs outside the read/write predicate', async () => {
    const readChain = selectChain([]);
    const db = { select: vi.fn(() => readChain) };
    const scope = { userId: 41, agencyId: 9, agentId: 701, isManager: false } as const;

    await expect(requireReadableContact(db, scope, 999)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(requireWritableContact(db, scope, 999)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(readChain.limit).toHaveBeenCalledTimes(2);
  });
});
