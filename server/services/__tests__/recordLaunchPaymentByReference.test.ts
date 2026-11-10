import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock('../../db', () => ({ getDb: mockGetDb }));

import { MySqlDialect } from 'drizzle-orm/mysql-core';
import {
  lookupLaunchInvoiceByReference,
  recordLaunchPaymentByReference,
} from '../billingFoundationService';

const dialect = new MySqlDialect();
const finance = { id: 1, role: 'super_admin', email: 'finance@example.com' };

function tableName(table: any): string {
  const sym = Object.getOwnPropertySymbols(table).find(s => String(s).includes('BaseName'));
  return String((sym && table[sym]) || '');
}

type Fixture = {
  invoice?: Record<string, unknown> | null;
  payments?: Array<Record<string, unknown>>;
};

function fakeDb(fixture: Fixture) {
  const inserts: Array<{ table: string; values: any }> = [];
  const deletes: Array<{ table: string; params: unknown[]; sql: string }> = [];
  const updates: Array<{ table: string; values: any; params: unknown[] }> = [];
  const rowsFor = (name: string, joined: boolean) => {
    if (joined) return [];
    if (name === 'billing_invoices') return fixture.invoice ? [fixture.invoice] : [];
    if (name === 'billing_payments') return fixture.payments ?? [];
    if (name === 'billable_accounts') return [{ id: 9 }];
    if (name === 'users') return [{ name: 'Pat Agent', email: 'pat@example.com' }];
    return [];
  };
  const select = () => {
    let name = '';
    let joined = false;
    const chain: any = {
      from: (table: any) => {
        name = tableName(table);
        return chain;
      },
      innerJoin: () => {
        joined = true;
        return chain;
      },
      where: () => {
        const result: any = Promise.resolve(rowsFor(name, joined));
        result.limit = async () => rowsFor(name, joined);
        return result;
      },
    };
    return chain;
  };
  const db: any = {
    select,
    execute: async () => [],
    insert: (table: any) => ({
      values: (values: any) => {
        inserts.push({ table: tableName(table), values });
        return { $returningId: async () => [{ id: 77 }], onDuplicateKeyUpdate: async () => [] };
      },
    }),
    // Honours the where() predicate: the compiled SQL parameters are recorded so
    // tests can assert exactly which row id and state were targeted.
    delete: (table: any) => ({
      where: async (predicate: any) => {
        const compiled = dialect.sqlToQuery(predicate);
        deletes.push({ table: tableName(table), params: compiled.params, sql: compiled.sql });
      },
    }),
    update: (table: any) => ({
      set: (values: any) => ({
        where: async (predicate: any) => {
          updates.push({
            table: tableName(table),
            values,
            params: dialect.sqlToQuery(predicate).params,
          });
        },
      }),
    }),
    transaction: async (fn: (tx: any) => Promise<unknown>) => fn(db),
  };
  return { db, inserts, deletes, updates };
}

const issuedInvoice = {
  id: 5,
  invoiceNumber: 'AN-2026-0001',
  paymentReference: 'PL-AN-REF123',
  ownerType: 'agent',
  ownerId: 31,
  billableAccountId: 9,
  subscriptionId: null,
  amountDue: 49900,
  amountPaid: 0,
  currency: 'ZAR',
  status: 'issued',
  metadata: {},
  planId: 3,
};

const input = {
  actorUser: finance,
  paymentReference: 'PL-AN-REF123',
  amountReceivedMinor: 49900,
  paidOn: '2026-11-09',
};

