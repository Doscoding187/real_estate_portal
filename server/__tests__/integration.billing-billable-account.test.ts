import { describe, expect, it } from 'vitest';
import { count, eq } from 'drizzle-orm';
import { agencies, billableAccounts, developerOrganisations, users } from '../../drizzle/schema';
import { getDb } from '../db-connection';

const hasDb = Boolean(process.env.DATABASE_URL);
const describeWithDb: typeof describe = hasDb
  ? describe
  : (((name, fn) => describe.skip(`${name} (requires DATABASE_URL)`, fn)) as typeof describe);

describeWithDb('billing billable-account authority', () => {
  it('maps every current typed owner to exactly one central account', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [[userCount], [agencyCount], [developerCount], [accountCount]] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(agencies),
      db.select({ count: count() }).from(developerOrganisations),
      db.select({ count: count() }).from(billableAccounts),
    ]);

    expect(Number(accountCount.count)).toBe(
      Number(userCount.count) + Number(agencyCount.count) + Number(developerCount.count),
    );
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
});
