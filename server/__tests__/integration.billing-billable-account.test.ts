import { describe, expect, it } from 'vitest';
import { count, eq, sql } from 'drizzle-orm';
import {
  agencies,
  billableAccounts,
  billingAuditEvents,
  billingInvoices,
  billingPaymentDocuments,
  billingPayments,
  developerOrganisations,
  subscriptions,
  users,
} from '../../drizzle/schema';
import { getDb } from '../db-connection';

const hasDb = Boolean(process.env.DATABASE_URL);
const describeWithDb: typeof describe = hasDb
  ? describe
  : (((name, fn) => describe.skip(`${name} (requires DATABASE_URL)`, fn)) as typeof describe);

describeWithDb('billing billable-account authority', () => {
  it('keeps every central account attached to exactly one typed owner', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [accountCount] = await db.select({ count: count() }).from(billableAccounts);
    const [ownedCount] = await db
      .select({ count: count() })
      .from(billableAccounts)
      .where(
        sql`(
          (account_kind = 'agent' AND user_id IS NOT NULL AND agency_id IS NULL AND developer_organisation_id IS NULL)
          OR (account_kind = 'agency' AND user_id IS NULL AND agency_id IS NOT NULL AND developer_organisation_id IS NULL)
          OR (account_kind = 'developer' AND user_id IS NULL AND agency_id IS NULL AND developer_organisation_id IS NOT NULL)
        )`,
      );
    expect(Number(ownedCount.count)).toBe(Number(accountCount.count));
  });

  it('rejects a mismatched account kind and typed owner', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const [agency] = await db.select({ id: agencies.id }).from(agencies).limit(1);
    expect(agency).toBeDefined();
    if (!agency) return;

    await expect(
      db.insert(billableAccounts).values({ accountKind: 'agent', agencyId: agency.id }),
    ).rejects.toThrow(/check|constraint|failed|cannot be null/i);

    const [account] = await db
      .select({ id: billableAccounts.id })
      .from(billableAccounts)
      .where(eq(billableAccounts.agencyId, agency.id));
    expect(account).toBeDefined();
  });

  it('keeps every active billing fact non-null and linked to its account', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const tables = [
      subscriptions,
      billingInvoices,
      billingPayments,
      billingPaymentDocuments,
      billingAuditEvents,
    ] as const;
    for (const table of tables) {
      const [row] = await db
        .select({ total: count(), nullAccounts: sql<number>`SUM(${table.billableAccountId} IS NULL)` })
        .from(table);
      expect(Number(row?.nullAccounts || 0)).toBe(0);
    }
  });
});
