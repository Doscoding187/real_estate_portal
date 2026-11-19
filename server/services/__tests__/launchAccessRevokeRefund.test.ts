import { readFileSync } from 'fs';
import { join } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock('../../db', () => ({ getDb: mockGetDb }));

import { MySqlDialect } from 'drizzle-orm/mysql-core';
import { recordEftRefund, revokeLaunchAccess, updateSubscriptionLifecycle } from '../billingFoundationService';

const dialect = new MySqlDialect();
const finance = { id: 1, role: 'super_admin' };

function tableName(table: any): string {
  const sym = Object.getOwnPropertySymbols(table).find(s => String(s).includes('BaseName'));
  return String((sym && table[sym]) || '');
}

type Fixture = { subscription?: any; payment?: any; pending?: any[]; owner?: string };

function fakeDb(fixture: Fixture) {
  const inserts: Array<{ table: string; values: any }> = [];
  const updates: Array<{ table: string; values: any }> = [];
  const executes: string[] = [];
  const rowsFor = (name: string, joined: boolean) => {
    if (joined) return [{ ownerType: fixture.owner ?? 'agent', ownerId: 31 }];
    if (name === 'subscriptions') return fixture.subscription ? [fixture.subscription] : [];
    if (name === 'billing_payments') return fixture.payment ? [fixture.payment] : [];
    if (name === 'billable_accounts') return [{ id: 9 }];
    return [];
  };
  const select = (cols?: any) => {
    let name = '';
    let joined = false;
    const chain: any = {
      from: (table: any) => {
        name = tableName(table);
        // select({ ownerType, ownerId }) from subscriptions returns owner identity.
        return chain;
      },
      innerJoin: () => {
        joined = true;
        return chain;
      },
      where: () => {
        const rows = () =>
          cols && name === 'subscriptions' && fixture.subscription
            ? [{ ownerType: fixture.owner ?? 'agent', ownerId: 31 }]
            : rowsFor(name, joined);
        const result: any = Promise.resolve(
          name === 'billing_payments' && !joined ? (fixture.pending ?? []) : rows(),
        );
        result.limit = async () => rows();
        return result;
      },
    };
    return chain;
  };
  const db: any = {
    select,
    execute: async (q: any) => {
      executes.push(dialect.sqlToQuery(q).sql);
      return [];
    },
    insert: (table: any) => ({
      values: (values: any) => {
        inserts.push({ table: tableName(table), values });
        return Promise.resolve([]);
      },
    }),
    update: (table: any) => ({
      set: (values: any) => ({
        where: async () => {
          updates.push({ table: tableName(table), values });
        },
      }),
    }),
    transaction: async (fn: (tx: any) => Promise<unknown>) => fn(db),
  };
  return { db, inserts, updates, executes };
}

const activeSub = {
  id: 4,
  ownerType: 'agent',
  ownerId: 31,
  billableAccountId: 9,
  planId: 3,
  status: 'active',
  metadata: { verified_payment_id: 8 },
};
const verifiedPayment = {
  id: 8,
  invoiceId: 5,
  subscriptionId: 4,
  ownerType: 'agent',
  ownerId: 31,
  state: 'verified',
  amount: 49900,
  metadata: {},
};

