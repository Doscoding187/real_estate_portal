import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../../../drizzle/schema';
import { resolveDatabaseAuthority } from '../../_core/databaseAuthority/context';
import { authorizeDatabaseOperation } from '../../_core/databaseAuthority/authorization';
import {
  createAuthoritySqlConnection,
  type AuthoritySqlConnection,
} from '../../_core/databaseAuthority/connectionAuthority';
import { legalReleaseContentDigest } from '../legalAcceptancePolicy';
import { insertRegistrationWithLegalAcceptance } from '../registrationLegalAcceptanceService';

const runLocal = process.env.B15_LOCAL_DB_PROOF === '1';
describe.skipIf(!runLocal)('B15 canonical local transaction proof', () => {
  let connection: AuthoritySqlConnection;
  let db: MySql2Database<typeof schema>;
  const bundleId = 'synthetic-local-proof-only';
  const release = {
    formatVersion: 1 as const,
    bundleId,
    effectiveAt: '2026-01-01T00:00:00.000Z',
    terms: {
      version: 'test-terms-1',
      content: 'Synthetic Terms for local transaction proof only.',
    },
    privacy: {
      version: 'test-privacy-1',
      content: 'Synthetic Privacy Notice for local transaction proof only.',
    },
  };
  const choice = { bundleId, termsAccepted: true };
  const user = (label: string, role: schema.InsertUser['role'] = 'visitor') => ({
    email: `${label}@example.invalid`,
    name: 'Synthetic fixture',
    passwordHash: 'synthetic-no-login',
    loginMethod: 'email',
    role,
    emailVerified: 0,
    isSubaccount: 0,
  });

  async function clearOwnFixtures() {
    const emails = [
      'visitor',
      'agent',
      'agency_admin',
      'property_developer',
      'service_provider',
    ].map(role => `positive-${role}@example.invalid`);
    emails.push(
      'rollback-agent@example.invalid',
      'negative@example.invalid',
      'erasure@example.invalid',
      'privileged@example.invalid',
    );
    await db.transaction(async tx => {
      await tx
        .delete(schema.userLegalAcceptances)
        .where(eq(schema.userLegalAcceptances.bundleId, bundleId));
      await tx
        .delete(schema.legalActiveRelease)
        .where(eq(schema.legalActiveRelease.bundleId, bundleId));
      await tx.delete(schema.users).where(inArray(schema.users.email, emails));
      await tx.delete(schema.legalReleases).where(eq(schema.legalReleases.bundleId, bundleId));
    });
  }

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
      throw new Error('B15 proof requires its exact owned disposable target');
    connection = await createAuthoritySqlConnection(
      authority,
      authorizeDatabaseOperation(authority),
    );
    db = drizzle(connection as never, { schema, mode: 'default' });
    await clearOwnFixtures();
    await db.insert(schema.legalReleases).values({
      bundleId,
      formatVersion: 1,
      effectiveAt: release.effectiveAt,
      termsVersion: release.terms.version,
      termsContent: release.terms.content,
      privacyVersion: release.privacy.version,
      privacyContent: release.privacy.content,
      approvalReference: 'SYNTHETIC-LOCAL-TEST',
      approvalActor: 'Test fixture',
      approvedAt: release.effectiveAt,
      contentSha256: legalReleaseContentDigest(release),
    });
    await db
      .insert(schema.legalActiveRelease)
      .values({ purpose: 'account_registration', bundleId });
  });
  afterAll(async () => {
    try {
      if (db) await clearOwnFixtures();
    } finally {
      await connection?.end();
    }
  });

  it.each(['visitor', 'agent', 'agency_admin', 'property_developer', 'service_provider'] as const)(
    'commits %s with exact copy evidence',
    async role => {
      const before = new Date();
      const result = await db.transaction(tx =>
        insertRegistrationWithLegalAcceptance(
          tx,
          user(`positive-${role}`, role),
          choice,
          role === 'agent' ? { displayName: 'Synthetic Agent', phone: '+27000000000' } : undefined,
        ),
      );
      const [record] = await db
        .select()
        .from(schema.userLegalAcceptances)
        .where(eq(schema.userLegalAcceptances.id, result.evidenceId));
      expect(record).toMatchObject({
        userId: result.userId,
        bundleId,
        releaseContentSha256: legalReleaseContentDigest(release),
        source: 'account_registration',
      });
      expect(new Date(record.acceptedAt.replace(' ', 'T') + 'Z').getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      const [account] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, result.userId));
      expect(account.email).toBe(`positive-${role}@example.invalid`);
      if (role === 'agent') {
        const [agent] = await db
          .select()
          .from(schema.agents)
          .where(eq(schema.agents.userId, result.userId));
        expect(agent.status).toBe('pending');
      }
    },
  );

  it('rolls back both account and agent when actual evidence FK insertion fails', async () => {
    const fixtureUser = user('rollback-agent', 'agent');
    await expect(
      db.transaction(tx => {
        const failing = new Proxy(tx, {
          get(target, property) {
            if (property === 'insert')
              return (table: unknown) =>
                table === schema.userLegalAcceptances
                  ? {
                      values: (values: object) =>
                        target
                          .insert(schema.userLegalAcceptances)
                          .values({ ...values, userId: -1 } as never),
                    }
                  : target.insert(table as never);
            const value = Reflect.get(target, property);
            return typeof value === 'function' ? value.bind(target) : value;
          },
        });
        return insertRegistrationWithLegalAcceptance(failing, fixtureUser, choice, {
          displayName: 'Rollback Agent',
          phone: '+27000000000',
        });
      }),
    ).rejects.toThrow();
    expect(
      await db.select().from(schema.users).where(eq(schema.users.email, fixtureUser.email)),
    ).toHaveLength(0);
    expect(
      await db.select().from(schema.agents).where(eq(schema.agents.displayName, 'Rollback Agent')),
    ).toHaveLength(0);
  });

  it.each([
    undefined,
    { bundleId, termsAccepted: false },
    { bundleId: 'stale', termsAccepted: true },
    { ...choice, userId: 1 },
  ])('refuses invalid acceptance before any account write: %j', async input => {
    await expect(
      db.transaction(tx => insertRegistrationWithLegalAcceptance(tx, user('negative'), input)),
    ).rejects.toThrow();
    expect(
      await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, 'negative@example.invalid')),
    ).toHaveLength(0);
  });

  it('rejects a privileged role through the public registration transaction', async () => {
    await expect(
      db.transaction(tx =>
        insertRegistrationWithLegalAcceptance(tx, user('privileged', 'super_admin'), choice),
      ),
    ).rejects.toThrow('Invalid public registration identity');
    expect(
      await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, 'privileged@example.invalid')),
    ).toHaveLength(0);
  });

  it('erases user linkage without cascading evidence or losing referenced copy', async () => {
    const result = await db.transaction(tx =>
      insertRegistrationWithLegalAcceptance(tx, user('erasure'), choice),
    );
    await db.delete(schema.users).where(eq(schema.users.id, result.userId));
    const [record] = await db
      .select()
      .from(schema.userLegalAcceptances)
      .where(eq(schema.userLegalAcceptances.id, result.evidenceId));
    expect(record.userId).toBeNull();
    expect(record.bundleId).toBe(bundleId);
    await expect(
      db.delete(schema.legalReleases).where(eq(schema.legalReleases.bundleId, bundleId)),
    ).rejects.toThrow();
  });
});
