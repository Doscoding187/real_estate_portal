import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock('../../db', () => ({ getDb: mockGetDb }));

import {
  lookupLaunchInvoiceByReference,
  recordLaunchPaymentByReference,
} from '../billingFoundationService';

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
    transaction: async (fn: (tx: any) => Promise<unknown>) => fn(db),
  };
  return { db, inserts };
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

  it('inserts a manual_eft under_review payment and an audit event, then hands off to review', async () => {
    const { db, inserts } = fakeDb({ invoice: issuedInvoice, payments: [] });
    mockGetDb.mockResolvedValue(db);
    // The fake has no payment row for the review join, so review stops at NOT_FOUND.
    await expect(recordLaunchPaymentByReference(input)).rejects.toThrow('Payment not found.');
    const payment = inserts.find(row => row.table === 'billing_payments');
    expect(payment?.values).toMatchObject({
      invoiceId: 5,
      paymentMethod: 'manual_eft',
      state: 'under_review',
      amount: 49900,
      paymentReference: 'PL-AN-REF123',
      payerName: 'Pat Agent',
      submittedBy: 1,
    });
    expect(payment?.values.metadata.notes).toContain('recorded by finance finance@example.com');
    const event = inserts.find(row => row.table === 'billing_audit_events');
    expect(event?.values.eventType).toBe('payment_recorded_by_finance');
  });

  it('reuses an existing under_review payment instead of inserting a second one', async () => {
    const { db, inserts } = fakeDb({
      invoice: issuedInvoice,
      payments: [{ id: 41, invoiceId: 5, state: 'under_review', amount: 49900 }],
    });
    mockGetDb.mockResolvedValue(db);
    await expect(recordLaunchPaymentByReference(input)).rejects.toThrow('Payment not found.');
    expect(inserts.filter(row => row.table === 'billing_payments')).toEqual([]);
    const event = inserts.find(row => row.table === 'billing_audit_events');
    expect(event?.values.paymentId).toBe(41);
  });
});