describe('revokeLaunchAccess', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects non super_admin callers', async () => {
    mockGetDb.mockResolvedValue(fakeDb({ subscription: activeSub }).db);
    await expect(
      revokeLaunchAccess({ actorUser: { id: 2, role: 'agency_admin' }, subscriptionId: 4, reason: 'x' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('cancels the subscription, closes the period and writes an audit row', async () => {
    const f = fakeDb({ subscription: activeSub });
    mockGetDb.mockResolvedValue(f.db);
    const result = await revokeLaunchAccess({
      actorUser: finance,
      subscriptionId: 4,
      reason: 'Pilot ended',
    });
    expect(result).toEqual({ success: true, alreadyRevoked: false });
    const sub = f.updates.find(u => u.table === 'subscriptions')!;
    expect(sub.values.status).toBe('cancelled');
    expect(sub.values.metadata.access_revoked_reason).toBe('Pilot ended');
    expect(sub.values.metadata.access_revoked_by).toBe(1);
    const audit = f.inserts.find(u => u.table === 'billing_audit_events')!;
    expect(audit.values).toMatchObject({
      eventType: 'launch_access_revoked',
      actorUserId: 1,
      message: 'Pilot ended',
    });
  });

  it('is idempotent when already revoked', async () => {
    const f = fakeDb({
      subscription: { ...activeSub, status: 'cancelled', metadata: { access_revoked_at: 'x' } },
    });
    mockGetDb.mockResolvedValue(f.db);
    const result = await revokeLaunchAccess({ actorUser: finance, subscriptionId: 4, reason: 'again' });
    expect(result.alreadyRevoked).toBe(true);
    expect(f.updates).toHaveLength(0);
    expect(f.inserts).toHaveLength(0);
  });

  it('requires a reason', async () => {
    mockGetDb.mockResolvedValue(fakeDb({ subscription: activeSub }).db);
    await expect(
      revokeLaunchAccess({ actorUser: finance, subscriptionId: 4, reason: '  ' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});

describe('recordEftRefund', () => {
  beforeEach(() => vi.clearAllMocks());
  const base = { actorUser: finance, paymentId: 8, amountMinor: 49900, refundedOn: '2026-11-19', note: 'FNB ref 123' };

  it('rejects non super_admin callers', async () => {
    mockGetDb.mockResolvedValue(fakeDb({ payment: verifiedPayment, subscription: activeSub }).db);
    await expect(
      recordEftRefund({ ...base, actorUser: { id: 2, role: 'agent' } }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('marks the payment refunded, revokes access and writes audit rows', async () => {
    const f = fakeDb({ payment: verifiedPayment, subscription: activeSub });
    mockGetDb.mockResolvedValue(f.db);
    const result = await recordEftRefund(base);
    expect(result).toMatchObject({ success: true, alreadyRefunded: false, alreadyRevoked: false });
    const pay = f.updates.find(u => u.table === 'billing_payments')!;
    expect(pay.values.state).toBe('refunded');
    expect(pay.values.metadata.refund).toMatchObject({
      amount_minor: 49900,
      refunded_on: '2026-11-19',
      note: 'FNB ref 123',
      recorded_by: 1,
    });
    expect(f.updates.find(u => u.table === 'subscriptions')!.values.status).toBe('cancelled');
    const events = f.inserts.filter(i => i.table === 'billing_audit_events').map(i => i.values.eventType);
    expect(events).toEqual(['payment_refund_recorded', 'launch_access_revoked']);
  });

  it('refuses payments that are not verified, partial amounts and bad dates', async () => {
    mockGetDb.mockResolvedValue(
      fakeDb({ payment: { ...verifiedPayment, state: 'under_review' }, subscription: activeSub }).db,
    );
    await expect(recordEftRefund(base)).rejects.toMatchObject({ code: 'CONFLICT' });
    mockGetDb.mockResolvedValue(fakeDb({ payment: verifiedPayment, subscription: activeSub }).db);
    await expect(recordEftRefund({ ...base, amountMinor: 10000 })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    for (const refundedOn of ['2026-02-30', '2999-01-01', 'nope']) {
      await expect(recordEftRefund({ ...base, refundedOn })).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    }
  });

  const refundedRow = {
    ...verifiedPayment,
    state: 'refunded',
    metadata: {
      refund: { amount_minor: 49900, refunded_on: '2026-11-19', note: 'FNB ref 123' },
    },
  };

  it('identical re-run of a refund is a true no-op and keeps a later paid term', async () => {
    const f = fakeDb({
      payment: refundedRow,
      subscription: { ...activeSub, metadata: { verified_payment_id: 99 } },
    });
    mockGetDb.mockResolvedValue(f.db);
    const result = await recordEftRefund(base);
    expect(result).toMatchObject({ alreadyRefunded: true, accessRevoked: false });
    expect(f.updates).toHaveLength(0);
    expect(f.inserts).toHaveLength(0);
  });

  it('differing re-run of a refund conflicts', async () => {
    mockGetDb.mockResolvedValue(fakeDb({ payment: refundedRow, subscription: activeSub }).db);
    await expect(recordEftRefund({ ...base, note: 'other' })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('refund of an older payment records the refund but keeps the newer term', async () => {
    const f = fakeDb({
      payment: verifiedPayment,
      subscription: { ...activeSub, metadata: { verified_payment_id: 99 } },
    });
    mockGetDb.mockResolvedValue(f.db);
    const result = await recordEftRefund(base);
    expect(result).toMatchObject({ success: true, accessRevoked: false });
    expect(f.updates.find(u => u.table === 'billing_payments')!.values.state).toBe('refunded');
    expect(f.updates.find(u => u.table === 'subscriptions')).toBeUndefined();
  });

  it('uses the owner lock path for agent and developer owners', async () => {
    for (const owner of ['agent', 'developer']) {
      const f = fakeDb({ payment: verifiedPayment, subscription: activeSub, owner });
      mockGetDb.mockResolvedValue(f.db);
      await recordEftRefund(base);
      expect(f.executes.some(q => q.includes(owner === 'agent' ? 'FROM users' : 'FROM developer_organisations'))).toBe(true);
    }
  });
});

describe('revoke rejects pending payments', () => {
  it('moves submitted/under_review payments to rejected with an audit row', async () => {
    const f = fakeDb({
      subscription: activeSub,
      pending: [{ id: 12, invoiceId: 6, state: 'under_review' }],
    });
    mockGetDb.mockResolvedValue(f.db);
    await revokeLaunchAccess({ actorUser: finance, subscriptionId: 4, reason: 'Pilot ended' });
    const rejected = f.updates.find(u => u.table === 'billing_payments')!;
    expect(rejected.values).toMatchObject({
      state: 'rejected',
      rejectionReason: 'access revoked by admin',
    });
    expect(f.inserts.map(i => i.values.eventType)).toContain('payment_rejected_access_revoked');
  });
});

describe('lifecycle reactivation of a revoked row', () => {
  it('is refused', async () => {
    const f = fakeDb({
      subscription: { ...activeSub, status: 'cancelled', metadata: { access_revoked_at: 'x' } },
    });
    mockGetDb.mockResolvedValue(f.db);
    await expect(
      updateSubscriptionLifecycle({ actorUser: finance, subscriptionId: 4, status: 'active' }),
    ).rejects.toMatchObject({ message: expect.stringContaining('revoked by an admin') });
    expect(f.updates).toHaveLength(0);
  });
});

describe('router authorisation', () => {
  it('exposes revoke and refund only through superAdminProcedure', () => {
    const src = readFileSync(join(__dirname, '../../billingRouter.ts'), 'utf8');
    expect(src).toContain('revokeLaunchAccess: superAdminProcedure');
    expect(src).toContain('recordEftRefund: superAdminProcedure');
  });
});
