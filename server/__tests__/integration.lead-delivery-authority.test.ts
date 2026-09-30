import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import * as schema from '../../drizzle/schema';
import { leadActivities, leads } from '../../drizzle/schema';
import { authorizeDatabaseOperation } from '../_core/databaseAuthority/authorization';
import {
  createAuthorityRuntimePool,
  createAuthoritySqlConnection,
  type AuthorityRuntimePool,
  type AuthoritySqlConnection,
} from '../_core/databaseAuthority/connectionAuthority';
import { resolveDatabaseAuthority } from '../_core/databaseAuthority/context';
import { appRouter } from '../routers';
import {
  appendLeadDeliveryRetryAttempt,
  claimLeadDeliveryAttempt,
  createLeadDeliveryInTransaction,
  getLeadDeliverySnapshot,
  recordInitialLeadDelivery,
  recoverExpiredLeadDeliveryAttempts,
  runLeadDeliveryWorker,
  supersedePrimaryDeliveryInTransaction,
  toMySqlDateTime,
  updateLeadDeliveryAttempt,
  type CreateLeadDeliveryInput,
} from '../services/leadDeliveryService';

type Row = Record<string, unknown>;

const describeDatabase = process.env.DATABASE_URL ? describe : describe.skip;

function rowsFrom(result: unknown): Row[] {
  const first = Array.isArray(result) ? result[0] : undefined;
  return Array.isArray(first) ? (first as Row[]) : [];
}

function insertIdFrom(result: unknown, label: string): number {
  const header = Array.isArray(result)
    ? (result[0] as { insertId?: unknown } | undefined)
    : undefined;
  const id = Number(header?.insertId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`P2 ${label} insert did not return a durable identifier.`);
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
    async wait() {
      arrivals += 1;
      if (arrivals === 2) release();
      await open;
    },
    arrivals: () => arrivals,
  };
}

/** Both transactions begin before their claim bodies contend on the row lock. */
function databaseWithTransactionGate(database: any, gate: ReturnType<typeof twoPartyBarrier>) {
  return {
    transaction: async (run: (transaction: any) => Promise<unknown>) =>
      database.transaction(async (transaction: any) => {
        await gate.wait();
        return run(transaction);
      }),
  };
}

function primaryDeliveryInput(leadId: number, overrides: Partial<CreateLeadDeliveryInput> = {}) {
  return {
    leadId,
    idempotencyKey: `p2-primary:${leadId}:${randomUUID()}`,
    channel: 'email' as const,
    recipientType: 'manual' as const,
    supplyOrigin: 'platform_curated' as const,
    leadCustody: 'attention_required' as const,
    initialStatus: 'pending' as const,
    ...overrides,
  } satisfies CreateLeadDeliveryInput;
}