describe('billing.recordLaunchPaymentByReference', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is finance-admin only', async () => {
    mockGetDb.mockResolvedValue(fakeDb({ invoice: issuedInvoice }).db);
    const nonFinance = { ...input, actorUser: { id: 2, role: 'agency_admin' } };
    await expect(recordLaunchPaymentByReference(nonFinance)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(
      lookupLaunchInvoiceByReference({
        actorUser: nonFinance.actorUser,
        paymentReference: 'PL-AN-REF123',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('returns NOT_FOUND for an unknown reference', async () => {
    mockGetDb.mockResolvedValue(fakeDb({ invoice: null }).db);
    await expect(recordLaunchPaymentByReference(input)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'No invoice with this reference',
    });
    await expect(
      lookupLaunchInvoiceByReference({ actorUser: finance, paymentReference: 'NOPE' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('refuses an already-paid invoice with CONFLICT and records nothing', async () => {
    const { db, inserts } = fakeDb({ invoice: { ...issuedInvoice, status: 'paid', amountPaid: 49900 } });
    mockGetDb.mockResolvedValue(db);
    await expect(recordLaunchPaymentByReference(input)).rejects.toMatchObject({
      code: 'CONFLICT',
      message: 'Already paid',
    });
    expect(inserts).toEqual([]);
  });

  it('rejects a non-positive amount and a malformed date', async () => {
    mockGetDb.mockResolvedValue(fakeDb({ invoice: issuedInvoice }).db);
    await expect(
      recordLaunchPaymentByReference({ ...input, amountReceivedMinor: 0 }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(
      recordLaunchPaymentByReference({ ...input, paidOn: '09/11/2026' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  const approveOk = { success: true, invoiceStatus: 'paid', activationOccurred: true };

  it('approves the exact balance through reviewManualPayment and logs the audit after success', async () => {
    const { db, inserts } = fakeDb({ invoice: issuedInvoice, payments: [] });
    mockGetDb.mockResolvedValue(db);
    const review = vi.fn(async () => {
      // No audit event exists until the review has succeeded.
      expect(inserts.find(row => row.table === 'billing_audit_events')).toBeUndefined();
      return approveOk;
    });
    const result = await recordLaunchPaymentByReference(input, { review: review as any });
    expect(review).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 77,
        decision: 'approve',
        verifiedAmount: 49900,
        bankPaymentReference: 'PL-AN-REF123',
      }),
    );
    expect(result).toMatchObject({ success: true, paymentId: 77 });
    const payment = inserts.find(row => row.table === 'billing_payments');
    expect(payment?.values).toMatchObject({
      invoiceId: 5,
      paymentMethod: 'manual_eft',
      state: 'under_review',
      amount: 49900,
      payerName: 'Pat Agent',
      submittedBy: 1,
    });
    expect(payment?.values.metadata.notes).toContain('recorded by finance finance@example.com');
    expect(inserts.find(row => row.table === 'billing_audit_events')?.values.eventType).toBe(
      'payment_recorded_by_finance',
    );
  });

  it('uses the supplied bank reference for the review', async () => {
    mockGetDb.mockResolvedValue(fakeDb({ invoice: issuedInvoice }).db);
    const review = vi.fn(async () => approveOk);
    await recordLaunchPaymentByReference({ ...input, bankReference: 'BANK-1' }, { review: review as any });
    expect(review).toHaveBeenCalledWith(expect.objectContaining({ bankPaymentReference: 'BANK-1' }));
  });

  it('routes an amount below the balance to partial_payment', async () => {
    mockGetDb.mockResolvedValue(fakeDb({ invoice: issuedInvoice }).db);
    const review = vi.fn(async () => ({ success: true }));
    await recordLaunchPaymentByReference({ ...input, amountReceivedMinor: 10000 }, { review: review as any });
    expect(review).toHaveBeenCalledWith(
      expect.objectContaining({ decision: 'partial_payment', verifiedAmount: 10000 }),
    );
  });

  it('rejects an overpayment before any write and never calls review', async () => {
    const { db, inserts, deletes } = fakeDb({ invoice: issuedInvoice });
    mockGetDb.mockResolvedValue(db);
    const review = vi.fn();
    await expect(
      recordLaunchPaymentByReference({ ...input, amountReceivedMinor: 49901 }, { review: review as any }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: expect.stringContaining('more than the balance due'),
    });
    expect(inserts).toEqual([]);
    expect(deletes).toEqual([]);
    expect(review).not.toHaveBeenCalled();
  });

  it('rejects a non-payable invoice before any write', async () => {
    const { db, inserts } = fakeDb({ invoice: { ...issuedInvoice, status: 'void' } });
    mockGetDb.mockResolvedValue(db);
    await expect(recordLaunchPaymentByReference(input)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(inserts).toEqual([]);
  });

  it('removes the new row and writes no audit event when review fails', async () => {
    const { db, inserts, deletes } = fakeDb({ invoice: issuedInvoice });
    mockGetDb.mockResolvedValue(db);
    const review = vi.fn(async () => {
      throw new Error('review refused');
    });
    await expect(recordLaunchPaymentByReference(input, { review: review as any })).rejects.toThrow(
      'review refused',
    );
    expect(inserts.filter(row => row.table === 'billing_payments')).toHaveLength(1);
    // Only the newly created row (id 77) and only while still under_review.
    expect(deletes).toHaveLength(1);
    expect(deletes[0].table).toBe('billing_payments');
    expect(deletes[0].params).toEqual([77, 'under_review']);
    expect(inserts.find(row => row.table === 'billing_audit_events')).toBeUndefined();
  });

  it('reuses an existing under_review payment: no second insert, and it is kept if review fails', async () => {
    const { db, inserts, deletes } = fakeDb({
      invoice: issuedInvoice,
      payments: [{ id: 41, invoiceId: 5, state: 'under_review', amount: 49900 }],
    });
    mockGetDb.mockResolvedValue(db);
    const review = vi.fn(async () => approveOk);
    await recordLaunchPaymentByReference(input, { review: review as any });
    expect(inserts.filter(row => row.table === 'billing_payments')).toEqual([]);
    expect(review).toHaveBeenCalledWith(expect.objectContaining({ paymentId: 41 }));
    expect(inserts.find(row => row.table === 'billing_audit_events')?.values.paymentId).toBe(41);

    const failing = vi.fn(async () => {
      throw new Error('nope');
    });
    await expect(recordLaunchPaymentByReference(input, { review: failing as any })).rejects.toThrow('nope');
    expect(deletes).toEqual([]);
  });

  it('persists a supplied bank reference on a reused non-notice row', async () => {
    const { db, updates } = fakeDb({
      invoice: issuedInvoice,
      payments: [{ id: 41, invoiceId: 5, state: 'under_review', amount: 49900, metadata: {} }],
    });
    mockGetDb.mockResolvedValue(db);
    const review = vi.fn(async () => approveOk);
    await recordLaunchPaymentByReference(
      { ...input, bankReference: ' BANK-9 ' },
      { review: review as any },
    );
    expect(updates).toHaveLength(1);
    expect(updates[0].table).toBe('billing_payments');
    expect(updates[0].values).toEqual({ bankReference: 'BANK-9' });
    expect(updates[0].params).toEqual([41]);
  });

  it('leaves a reused customer payment notice untouched (review keeps its own rule)', async () => {
    const { db, updates } = fakeDb({
      invoice: issuedInvoice,
      payments: [
        {
          id: 41,
          invoiceId: 5,
          state: 'under_review',
          amount: 49900,
          metadata: { submission_kind: 'payment_notice' },
        },
      ],
    });
    mockGetDb.mockResolvedValue(db);
    const review = vi.fn(async () => approveOk);
    await recordLaunchPaymentByReference(
      { ...input, bankReference: 'BANK-9' },
      { review: review as any },
    );
    expect(updates).toEqual([]);
  });
});
