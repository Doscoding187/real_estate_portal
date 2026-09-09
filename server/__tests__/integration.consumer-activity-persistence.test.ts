import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/mysql2';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import * as schema from '../../drizzle/schema';
import { favorites } from '../../drizzle/schema';
import { authorizeDatabaseOperation } from '../_core/databaseAuthority/authorization';
import {
  createAuthorityRuntimePool,
  createAuthoritySqlConnection,
  type AuthorityRuntimePool,
  type AuthoritySqlConnection,
} from '../_core/databaseAuthority/connectionAuthority';
import { resolveDatabaseAuthority } from '../_core/databaseAuthority/context';
import { SEARCH_TO_LEAD_SCENARIO_IDS } from '../_core/databaseAuthority/dataAdapters/searchToLeadScenario';
import {
  getUserRecentViewFacts,
  recordUserListingViewFactWithDatabase,
  setUserFavoriteFactWithDatabase,
} from '../db';
import {
  migrateGuestActivity,
  type GuestActivityMigrationDependencies,
} from '../guestMigrationRouter';
import { appRouter } from '../routers';
import {
  resolvePublicPropertyEligibility,
  resolvePublicPropertyEligibilities,
  resolvePublicPropertyEligibilitiesBySourceListingIds,
} from '../services/publicPropertyEligibilityService';

type Row = Record<string, unknown>;

const scenario = SEARCH_TO_LEAD_SCENARIO_IDS;
const describeDatabase = process.env.DATABASE_URL ? describe : describe.skip;

function rowsFrom(result: unknown): Row[] {
  const first = Array.isArray(result) ? result[0] : undefined;
  return Array.isArray(first) ? (first as Row[]) : [];
}

function insertIdFrom(result: unknown): number {
  const header = Array.isArray(result)
    ? (result[0] as { insertId?: unknown } | undefined)
    : undefined;
  const id = Number(header?.insertId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error('P1 fixture insert did not return an ID.');
  }
  return id;
}

function twoPartyBarrier() {
  let arrivals = 0;
  let release!: () => void;
  const open = new Promise<void>(resolve => {
    release = resolve;
  });

  return {
    async wait(): Promise<void> {
      arrivals += 1;
      if (arrivals === 2) release();
      await open;
    },
    arrivals: () => arrivals,
  };
}

/**
 * Only the application callback is delayed. Both independent pools have
 * already begun their real MySQL transactions when the gate releases, then
 * the unchanged application transaction body contends on its account lock.
 */
function databaseWithTransactionGate(database: any, gate: ReturnType<typeof twoPartyBarrier>) {
  return {
    transaction: async (run: (transaction: any) => Promise<unknown>) =>
      database.transaction(async (transaction: any) => {
        await gate.wait();
        return run(transaction);
      }),
  };
}

/**
 * Injects a deterministic later write failure into a real MySQL transaction.
 * The recent-view insert still reaches MySQL before the favorite insert throws,
 * so the assertion below proves the server transaction rolled it back.
 */
function databaseWithFavoriteWriteFailure(database: any) {
  return {
    transaction: async (run: (transaction: any) => Promise<unknown>) =>
      database.transaction(async (transaction: any) => {
        const failingTransaction = new Proxy(transaction, {
          get(target, property) {
            if (property === 'insert') {
              return (table: unknown) => {
                if (table === favorites) {
                  return {
                    values: async () => {
                      throw new Error('P1 injected favorite write failure');
                    },
                  };
                }
                return target.insert(table);
              };
            }
            const value = Reflect.get(target, property, target);
            return typeof value === 'function' ? value.bind(target) : value;
          },
        });
        return run(failingTransaction);
      }),
  };
}

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(complete => {
    resolve = complete;
  });
  return { promise, resolve };
}