describeDatabase('relational lead delivery authority (P2)', () => {
  let fixtureConnection: AuthoritySqlConnection;
  let runtimePoolA: AuthorityRuntimePool;
  let runtimePoolB: AuthorityRuntimePool;
  let databaseA: any;
  let databaseB: any;
  const createdLeadIds = new Set<number>();
  const createdUserIds = new Set<number>();

  async function query(statement: string, values: readonly unknown[] = []): Promise<Row[]> {
    return rowsFrom(await fixtureConnection.execute(statement, values));
  }

  async function createLead(label: string): Promise<number> {
    const suffix = randomUUID().replaceAll('-', '');
    const result = await fixtureConnection.execute(
      'INSERT INTO leads (name, email, capture_request_id, lead_delivery_method, delivery_status) VALUES (?, ?, ?, ?, ?)',
      [
        `P2 ${label}`,
        `p2-${label}-${suffix}@invalid.example`,
        `p2-${label}-${suffix}`,
        'manual',
        'pending',
      ],
    );
    const id = insertIdFrom(result, 'lead');
    createdLeadIds.add(id);
    return id;
  }

  async function createUser(
    label: string,
    role: 'visitor' | 'super_admin' = 'visitor',
  ): Promise<number> {
    const suffix = randomUUID().replaceAll('-', '');
    const result = await fixtureConnection.execute(
      'INSERT INTO users (name, email, role, emailVerified) VALUES (?, ?, ?, ?)',
      [`P2 ${label}`, `p2-${label}-${suffix}@invalid.example`, role, 1],
    );
    const id = insertIdFrom(result, 'user');
    createdUserIds.add(id);
    return id;
  }

  beforeAll(async () => {
    const runtimeAuthorityA = resolveDatabaseAuthority({ operation: 'runtime-connect' });
    const runtimeDecisionA = authorizeDatabaseOperation(runtimeAuthorityA, { root: process.cwd() });
    runtimePoolA = await createAuthorityRuntimePool(runtimeAuthorityA, runtimeDecisionA);

    const runtimeAuthorityB = resolveDatabaseAuthority({ operation: 'runtime-connect' });
    const runtimeDecisionB = authorizeDatabaseOperation(runtimeAuthorityB, { root: process.cwd() });
    runtimePoolB = await createAuthorityRuntimePool(runtimeAuthorityB, runtimeDecisionB);
    databaseA = drizzle(runtimePoolA.pool, { schema, mode: 'default' });
    databaseB = drizzle(runtimePoolB.pool, { schema, mode: 'default' });

    const fixtureAuthority = resolveDatabaseAuthority({ operation: 'test-fixture' });
    const fixtureDecision = authorizeDatabaseOperation(fixtureAuthority, { root: process.cwd() });
    fixtureConnection = await createAuthoritySqlConnection(fixtureAuthority, fixtureDecision);
  }, 30_000);

  afterEach(async () => {
    for (const leadId of createdLeadIds) {
      // Both relational tables cascade from the lead. Deleting the root also
      // proves test cleanup never leaves cross-test delivery evidence behind.
      await fixtureConnection.execute('DELETE FROM leads WHERE id = ?', [leadId]);
    }
    for (const userId of createdUserIds) {
      await fixtureConnection.execute('DELETE FROM users WHERE id = ?', [userId]);
    }
    createdLeadIds.clear();
    createdUserIds.clear();
  });

  afterAll(async () => {
    await Promise.allSettled([runtimePoolA?.end(), runtimePoolB?.end(), fixtureConnection?.end()]);
  });

  it('allows one durable claim and one provider invocation when two independent workers race', async () => {
    const leadId = await createLead('claim-race');
    const delivery = await recordInitialLeadDelivery({
      ...primaryDeliveryInput(leadId),
      database: databaseA,
    });
    const gate = twoPartyBarrier();

    const claims = await Promise.all([
      claimLeadDeliveryAttempt({
        database: databaseWithTransactionGate(databaseA, gate),
        deliveryId: delivery.delivery.id,
      }),
      claimLeadDeliveryAttempt({
        database: databaseWithTransactionGate(databaseB, gate),
        deliveryId: delivery.delivery.id,
      }),
    ]);
    const winner = claims.filter((claim): claim is NonNullable<typeof claim> => claim !== null);
    expect(gate.arrivals()).toBe(2);
    expect(winner).toHaveLength(1);

    const invokeProvider = async () => ({ status: 'delivered' as const, providerReference: 'p2-race-provider-1' });
    const providerResults = await Promise.all(winner.map(invokeProvider));
    expect(providerResults).toHaveLength(1);

    const claim = winner[0]!;
    const completed = await updateLeadDeliveryAttempt({
      database: databaseA,
      deliveryId: delivery.delivery.id,
      attemptId: claim.id,
      leaseToken: claim.leaseToken,
      routingRevision: claim.routingRevision,
      status: 'delivered',
      providerReference: providerResults[0]!.providerReference,
    });
    expect(completed).toMatchObject({ status: 'delivered', state: 'completed' });

    const rows = await query(
      'SELECT state, COUNT(*) AS count_value FROM lead_delivery_attempts WHERE delivery_id = ? GROUP BY state',
      [delivery.delivery.id],
    );
    expect(rows).toEqual([{ state: 'completed', count_value: 1 }]);
  }, 20_000);

  it('rolls back the lead and its required delivery obligation together when capture persistence fails', async () => {
    const captureRequestId = `p2-rollback-${randomUUID()}`;
    await expect(
      databaseA.transaction(async (tx: any) => {
        const [insert] = await tx.insert(leads).values({
          name: 'P2 rollback capture',
          email: `${captureRequestId}@invalid.example`,
          captureRequestId,
          leadDeliveryMethod: 'manual',
          deliveryStatus: 'pending',
        });
        const leadId = Number(insert.insertId);
        await createLeadDeliveryInTransaction(tx, primaryDeliveryInput(leadId));
        throw new Error('P2 injected post-delivery capture failure');
      }),
    ).rejects.toThrow('P2 injected post-delivery capture failure');

    const leadsAfterRollback = await query('SELECT id FROM leads WHERE capture_request_id = ?', [captureRequestId]);
    const deliveriesAfterRollback = await query(
      'SELECT d.id FROM lead_deliveries d JOIN leads l ON l.id = d.lead_id WHERE l.capture_request_id = ?',
      [captureRequestId],
    );
    expect(leadsAfterRollback).toEqual([]);
    expect(deliveriesAfterRollback).toEqual([]);
  });

  it('keeps a post-capture queued obligation discoverable after the creating process is gone', async () => {
    const leadId = await createLead('queued-restart');
    const recorded = await recordInitialLeadDelivery({
      ...primaryDeliveryInput(leadId),
      database: databaseA,
    });

    // Read through a separately-created runtime pool: this is the state a
    // restarted worker sees after capture committed and before any claim.
    const snapshot = await getLeadDeliverySnapshot({ leadId, database: databaseB });
    expect(snapshot.current).toMatchObject({ id: recorded.delivery.id, state: 'queued' });
    expect(snapshot.attempts).toEqual([]);
  });

  it('quarantines an expired claim with unknown provider outcome and fences stale completion', async () => {
    const leadId = await createLead('lease-recovery');
    const recorded = await recordInitialLeadDelivery({
      ...primaryDeliveryInput(leadId),
      database: databaseA,
    });
    const firstClaim = await claimLeadDeliveryAttempt({
      database: databaseA,
      deliveryId: recorded.delivery.id,
      leaseTimeoutMs: 1_000,
    });
    expect(firstClaim).not.toBeNull();

    const recovery = await recoverExpiredLeadDeliveryAttempts({
      database: databaseB,
      now: new Date(Date.now() + 2_000),
    });
    expect(recovery).toMatchObject({ recovered: 1, unknown: 1 });

    const secondClaim = await claimLeadDeliveryAttempt({
      database: databaseB,
      deliveryId: recorded.delivery.id,
    });
    expect(secondClaim).toBeNull();

    await expect(
      updateLeadDeliveryAttempt({
        database: databaseA,
        deliveryId: recorded.delivery.id,
        attemptId: firstClaim!.id,
        leaseToken: firstClaim!.leaseToken,
        routingRevision: firstClaim!.routingRevision,
        status: 'delivered',
      }),
    ).resolves.toBeNull();

    const snapshot = await getLeadDeliverySnapshot({ leadId, database: databaseA });
    expect(snapshot.current?.state).toBe('unknown');
    expect(snapshot.attempts.map(attempt => attempt.state)).toEqual(['unknown']);
    await expect(appendLeadDeliveryRetryAttempt({ database: databaseB, deliveryId: recorded.delivery.id })).resolves.toBeNull();
  });

  it('records an ambiguous provider crash as unknown and does not auto-retry it', async () => {
    const leadId = await createLead('unknown-provider');
    const recorded = await recordInitialLeadDelivery({
      ...primaryDeliveryInput(leadId),
      database: databaseA,
    });

    const worker = await runLeadDeliveryWorker({
      database: databaseB,
      limit: 10,
      leadId,
      dispatcher: async () => {
        throw new Error('provider connection ended after request acceptance became unknowable');
      },
    });
    expect(worker).toMatchObject({ claimed: 1, unknown: 1 });
    const snapshot = await getLeadDeliverySnapshot({ leadId, database: databaseA });
    expect(snapshot.current).toMatchObject({ id: recorded.delivery.id, state: 'unknown' });
    expect(snapshot.attempts.at(-1)).toMatchObject({ state: 'unknown', status: 'attention_required' });
    await expect(
      appendLeadDeliveryRetryAttempt({ database: databaseA, deliveryId: recorded.delivery.id }),
    ).resolves.toBeNull();
  });

  it('surfaces a failed platform delivery and allows audited idempotent operator recovery', async () => {
    const leadId = await createLead('operator-recovery');
    const operatorId = await createUser('operations', 'super_admin');
    const recorded = await recordInitialLeadDelivery({
      ...primaryDeliveryInput(leadId, {
        idempotencyKey: `p2-operator-recovery:${leadId}:${randomUUID()}`,
        channel: 'manual',
        recipientType: 'manual',
        supplyOrigin: 'platform_curated',
        leadCustody: 'platform_managed',
        initialStatus: 'pending',
      }),
      database: databaseA,
    });

    const worker = await runLeadDeliveryWorker({
      database: databaseB,
      leadId,
      dispatcher: async () => {
        throw new Error('simulated worker interruption before provider outcome was known');
      },
    });
    expect(worker).toMatchObject({ claimed: 1, unknown: 1, recovered: 0 });

    const operator = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: operatorId, role: 'super_admin' },
    } as any);
    const auditBefore = await operator.system.leadRoutingAudit({ days: 1, attentionLimit: 50 });
    expect(auditBefore.attentionLeads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: leadId,
          recipientType: 'platform',
          issue: 'platform_custody_review',
        }),
      ]),
    );
    const queueBefore = await operator.superAdminPublisher.getPlatformManagedLeads({
      limit: 50,
      offset: 0,
    });
    expect(queueBefore.items.some(lead => Number(lead.id) === leadId)).toBe(true);

    const recovered = await operator.system.completePlatformLeadAction({
      leadId,
      action: 'contacted',
      note: 'Operations reached the prospect using the monitored custody queue.',
    });
    expect(recovered).toMatchObject({
      id: leadId,
      action: 'contacted',
      status: 'contacted',
      deliveryStatus: 'delivered',
      duplicate: false,
    });

    const replay = await operator.system.completePlatformLeadAction({
      leadId,
      action: 'contacted',
      note: 'A repeated operator request must not create another completion.',
    });
    expect(replay).toMatchObject({
      id: leadId,
      deliveryStatus: 'delivered',
      duplicate: true,
    });

    const snapshot = await getLeadDeliverySnapshot({ leadId, database: databaseA });
    expect(snapshot.current).toMatchObject({ id: recorded.delivery.id, state: 'completed' });
    expect(snapshot.attempts.map(attempt => attempt.state)).toEqual(['unknown', 'completed']);
    const activities = await databaseA
      .select()
      .from(leadActivities)
      .where(eq(leadActivities.leadId, leadId));
    expect(activities).toHaveLength(1);
    expect(activities[0]?.description).toContain('monitored custody queue');

    const auditAfter = await operator.system.leadRoutingAudit({ days: 1, attentionLimit: 50 });
    expect(auditAfter.attentionLeads.some(lead => Number(lead.id) === leadId)).toBe(false);
    const queueAfter = await operator.superAdminPublisher.getPlatformManagedLeads({
      limit: 50,
      offset: 0,
    });
    expect(queueAfter.items.some(lead => Number(lead.id) === leadId)).toBe(false);
  });

  it('keeps expired-claim recovery inside the worker lead scope', async () => {
    const scopedLeadId = await createLead('scoped-worker');
    const unrelatedLeadId = await createLead('unrelated-expired-claim');
    const scopedDelivery = await recordInitialLeadDelivery({
      ...primaryDeliveryInput(scopedLeadId),
      database: databaseA,
    });
    const unrelatedDelivery = await recordInitialLeadDelivery({
      ...primaryDeliveryInput(unrelatedLeadId),
      database: databaseA,
    });
    const unrelatedClaim = await claimLeadDeliveryAttempt({
      database: databaseA,
      deliveryId: unrelatedDelivery.delivery.id,
    });
    expect(unrelatedClaim).not.toBeNull();
    await databaseA
      .update(schema.leadDeliveryAttempts)
      .set({ leaseExpiresAt: toMySqlDateTime(new Date(Date.now() - 60_000)) } as any)
      .where(eq(schema.leadDeliveryAttempts.id, unrelatedClaim!.id));

    const worker = await runLeadDeliveryWorker({
      database: databaseB,
      leadId: scopedLeadId,
      dispatcher: async () => ({ status: 'delivered' as const }),
    });
    expect(worker).toMatchObject({ claimed: 1, completed: 1, recovered: 0, unknown: 0 });

    const unrelatedSnapshot = await getLeadDeliverySnapshot({ leadId: unrelatedLeadId, database: databaseB });
    expect(unrelatedSnapshot.current).toMatchObject({ id: unrelatedDelivery.delivery.id, state: 'claimed' });
    expect(unrelatedSnapshot.attempts.at(-1)).toMatchObject({ id: unrelatedClaim!.id, state: 'claimed' });
    const scopedSnapshot = await getLeadDeliverySnapshot({ leadId: scopedLeadId, database: databaseB });
    expect(scopedSnapshot.current).toMatchObject({ id: scopedDelivery.delivery.id, state: 'completed' });
  });

  it('stores UTC due work, enforces the retry budget, and keeps notification state out of primary custody summary', async () => {
    const leadId = await createLead('retry-budget');
    const recorded = await recordInitialLeadDelivery({
      ...primaryDeliveryInput(leadId, { maxAttempts: 2, initialStatus: 'delivered' }),
      database: databaseA,
    });

    const notification = await recordInitialLeadDelivery({
      ...primaryDeliveryInput(leadId, {
        purpose: 'notification',
        routingRevision: 1,
        idempotencyKey: `p2-notification:${leadId}:${randomUUID()}`,
        channel: 'email',
        initialStatus: 'pending',
        dueAt: new Date(Date.now() + 60_000),
      }),
      database: databaseA,
    });
    expect(notification.delivery.purpose).toBe('notification');
    const summaryAfterNotification = await query('SELECT delivery_status FROM leads WHERE id = ?', [leadId]);
    expect(summaryAfterNotification).toEqual([{ delivery_status: 'delivered' }]);

    const queuedSnapshot = await getLeadDeliverySnapshot({ leadId, database: databaseB });
    expect(queuedSnapshot.current).toMatchObject({ id: recorded.delivery.id, state: 'completed' });
    await expect(
      claimLeadDeliveryAttempt({ database: databaseB, deliveryId: notification.delivery.id }),
    ).resolves.toBeNull();

    const retryLeadId = await createLead('retry-budget-worker');
    const retryDelivery = await recordInitialLeadDelivery({
      ...primaryDeliveryInput(retryLeadId, { maxAttempts: 2 }),
      database: databaseA,
    });
    const first = await claimLeadDeliveryAttempt({ database: databaseA, deliveryId: retryDelivery.delivery.id });
    expect(first).not.toBeNull();
    await updateLeadDeliveryAttempt({
      database: databaseA,
      deliveryId: retryDelivery.delivery.id,
      attemptId: first!.id,
      leaseToken: first!.leaseToken,
      routingRevision: first!.routingRevision,
      status: 'failed',
      error: 'transient provider rejection',
    });
    const retry = await appendLeadDeliveryRetryAttempt({
      database: databaseB,
      deliveryId: retryDelivery.delivery.id,
      dueAt: new Date(Date.now() - 1_000),
    });
    expect(retry).toMatchObject({ attemptCount: 2, state: 'queued' });
    const second = await claimLeadDeliveryAttempt({ database: databaseB, deliveryId: retryDelivery.delivery.id });
    expect(second).not.toBeNull();
    await updateLeadDeliveryAttempt({
      database: databaseB,
      deliveryId: retryDelivery.delivery.id,
      attemptId: second!.id,
      leaseToken: second!.leaseToken,
      routingRevision: second!.routingRevision,
      status: 'failed',
      error: 'final provider rejection',
    });
    const exhausted = await getLeadDeliverySnapshot({ leadId: retryLeadId, database: databaseA });
    expect(exhausted.current).toMatchObject({ state: 'exhausted' });
    await expect(
      appendLeadDeliveryRetryAttempt({ database: databaseA, deliveryId: retryDelivery.delivery.id }),
    ).resolves.toBeNull();
    expect(toMySqlDateTime(new Date('2026-09-09T12:34:56.789Z'))).toBe('2026-09-09 12:34:56.789000');
  });

  it('preserves route history while exposing only the superseding current custody', async () => {
    const leadId = await createLead('route-supersession');
    const firstUserId = await createUser('route-first');
    const secondUserId = await createUser('route-second');
    const first = await recordInitialLeadDelivery({
      ...primaryDeliveryInput(leadId, {
        channel: 'manual',
        recipientUserId: firstUserId,
        leadCustody: 'platform_managed',
        initialStatus: 'attention_required',
      }),
      database: databaseA,
    });

    const second = await databaseB.transaction((tx: any) =>
      supersedePrimaryDeliveryInTransaction(tx, {
        ...primaryDeliveryInput(leadId, {
          idempotencyKey: `p2-route-correction:${leadId}:${randomUUID()}`,
          channel: 'manual',
          recipientUserId: secondUserId,
          leadCustody: 'platform_managed',
          initialStatus: 'attention_required',
        }),
      }),
    );
    expect(second.duplicate).toBe(false);
    const current = await getLeadDeliverySnapshot({ leadId, database: databaseA });
    expect(current.current).toMatchObject({
      id: second.delivery.id,
      routingRevision: 2,
      recipientUserId: secondUserId,
      recipientId: secondUserId,
      state: 'queued',
    });
    const history = await query(
      'SELECT id, state, routing_revision FROM lead_deliveries WHERE lead_id = ? ORDER BY routing_revision',
      [leadId],
    );
    expect(history).toEqual([
      { id: first.delivery.id, state: 'superseded', routing_revision: 1 },
      { id: second.delivery.id, state: 'queued', routing_revision: 2 },
    ]);
  });
});
