import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import { eq, inArray, sql } from 'drizzle-orm';
import * as schema from '../../../drizzle/schema';
import { resolveDatabaseAuthority } from '../../_core/databaseAuthority/context';
import { authorizeDatabaseOperation } from '../../_core/databaseAuthority/authorization';
import {
  createAuthoritySqlConnection,
  type AuthoritySqlConnection,
} from '../../_core/databaseAuthority/connectionAuthority';
import { legalReleaseContentDigest } from '../legalAcceptancePolicy';
import {
  findVerifiedRegistrationAccount,
  createRegistrationWithLegalAcceptance,
  insertRegistrationWithLegalAcceptance,
  validateCurrentLegalAcceptanceInTransaction,
} from '../registrationLegalAcceptanceService';

const runLocal = process.env.B15_LOCAL_DB_PROOF === '1';
describe.skipIf(!runLocal)('B15 canonical local transaction proof', () => {
  let connection: AuthoritySqlConnection;
  let db: MySql2Database<typeof schema>;
  let originalBundleId: string | undefined;
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
      'parallel@example.invalid',
      '  PARALLEL@example.invalid ',
      'parallel-one@example.invalid',
      'parallel-two@example.invalid',
    );
    await db.transaction(async tx => {
      await tx
        .delete(schema.userLegalAcceptances)
        .where(eq(schema.userLegalAcceptances.bundleId, bundleId));
      if (originalBundleId)
        await tx
          .update(schema.legalActiveRelease)
          .set({ bundleId: originalBundleId })
          .where(eq(schema.legalActiveRelease.bundleId, bundleId));
      else
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
    const [original] = await db
      .select()
      .from(schema.legalActiveRelease)
      .where(eq(schema.legalActiveRelease.purpose, 'account_registration'));
    originalBundleId = original?.bundleId;
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
      .values({ purpose: 'account_registration', bundleId })
      .onDuplicateKeyUpdate({ set: { bundleId } });
  });
  afterAll(async () => {
    try {
      if (db) await clearOwnFixtures();
    } finally {
      await connection?.end();
    }
  });

  it('holds the released copy stable against a publisher until acceptance commits', async () => {
    const authority = resolveDatabaseAuthority({
      operation: 'test-fixture',
      processEnv: { ...process.env, NODE_ENV: 'development', APP_ENV: 'development' },
    });
    if (
      authority.context.targetFingerprintHash !==
      '3d1259268441812f91c3ee04775defa67522ef1902bc72c3a97382fcf96d1bf4'
    )
      throw new Error('B15 locking proof requires its exact owned disposable target');
    const publisherConnection = await createAuthoritySqlConnection(
      authority,
      authorizeDatabaseOperation(authority),
    );
    const publisher = drizzle(publisherConnection as never, { schema, mode: 'default' });
    let release!: () => void;
    const continueAcceptance = new Promise<void>(resolve => {
      release = resolve;
    });
    let acquired!: () => void;
    let acquisitionFailed!: (error: unknown) => void;
    const locked = new Promise<void>((resolve, reject) => {
      acquired = resolve;
      acquisitionFailed = reject;
    });
    const acceptance = db.transaction(async tx => {
      try {
        await validateCurrentLegalAcceptanceInTransaction(tx, choice);
        acquired();
        await continueAcceptance;
      } catch (error) {
        acquisitionFailed(error);
        throw error;
      }
    });
    void acceptance.catch(() => undefined);
    const publisherLock = () =>
      publisher.transaction(tx =>
        tx
          .select()
          .from(schema.legalActiveRelease)
          .where(eq(schema.legalActiveRelease.purpose, 'account_registration'))
          .for('update', { noWait: true }),
      );
    try {
      await locked;
      await expect(publisherLock()).rejects.toMatchObject({ cause: { errno: 3572 } });
      release();
      await acceptance;
      await expect(publisherLock()).resolves.toMatchObject([{ bundleId }]);
    } finally {
      release();
      try {
        await acceptance;
      } finally {
        await publisherConnection.end();
      }
    }
  });

  it('serializes normalized duplicate registrations while keeping evidence atomic', async () => {
    let release!: () => void;
    const commit = new Promise<void>(resolve => {
      release = resolve;
    });
    let inserted!: () => void;
    let insertionFailed!: (error: unknown) => void;
    const ready = new Promise<void>((resolve, reject) => {
      inserted = resolve;
      insertionFailed = reject;
    });
    const first = db.transaction(async tx => {
      const result = await insertRegistrationWithLegalAcceptance(
        tx,
        { ...user('parallel'), email: '  PARALLEL@example.invalid ' },
        choice,
      );
      inserted();
      await commit;
      return result;
    });
    void first.catch(insertionFailed);
    try {
      await ready;
      const second = createRegistrationWithLegalAcceptance(user('parallel'), choice);
      // Keep the first row uncommitted while the independent runtime connection
      // attempts the same normalized identity. A legal-copy shared lock alone
      // permits a second account to be inserted against the non-unique index.
      void second.catch(() => undefined);
      await new Promise(resolve => setTimeout(resolve, 100));
      release();
      const results = await Promise.allSettled([first, second]);
      expect(results[0].status).toBe('fulfilled');
      expect(results[1]).toMatchObject({
        status: 'rejected',
        reason: { message: 'User with this email already exists' },
      });
      const accounts = await db
        .select()
        .from(schema.users)
        .where(sql`LOWER(TRIM(${schema.users.email})) = ${'parallel@example.invalid'}`);
      expect(accounts).toHaveLength(1);
      expect(accounts[0].email).toBe('parallel@example.invalid');
      const evidence = await db
        .select()
        .from(schema.userLegalAcceptances)
        .where(eq(schema.userLegalAcceptances.userId, accounts[0].id));
      expect(evidence).toHaveLength(1);
    } finally {
      release();
      await first.catch(() => undefined);
    }
  });

  it('commits independent registrations contending for the same email-index gap', async () => {
    const results = await Promise.all([
      createRegistrationWithLegalAcceptance(user('parallel-one'), choice),
      createRegistrationWithLegalAcceptance(user('parallel-two'), choice),
    ]);
    expect(new Set(results.map(result => result.userId)).size).toBe(2);
    for (const result of results) {
      expect(
        await db
          .select()
          .from(schema.userLegalAcceptances)
          .where(eq(schema.userLegalAcceptances.id, result.evidenceId)),
      ).toHaveLength(1);
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

  it('allows administrative attachment only for verified accounts with matching recorded copy', async () => {
    const email = 'positive-visitor@example.invalid';
    const [account] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    expect(await findVerifiedRegistrationAccount(db, email)).toBeUndefined();
    await db.update(schema.users).set({ emailVerified: 1 }).where(eq(schema.users.id, account.id));
    expect(await findVerifiedRegistrationAccount(db, email, account.id)).toBe(account.id);
    expect(await findVerifiedRegistrationAccount(db, email, account.id + 100000)).toBeUndefined();
    const [evidence] = await db
      .select()
      .from(schema.userLegalAcceptances)
      .where(eq(schema.userLegalAcceptances.userId, account.id));
    await db
      .update(schema.userLegalAcceptances)
      .set({ termsSha256: '0'.repeat(64) })
      .where(eq(schema.userLegalAcceptances.id, evidence.id));
    expect(await findVerifiedRegistrationAccount(db, email)).toBeUndefined();
    await db
      .update(schema.userLegalAcceptances)
      .set({ termsSha256: evidence.termsSha256 })
      .where(eq(schema.userLegalAcceptances.id, evidence.id));
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
