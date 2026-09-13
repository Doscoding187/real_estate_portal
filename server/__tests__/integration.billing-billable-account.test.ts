import { randomUUID } from 'node:crypto';
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

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function underlyingMySqlError(error: unknown): Record<string, unknown> {
  let current: unknown = error;
  for (let depth = 0; depth < 4; depth += 1) {
    const candidate = record(current);
    if (!candidate) break;
    if (
      typeof candidate.code === 'string' ||
      typeof candidate.errno === 'number' ||
      typeof candidate.sqlMessage === 'string'
    ) {
      return candidate;
    }
    current = candidate.cause;
  }
  throw new Error('Billable-account rejection did not expose the underlying MySQL error.');
}

async function expectMySqlConstraintViolation(
  query: PromiseLike<unknown>,
  expected: Record<string, unknown>,
): Promise<void> {
  const failure = await query.then(
    () => {
      throw new Error('Expected the database operation to be rejected by a constraint.');
    },
    error => error,
  );
  expect(underlyingMySqlError(failure)).toMatchObject(expected);
}

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
    const fixtureKey = `billing-owner-${randomUUID()}`;
    const [inserted] = await db.insert(agencies).values({
      name: fixtureKey,
      slug: fixtureKey,
      isVerified: 0,
      email: `${fixtureKey}@example.test`,
    }).$returningId();
    const agencyId = inserted.id;
    try {
      // Prove a valid typed owner works without depending on scenario seed data.
      await db.insert(billableAccounts).values({ accountKind: 'agency', agencyId });
      await expectMySqlConstraintViolation(
        db.insert(billableAccounts).values({ accountKind: 'agent', agencyId }),
        {
          code: 'ER_CHECK_CONSTRAINT_VIOLATED',
          errno: 3819,
          sqlMessage: expect.stringContaining('billable_accounts_exactly_one_owner'),
        },
      );
      const [account] = await db
        .select({ id: billableAccounts.id })
        .from(billableAccounts)
        .where(eq(billableAccounts.agencyId, agencyId));
      expect(account).toBeDefined();
    } finally {
      await db.delete(billableAccounts).where(eq(billableAccounts.agencyId, agencyId));
      await db.delete(agencies).where(eq(agencies.id, agencyId));
    }
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
        .select({
          total: count(),
          nullAccounts: sql<number>`SUM(${table.billableAccountId} IS NULL)`,
        })
        .from(table);
      expect(Number(row?.nullAccounts || 0)).toBe(0);
    }
  });
});
