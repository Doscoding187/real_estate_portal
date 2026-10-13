import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import { and, eq, inArray } from 'drizzle-orm';
import * as schema from '../../../drizzle/schema';
import { resolveDatabaseAuthority } from '../../_core/databaseAuthority/context';
import { authorizeDatabaseOperation } from '../../_core/databaseAuthority/authorization';
import {
  createAuthoritySqlConnection,
  type AuthoritySqlConnection,
} from '../../_core/databaseAuthority/connectionAuthority';
import { CANONICAL_AGENT_LAUNCH_ACCESS } from '../../_core/databaseAuthority/dataAdapters/canonicalCommercial';
import { initializeCommercialActivationPolicy } from '../commercialActivationPolicy';
import { legalReleaseContentDigest } from '../legalAcceptancePolicy';
import { requestPaidLaunchAccessInvoice } from '../billingFoundationService';

// Only the dependency is injected. All runtime queries and transactions execute
// on the exact authority-owned disposable schema through its authorized connection.
const fixture = vi.hoisted(() => ({ db: undefined as MySql2Database<typeof schema> | undefined }));
vi.mock('../../db', async importOriginal => ({
  ...(await importOriginal<typeof import('../../db')>()),
  getDb: async () => fixture.db,
}));

describe.skipIf(process.env.B15_LOCAL_DB_PROOF !== '1')(
  'paid commitment canonical local transaction proof',
  () => {
    let connection: AuthoritySqlConnection;
    let db: MySql2Database<typeof schema>;
    let planId: number;
    const userIds: number[] = [];
    const bundleId = 'synthetic-paid-local-proof-only';
    const content = {
      formatVersion: 1 as const,
      bundleId,
      effectiveAt: '2026-01-01T00:00:00.000Z',
      terms: { version: 'test-paid-terms', content: 'Synthetic local purchase Terms only.' },
      privacy: { version: 'test-paid-privacy', content: 'Synthetic local notice only.' },
    };
    const choice = {
      bundleId,
      termsAccepted: true,
      purchaseAccepted: true,
      quote: { planId: 0, amountDue: 49900, currency: 'ZAR' },
    };

    beforeAll(async () => {
      const authority = resolveDatabaseAuthority({
        operation: 'test-fixture',
        processEnv: { ...process.env, NODE_ENV: 'development', APP_ENV: 'development' },
      });
      if (
        authority.context.targetClass !== 'disposable-worktree' ||
        authority.context.targetFingerprintHash !==
          '3d1259268441812f91c3ee04775defa67522ef1902bc72c3a97382fcf96d1bf4'
      )
        throw new Error('Paid proof requires its exact owned disposable target');
      connection = await createAuthoritySqlConnection(
        authority,
        authorizeDatabaseOperation(authority),
      );
      db = drizzle(connection as never, { schema, mode: 'default' });
      fixture.db = db;
      await db.insert(schema.legalReleases).values({
        bundleId,
        formatVersion: 1,
        effectiveAt: content.effectiveAt,
        termsVersion: content.terms.version,
        termsContent: content.terms.content,
        privacyVersion: content.privacy.version,
        privacyContent: content.privacy.content,
        approvalReference: 'SYNTHETIC-LOCAL-TEST',
        approvalActor: 'Test fixture',
        approvedAt: content.effectiveAt,
        contentSha256: legalReleaseContentDigest(content),
      });
      await db
        .insert(schema.legalActiveRelease)
        .values({ purpose: 'account_registration', bundleId });
      const [plan] = await db.insert(schema.plans).values({
        ...CANONICAL_AGENT_LAUNCH_ACCESS,
        metadata: { ...CANONICAL_AGENT_LAUNCH_ACCESS.metadata },
        features: JSON.stringify(CANONICAL_AGENT_LAUNCH_ACCESS.features),
        limits: JSON.stringify(CANONICAL_AGENT_LAUNCH_ACCESS.limits),
      });
      planId = Number(plan.insertId);
      choice.quote.planId = planId;
      vi.stubEnv('APP_ENV', 'test');
      vi.stubEnv('BILLING_EFT_ACCOUNT_NAME', 'LOCAL SYNTHETIC ACCOUNT - NOT PAYABLE');
      vi.stubEnv('BILLING_EFT_BANK_NAME', 'Local Test Bank');
      vi.stubEnv('BILLING_EFT_BRANCH_CODE', '000000');
      vi.stubEnv('BILLING_EFT_ACCOUNT_NUMBER', '0000000000');
      vi.stubEnv('PAID_MVP_SALES_PAUSED', 'false');
      initializeCommercialActivationPolicy();
    });
    afterAll(async () => {
      try {
        if (db && userIds.length) {
          const accounts = await db
            .select()
            .from(schema.billableAccounts)
            .where(inArray(schema.billableAccounts.userId, userIds));
          const accountIds = accounts.map(account => account.id);
          if (accountIds.length) {
            await db
              .delete(schema.billingAuditEvents)
              .where(inArray(schema.billingAuditEvents.billableAccountId, accountIds));
            await db
              .delete(schema.billingInvoices)
              .where(inArray(schema.billingInvoices.billableAccountId, accountIds));
            await db
              .delete(schema.subscriptions)
              .where(inArray(schema.subscriptions.billableAccountId, accountIds));
          }
          await db
            .delete(schema.notifications)
            .where(inArray(schema.notifications.userId, userIds));
          await db.delete(schema.users).where(inArray(schema.users.id, userIds));
        }
        if (db) {
          if (planId) await db.delete(schema.plans).where(eq(schema.plans.id, planId));
          await db
            .delete(schema.legalActiveRelease)
            .where(eq(schema.legalActiveRelease.bundleId, bundleId));
          await db.delete(schema.legalReleases).where(eq(schema.legalReleases.bundleId, bundleId));
        }
      } finally {
        fixture.db = undefined;
        vi.unstubAllEnvs();
        await connection?.end();
      }
    });
    async function account() {
      const [row] = await db.insert(schema.users).values({
        email: `paid-${randomUUID()}@example.invalid`,
        name: 'Synthetic existing Agent',
        role: 'agent',
        emailVerified: 1,
      });
      const id = Number(row.insertId);
      userIds.push(id);
      return { id, role: 'agent' as const };
    }
    const commitments = (userId: number) =>
      db
        .select()
        .from(schema.billingAuditEvents)
        .where(
          and(
            eq(schema.billingAuditEvents.actorUserId, userId),
            eq(schema.billingAuditEvents.eventType, 'invoice_commitment_accepted'),
          ),
        );

    it('records exact released copy and server-owned commercial facts for an existing account', async () => {
      const user = await account();
      const before = new Date();
      const result = await requestPaidLaunchAccessInvoice({
        user,
        planId,
        legalAcceptance: choice,
      });
      const [event] = await commitments(user.id);
      expect(event).toMatchObject({ invoiceId: result.invoice.id, actorUserId: user.id });
      expect(event.afterData).toMatchObject({
        bundleId,
        source: 'paid_access_invoice_request',
        releaseContentSha256: legalReleaseContentDigest(content),
        termsVersion: content.terms.version,
        privacyNoticeVersion: content.privacy.version,
        amountDue: 49900,
        currency: 'ZAR',
        durationDays: 90,
        autoRenews: false,
        purchaseAccepted: true,
        termsAccepted: true,
      });
      expect(
        Date.parse((event.afterData as { acceptedAt: string }).acceptedAt),
      ).toBeGreaterThanOrEqual(before.getTime());
      expect(
        await db
          .select()
          .from(schema.userLegalAcceptances)
          .where(eq(schema.userLegalAcceptances.userId, user.id)),
      ).toHaveLength(0);
    });
    it.each([
      undefined,
      { ...choice, termsAccepted: false },
      { ...choice, purchaseAccepted: false },
      { ...choice, bundleId: 'stale' },
      { ...choice, amountDue: 1 },
      { ...choice, acceptedAt: '2020-01-01' },
    ])(
      'rejects missing, stale or forged choice without committing billing state (%j)',
      async legalAcceptance => {
        const user = await account();
        await expect(
          requestPaidLaunchAccessInvoice({ user, planId, legalAcceptance }),
        ).rejects.toThrow();
        expect(await commitments(user.id)).toHaveLength(0);
        expect(
          await db
            .select()
            .from(schema.billableAccounts)
            .where(eq(schema.billableAccounts.userId, user.id)),
        ).toHaveLength(0);
      },
    );
    it('reuses the invoice and records a fresh explicit commitment without altering earlier evidence', async () => {
      const user = await account();
      const first = await requestPaidLaunchAccessInvoice({ user, planId, legalAcceptance: choice });
      const original = await commitments(user.id);
      const second = await requestPaidLaunchAccessInvoice({
        user,
        planId,
        legalAcceptance: choice,
      });
      expect(second.reused).toBe(true);
      expect(second.invoice.id).toBe(first.invoice.id);
      const events = await commitments(user.id);
      expect(events).toHaveLength(2);
      expect(events.find(event => event.id === original[0].id)).toEqual(original[0]);
    });
    it('rejects a stale displayed price before committing an invoice', async () => {
      const user = await account();
      await expect(
        requestPaidLaunchAccessInvoice({
          user,
          planId,
          legalAcceptance: { ...choice, quote: { ...choice.quote, amountDue: 1 } },
        }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(await commitments(user.id)).toHaveLength(0);
      expect(
        await db
          .select()
          .from(schema.billableAccounts)
          .where(eq(schema.billableAccounts.userId, user.id)),
      ).toHaveLength(0);
    });
    it('rolls back invoice and subscription when acceptance journal insertion violates its real FK', async () => {
      const user = await account();
      fixture.db = new Proxy(db, {
        get(target, property) {
          if (property === 'transaction')
            return (body: Parameters<typeof db.transaction>[0]) =>
              target.transaction(tx => {
                const poisoned = new Proxy(tx, {
                  get(transaction, key) {
                    if (key === 'insert')
                      return (table: unknown) =>
                        table === schema.billingAuditEvents
                          ? {
                              values: (value: typeof schema.billingAuditEvents.$inferInsert) =>
                                transaction
                                  .insert(schema.billingAuditEvents)
                                  .values(
                                    value.eventType === 'invoice_commitment_accepted'
                                      ? { ...value, actorUserId: -1 }
                                      : value,
                                  ),
                            }
                          : transaction.insert(table as never);
                    const value = Reflect.get(transaction, key);
                    return typeof value === 'function' ? value.bind(transaction) : value;
                  },
                });
                return body(poisoned);
              });
          const value = Reflect.get(target, property);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
      try {
        await expect(
          requestPaidLaunchAccessInvoice({ user, planId, legalAcceptance: choice }),
        ).rejects.toThrow();
      } finally {
        fixture.db = db;
      }
      expect(await commitments(user.id)).toHaveLength(0);
      expect(
        await db
          .select()
          .from(schema.billingInvoices)
          .where(eq(schema.billingInvoices.createdBy, user.id)),
      ).toHaveLength(0);
      expect(
        await db
          .select()
          .from(schema.billableAccounts)
          .where(eq(schema.billableAccounts.userId, user.id)),
      ).toHaveLength(0);
    });
  },
);
