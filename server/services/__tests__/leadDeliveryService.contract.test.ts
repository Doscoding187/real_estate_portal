import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  appendLeadDeliveryRetryAttempt,
  claimLeadDeliveryAttempt,
  recordInitialLeadDeliveryAttempt,
  updateLeadDeliveryAttempt,
} from '../leadDeliveryService';

function makeTransactionalDatabase(initialAttempts: unknown[] = []) {
  const state = { attempts: [...initialAttempts] as any[] };
  let transactionTail = Promise.resolve();

  const transaction = vi.fn(async (callback: (tx: any) => Promise<unknown>) => {
    let release!: () => void;
    const previous = transactionTail;
    transactionTail = new Promise<void>(resolve => {
      release = resolve;
    });
    await previous;

    const tx = {
      execute: vi.fn().mockResolvedValue([]),
      select: vi.fn(() => {
        const query: any = {
          from: vi.fn(() => query),
          where: vi.fn(() => query),
          limit: vi.fn(async () => [{ deliveryAttempts: state.attempts }]),
        };
        return query;
      }),
      update: vi.fn(() => ({
        set: vi.fn((patch: { deliveryAttempts?: any[] }) => ({
          where: vi.fn(async () => {
            if (patch.deliveryAttempts) state.attempts = [...patch.deliveryAttempts];
            return undefined;
          }),
        })),
      })),
    };

    try {
      return await callback(tx);
    } finally {
      release();
    }
  });

  return { transaction, state };
}

describe('leadDeliveryService contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('records a durable platform-custody attempt under the lead row lock', async () => {
    const database = makeTransactionalDatabase();
    const attempt = await recordInitialLeadDeliveryAttempt({
      leadId: 42,
      deliveryKey: 'platform:development:77',
      recipientType: 'manual',
      recipientId: null,
      channel: 'manual',
      status: 'attention_required',
      supplyOrigin: 'platform_curated',
      leadCustody: 'platform_managed',
      database: database as any,
    });

    expect(attempt).toMatchObject({
      deliveryKey: 'platform:development:77',
      status: 'attention_required',
      supplyOrigin: 'platform_curated',
      leadCustody: 'platform_managed',
      recipientType: 'manual',
      recipientId: null,
    });
    expect(database.state.attempts).toHaveLength(1);
  });

  it('serializes concurrent claims so only one caller may invoke a provider', async () => {
    const database = makeTransactionalDatabase();
    const attempt = await recordInitialLeadDeliveryAttempt({
      leadId: 42,
      deliveryKey: 'direct:agent:7',
      recipientType: 'agent',
      recipientId: 7,
      channel: 'crm_export',
      status: 'pending',
      database: database as any,
    });

    const claims = await Promise.all([
      claimLeadDeliveryAttempt({ leadId: 42, attemptId: attempt.id, database: database as any }),
      claimLeadDeliveryAttempt({ leadId: 42, attemptId: attempt.id, database: database as any }),
    ]);
    const winningClaim = claims.filter(Boolean);
    expect(winningClaim).toHaveLength(1);

    const provider = vi.fn().mockResolvedValue('provider-42');
    for (const claim of winningClaim) {
      if (claim) await provider();
    }
    expect(provider).toHaveBeenCalledTimes(1);

    const updated = await updateLeadDeliveryAttempt({
      leadId: 42,
      attemptId: attempt.id,
      status: 'delivered',
      providerReference: 'provider-42',
      database: database as any,
    });
    expect(updated).toMatchObject({ status: 'delivered', providerReference: 'provider-42' });
    expect(database.state.attempts).toHaveLength(1);
  });

  it('preserves failed history, bounds retries, and detects a crashed stale claim', async () => {
    const database = makeTransactionalDatabase();
    const first = await recordInitialLeadDeliveryAttempt({
      leadId: 42,
      deliveryKey: 'brand:13',
      recipientType: 'brand',
      recipientId: 13,
      channel: 'email',
      status: 'failed',
      error: 'provider unavailable',
      maxAttempts: 2,
      database: database as any,
    });
    const retry = await appendLeadDeliveryRetryAttempt({
      leadId: 42,
      deliveryKey: 'brand:13',
      database: database as any,
    });
    expect(retry).toMatchObject({ status: 'pending', attemptCount: 2 });

    await claimLeadDeliveryAttempt({ leadId: 42, attemptId: retry!.id, database: database as any });
    const failed = await updateLeadDeliveryAttempt({
      leadId: 42,
      attemptId: retry!.id,
      status: 'failed',
      error: 'provider still unavailable',
      database: database as any,
    });
    expect(failed).toMatchObject({ status: 'failed', attemptCount: 2 });
    expect(database.state.attempts).toHaveLength(2);
    expect(await appendLeadDeliveryRetryAttempt({
      leadId: 42,
      deliveryKey: 'brand:13',
      database: database as any,
    })).toBeNull();

    const staleDatabase = makeTransactionalDatabase();
    const pending = await recordInitialLeadDeliveryAttempt({
      leadId: 99,
      deliveryKey: 'direct:agency:4',
      recipientType: 'agency',
      recipientId: 4,
      channel: 'crm_export',
      status: 'pending',
      database: staleDatabase as any,
    });
    staleDatabase.state.attempts[0].attemptedAt = new Date(Date.now() - 11 * 60 * 1000).toISOString();
    const recovered = await appendLeadDeliveryRetryAttempt({
      leadId: 99,
      deliveryKey: 'direct:agency:4',
      database: staleDatabase as any,
    });
    expect(recovered).toMatchObject({ status: 'pending', attemptCount: 2 });
    expect(staleDatabase.state.attempts[0]).toMatchObject({
      status: 'failed',
      lastError: 'Delivery claim expired before completion.',
    });
  });
});