describeDatabase('consumer activity physical persistence (P1)', () => {
  let fixtureConnection: AuthoritySqlConnection;
  let runtimePoolA: AuthorityRuntimePool;
  let runtimePoolB: AuthorityRuntimePool;
  let databaseA: any;
  let databaseB: any;
  let runtimeConnectionIds: number[] = [];
  const createdUserIds = new Set<number>();
  const duplicatePropertyIds = new Set<number>();

  async function query(statement: string, values: readonly unknown[] = []): Promise<Row[]> {
    return rowsFrom(await fixtureConnection.execute(statement, values));
  }

  async function createUser(label: string): Promise<number> {
    const suffix = randomUUID().replaceAll('-', '');
    const result = await fixtureConnection.execute(
      'INSERT INTO users (email, name) VALUES (?, ?)',
      [`p1-consumer-${label}-${suffix}@invalid.example`, `P1 consumer ${label}`],
    );
    const id = insertIdFrom(result);
    createdUserIds.add(id);
    return id;
  }

  async function inspectRuntimeConnections(
    pool: AuthorityRuntimePool,
    count: number,
  ): Promise<Array<{ connectionId: number; timeZone: string }>> {
    // Hold all leases while checking them so mysql2 must create distinct
    // physical sockets instead of immediately recycling one verified socket.
    const connections = await Promise.all(
      Array.from({ length: count }, () => pool.pool.getConnection()),
    );
    try {
      return await Promise.all(
        connections.map(async connection => {
          const [result] = await connection.query(
            'SELECT CONNECTION_ID() AS connection_id, @@session.time_zone AS session_time_zone',
          );
          const row = (result as Row[])[0] ?? {};
          return {
            connectionId: Number(row.connection_id),
            timeZone: String(row.session_time_zone),
          };
        }),
      );
    } finally {
      connections.forEach(connection => connection.release());
    }
  }

  function caller(userId: number) {
    return appRouter.createCaller({
      user: { id: userId, role: 'visitor' },
      req: { headers: {} },
      res: {},
      requestId: `p1-consumer-${userId}`,
    } as any);
  }

  beforeAll(async () => {
    const runtimeAuthority = resolveDatabaseAuthority({ operation: 'runtime-connect' });
    const runtimeDecision = authorizeDatabaseOperation(runtimeAuthority, { root: process.cwd() });
    runtimePoolA = await createAuthorityRuntimePool(runtimeAuthority, runtimeDecision);

    // A decision is single-use evidence, so independently authorize the
    // second separately-created runtime pool.
    const secondRuntimeAuthority = resolveDatabaseAuthority({ operation: 'runtime-connect' });
    const secondRuntimeDecision = authorizeDatabaseOperation(secondRuntimeAuthority, {
      root: process.cwd(),
    });
    runtimePoolB = await createAuthorityRuntimePool(secondRuntimeAuthority, secondRuntimeDecision);
    databaseA = drizzle(runtimePoolA.pool, { schema, mode: 'default' });
    databaseB = drizzle(runtimePoolB.pool, { schema, mode: 'default' });

    const fixtureAuthority = resolveDatabaseAuthority({ operation: 'test-fixture' });
    const fixtureDecision = authorizeDatabaseOperation(fixtureAuthority, { root: process.cwd() });
    fixtureConnection = await createAuthoritySqlConnection(fixtureAuthority, fixtureDecision);

    const [poolAConnections, poolBConnections] = await Promise.all([
      inspectRuntimeConnections(runtimePoolA, 2),
      inspectRuntimeConnections(runtimePoolB, 2),
    ]);
    const runtimeConnections = [...poolAConnections, ...poolBConnections];
    runtimeConnectionIds = runtimeConnections.map(connection => connection.connectionId);
    expect(runtimeConnections.map(connection => connection.timeZone)).toEqual([
      '+00:00',
      '+00:00',
      '+00:00',
      '+00:00',
    ]);
    expect(new Set(runtimeConnectionIds).size).toBe(runtimeConnectionIds.length);

    const [mapping] = await query(
      'SELECT id, sourceListingId FROM properties WHERE id = ? AND sourceListingId = ?',
      [scenario.property, scenario.agentListing],
    );
    expect(mapping).toMatchObject({
      id: scenario.property,
      sourceListingId: scenario.agentListing,
    });
    expect(scenario.property).not.toBe(scenario.agentListing);
  }, 30_000);

  afterEach(async () => {
    for (const userId of createdUserIds) {
      await fixtureConnection.execute('DELETE FROM favorites WHERE user_id = ?', [userId]);
      await fixtureConnection.execute('DELETE FROM recently_viewed WHERE userId = ?', [userId]);
    }
    for (const propertyId of duplicatePropertyIds) {
      await fixtureConnection.execute('DELETE FROM properties WHERE id = ?', [propertyId]);
    }
    for (const userId of createdUserIds) {
      await fixtureConnection.execute('DELETE FROM users WHERE id = ?', [userId]);
    }
    createdUserIds.clear();
    duplicatePropertyIds.clear();
  });

  afterAll(async () => {
    await Promise.allSettled([runtimePoolA?.end(), runtimePoolB?.end(), fixtureConnection?.end()]);
  });

  it('uses independently created UTC runtime sessions on every checked pool socket', () => {
    expect(runtimeConnectionIds).toHaveLength(4);
    expect(new Set(runtimeConnectionIds).size).toBe(4);
  });

  it('serializes identical saves into one authenticated user/property fact', async () => {
    const userId = await createUser('concurrent-save');
    const gate = twoPartyBarrier();

    const results = await Promise.all([
      setUserFavoriteFactWithDatabase(
        databaseWithTransactionGate(databaseA, gate),
        userId,
        scenario.property,
        true,
      ),
      setUserFavoriteFactWithDatabase(
        databaseWithTransactionGate(databaseB, gate),
        userId,
        scenario.property,
        true,
      ),
    ]);

    expect(gate.arrivals()).toBe(2);
    expect(results).toEqual([
      { propertyId: scenario.property, saved: true },
      { propertyId: scenario.property, saved: true },
    ]);
    const facts = await query(
      'SELECT user_id, property_id FROM favorites WHERE user_id = ? AND property_id = ?',
      [userId, scenario.property],
    );
    expect(facts).toEqual([{ user_id: userId, property_id: scenario.property }]);
  }, 20_000);

  it('serializes recent views, stores strict microsecond UTC recency, and returns committed order', async () => {
    const userId = await createUser('concurrent-view');
    const gate = twoPartyBarrier();

    const writes = await Promise.all([
      recordUserListingViewFactWithDatabase(
        databaseWithTransactionGate(databaseA, gate),
        userId,
        scenario.agentListing,
      ),
      recordUserListingViewFactWithDatabase(
        databaseWithTransactionGate(databaseB, gate),
        userId,
        scenario.agentListing,
      ),
    ]);

    expect(gate.arrivals()).toBe(2);
    const [precision] = await query(
      "SELECT DATETIME_PRECISION AS datetime_precision FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'recently_viewed' AND column_name = 'viewedAt'",
    );
    expect(Number(precision.datetime_precision)).toBe(6);
    const [stored] = await query(
      "SELECT id, DATE_FORMAT(viewedAt, '%Y-%m-%d %H:%i:%s.%f') AS viewed_at, TIMESTAMPDIFF(MICROSECOND, viewedAt, UTC_TIMESTAMP(6)) AS utc_age_microseconds FROM recently_viewed WHERE userId = ? AND listingId = ?",
      [userId, scenario.agentListing],
    );
    expect(stored).toBeDefined();
    expect(writes.map(write => write.viewedAt)).toContain(String(stored.viewed_at));
    expect(String(stored.viewed_at)).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/);
    expect(Math.abs(Number(stored.utc_age_microseconds))).toBeLessThanOrEqual(5_000_000);

    // No sleep: the order must survive rapid commits and a repeat view of an
    // existing fact, whose row ID deliberately does not change.
    const first = await recordUserListingViewFactWithDatabase(
      databaseA,
      userId,
      scenario.agentListing,
    );
    const second = await recordUserListingViewFactWithDatabase(
      databaseA,
      userId,
      scenario.agencyListing,
    );
    const third = await recordUserListingViewFactWithDatabase(
      databaseA,
      userId,
      scenario.agentListing,
    );
    expect(first.viewedAt < second.viewedAt).toBe(true);
    expect(second.viewedAt < third.viewedAt).toBe(true);
    const recency = await getUserRecentViewFacts(userId, 2);
    expect(recency.map(fact => Number(fact.listingId))).toEqual([
      scenario.agentListing,
      scenario.agencyListing,
    ]);

    // A preceding timestamp at or ahead of the database clock must not make
    // a later committed view sort backwards. This drives the allocator's
    // microsecond advancement branch with a valid canonical fact.
    await fixtureConnection.execute(
      'UPDATE recently_viewed SET viewedAt = DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 1 SECOND) WHERE userId = ? AND listingId = ?',
      [userId, scenario.agencyListing],
    );
    const [future] = await query(
      "SELECT DATE_FORMAT(viewedAt, '%Y-%m-%d %H:%i:%s.%f') AS viewed_at FROM recently_viewed WHERE userId = ? AND listingId = ?",
      [userId, scenario.agencyListing],
    );
    const afterFuture = await recordUserListingViewFactWithDatabase(
      databaseB,
      userId,
      scenario.agentListing,
    );
    expect(afterFuture.viewedAt > String(future.viewed_at)).toBe(true);
    expect((await getUserRecentViewFacts(userId, 2)).map(fact => Number(fact.listingId))).toEqual([
      scenario.agentListing,
      scenario.agencyListing,
    ]);
  }, 20_000);

  it('makes concurrent guest transfers idempotent and preserves newest-first guest history', async () => {
    const userId = await createUser('concurrent-guest-transfer');
    const gate = twoPartyBarrier();
    const resolvePublicProperties: NonNullable<
      GuestActivityMigrationDependencies['resolvePublicProperties']
    > = async propertyIds =>
      new Map(
        propertyIds.map(propertyId => [
          propertyId,
          {
            sourceListingId:
              propertyId === scenario.property ? scenario.agentListing : scenario.agencyListing,
            property: { id: propertyId, propertyType: 'house' },
          },
        ]),
      ) as any;

    const results = await Promise.all([
      migrateGuestActivity(
        {
          userId,
          viewedProperties: [scenario.property, scenario.agencyProperty],
          favoriteProperties: [scenario.property, scenario.agencyProperty],
        },
        {
          database: databaseWithTransactionGate(databaseA, gate),
          resolvePublicProperties,
        },
      ),
      migrateGuestActivity(
        {
          userId,
          viewedProperties: [scenario.property, scenario.agencyProperty],
          favoriteProperties: [scenario.property, scenario.agencyProperty],
        },
        {
          database: databaseWithTransactionGate(databaseB, gate),
          resolvePublicProperties,
        },
      ),
    ]);

    expect(gate.arrivals()).toBe(2);
    expect(results.reduce((total, result) => total + result.migratedViews, 0)).toBe(2);
    expect(results.reduce((total, result) => total + result.migratedFavorites, 0)).toBe(2);
    expect(
      (await getUserRecentViewFacts(userId, 2)).map(fact => Number(fact.listingId)),
    ).toEqual([scenario.agentListing, scenario.agencyListing]);
    expect(
      await query('SELECT id FROM favorites WHERE user_id = ? AND property_id IN (?, ?)', [
        userId,
        scenario.property,
        scenario.agencyProperty,
      ]),
    ).toHaveLength(2);
  }, 20_000);

  it('rolls back an earlier real write when a later guest-transfer write fails', async () => {
    const userId = await createUser('guest-transfer-rollback');
    const resolvePublicProperties: NonNullable<
      GuestActivityMigrationDependencies['resolvePublicProperties']
    > = async propertyIds =>
      new Map(
        propertyIds.map(propertyId => [
          propertyId,
          {
            sourceListingId: scenario.agentListing,
            property: { id: propertyId, propertyType: 'house' },
          },
        ]),
      ) as any;

    await expect(
      migrateGuestActivity(
        { userId, viewedProperties: [scenario.property], favoriteProperties: [scenario.property] },
        {
          database: databaseWithFavoriteWriteFailure(databaseA),
          resolvePublicProperties,
        },
      ),
    ).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });

    expect(
      await query('SELECT id FROM recently_viewed WHERE userId = ? AND listingId = ?', [
        userId,
        scenario.agentListing,
      ]),
    ).toEqual([]);
    expect(
      await query('SELECT id FROM favorites WHERE user_id = ? AND property_id = ?', [
        userId,
        scenario.property,
      ]),
    ).toEqual([]);
  });

  it('fails closed for an ambiguous projection and an unavailable projection', async () => {
    const duplicate = await fixtureConnection.execute(
      'INSERT INTO properties (title, description, propertyType, listingType, transactionType, price, area, address, city, province, status, featured, views, enquiries, ownerId, sourceListingId) SELECT CONCAT(title, ?), description, propertyType, listingType, transactionType, price, area, address, city, province, status, featured, views, enquiries, ownerId, sourceListingId FROM properties WHERE id = ?',
      [' P1 duplicate projection', scenario.property],
    );
    const duplicatePropertyId = insertIdFrom(duplicate);
    duplicatePropertyIds.add(duplicatePropertyId);

    const ambiguous = await resolvePublicPropertyEligibilitiesBySourceListingIds([
      scenario.agentListing,
    ]);
    expect(ambiguous.has(scenario.agentListing)).toBe(false);
    expect(await resolvePublicPropertyEligibility(scenario.unpublishedProperty)).toBeNull();
  });

  it('keeps an unavailable favorite removable and isolates another user from it', async () => {
    const ownerId = await createUser('owner');
    const unrelatedUserId = await createUser('unrelated');
    await setUserFavoriteFactWithDatabase(databaseA, ownerId, scenario.property, true);
    await recordUserListingViewFactWithDatabase(databaseA, ownerId, scenario.agentListing);

    // Prove account scoping while the owner can still read the public
    // inventory, rather than relying only on the later withdrawal filter.
    await expect(caller(ownerId).properties.getFavorites()).resolves.toHaveLength(1);
    await expect(caller(ownerId).properties.getRecentlyViewed()).resolves.toHaveLength(1);
    await expect(caller(unrelatedUserId).properties.getFavorites()).resolves.toEqual([]);
    await expect(caller(unrelatedUserId).properties.getRecentlyViewed()).resolves.toEqual([]);

    const [statusRow] = await query('SELECT status FROM properties WHERE id = ?', [
      scenario.property,
    ]);
    const originalStatus = String(statusRow.status);
    await fixtureConnection.execute('UPDATE properties SET status = ? WHERE id = ?', [
      'archived',
      scenario.property,
    ]);
    try {
      await expect(caller(unrelatedUserId).properties.getFavorites()).resolves.toEqual([]);
      await expect(caller(unrelatedUserId).properties.getRecentlyViewed()).resolves.toEqual([]);
      await caller(unrelatedUserId).properties.setFavorite({
        propertyId: scenario.property,
        saved: false,
      });
      expect(
        await query('SELECT id FROM favorites WHERE user_id = ? AND property_id = ?', [
          ownerId,
          scenario.property,
        ]),
      ).toHaveLength(1);
      await caller(ownerId).properties.setFavorite({ propertyId: scenario.property, saved: false });

      expect(
        await query('SELECT id FROM favorites WHERE user_id = ? AND property_id = ?', [
          ownerId,
          scenario.property,
        ]),
      ).toEqual([]);
      expect(
        await query('SELECT id FROM recently_viewed WHERE userId = ? AND listingId = ?', [
          ownerId,
          scenario.agentListing,
        ]),
      ).toHaveLength(1);
    } finally {
      await fixtureConnection.execute('UPDATE properties SET status = ? WHERE id = ?', [
        originalStatus,
        scenario.property,
      ]);
    }
  });

  it('leaves the save/remove race at the state of the command that committed last', async () => {
    const userId = await createUser('save-remove-race');
    const gate = twoPartyBarrier();
    const completionOrder: boolean[] = [];

    await Promise.all([
      setUserFavoriteFactWithDatabase(
        databaseWithTransactionGate(databaseA, gate),
        userId,
        scenario.property,
        true,
      ).then(result => completionOrder.push(result.saved)),
      setUserFavoriteFactWithDatabase(
        databaseWithTransactionGate(databaseB, gate),
        userId,
        scenario.property,
        false,
      ).then(result => completionOrder.push(result.saved)),
    ]);

    expect(gate.arrivals()).toBe(2);
    expect(completionOrder).toHaveLength(2);
    const facts = await query('SELECT id FROM favorites WHERE user_id = ? AND property_id = ?', [
      userId,
      scenario.property,
    ]);
    expect(facts.length === 1).toBe(completionOrder[1]);
  }, 20_000);

  it('retains a private view admitted before public withdrawal while public reads fail closed', async () => {
    const userId = await createUser('withdrawal-race');
    const admissionRead = createDeferred();
    const continueTransfer = createDeferred();
    const resolvePublicProperties: NonNullable<
      GuestActivityMigrationDependencies['resolvePublicProperties']
    > = async propertyIds => {
      const resolutions = await resolvePublicPropertyEligibilities(propertyIds);
      expect(resolutions.has(scenario.property)).toBe(true);
      admissionRead.resolve();
      await continueTransfer.promise;
      return resolutions;
    };

    const [statusRow] = await query('SELECT status FROM properties WHERE id = ?', [
      scenario.property,
    ]);
    const originalStatus = String(statusRow.status);
    const transfer = migrateGuestActivity(
      { userId, viewedProperties: [scenario.property] },
      { database: databaseA, resolvePublicProperties },
    );

    await admissionRead.promise;
    await fixtureConnection.execute('UPDATE properties SET status = ? WHERE id = ?', [
      'archived',
      scenario.property,
    ]);
    continueTransfer.resolve();
    try {
      await expect(transfer).resolves.toMatchObject({ migratedViews: 1, migratedFavorites: 0 });
      expect(
        await query('SELECT id FROM recently_viewed WHERE userId = ? AND listingId = ?', [
          userId,
          scenario.agentListing,
        ]),
      ).toHaveLength(1);
      expect(await resolvePublicPropertyEligibility(scenario.property)).toBeNull();
      await expect(caller(userId).properties.getRecentlyViewed()).resolves.toEqual([]);
    } finally {
      await fixtureConnection.execute('UPDATE properties SET status = ? WHERE id = ?', [
        originalStatus,
        scenario.property,
      ]);
    }
  });
});
