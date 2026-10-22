import { randomUUID } from 'node:crypto';
import type { AuthorizedDatabaseOperation } from './authorization';
import { createAuthoritySqlConnection, type AuthoritySqlConnection } from './connectionAuthority';
import {
  assertB09BillingRelationshipAnomalyDeltas,
  B09_CENSUS_CONTROL_TIMEOUT_MS,
  B09_CENSUS_QUERY,
  B09_CENSUS_ROLLBACK_TIMEOUT_MS,
  B09_BILLING_RELATIONSHIP_METRICS,
  sanitizeB09AggregateResult,
} from './b09Census';
import type { ResolvedDatabaseAuthority } from './types';

const FIXTURE_EXECUTION_BOUND_MS = 15_000;

function resultRows(result: unknown): Array<Record<string, unknown>> {
  const value: any = result;
  if (Array.isArray(value?.[0]) && Array.isArray(value[0])) return value[0];
  if (Array.isArray(value?.rows)) return value.rows;
  return [];
}

function positiveInteger(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function safeDatabaseCode(error: unknown): string {
  const value =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';
  return /^[A-Z0-9_]{1,40}$/.test(value) ? value : 'DATABASE_ERROR';
}

function requireInsertId(result: unknown): number {
  const value: any = result;
  const header = Array.isArray(value) ? value[0] : value;
  const id = positiveInteger(header?.insertId ?? header?.insert_id);
  if (!id)
    throw new Error('B09 billing verification failed: synthetic insert identity was unavailable.');
  return id;
}

export async function verifyB09SyntheticBillingRelationships(
  authority: ResolvedDatabaseAuthority,
  decision: AuthorizedDatabaseOperation,
): Promise<Record<string, unknown>> {
  if (
    decision.operation !== 'test-fixture' ||
    authority.context.targetClass !== 'disposable-worktree' ||
    !authority.context.local ||
    !authority.context.worktree.ownershipMatches
  ) {
    throw new Error(
      'B09 billing verification refused: exact owned disposable test-fixture target is required.',
    );
  }
  const connection = await createAuthoritySqlConnection(authority, decision);
  const startedAt = Date.now();
  const deadline = startedAt + FIXTURE_EXECUTION_BOUND_MS;
  const remaining = () => {
    const value = deadline - Date.now();
    if (value < 1)
      throw new Error('B09 billing verification refused: execution bound was reached.');
    return Math.min(value, FIXTURE_EXECUTION_BOUND_MS);
  };
  const boundedControl = connection.queryControlBounded;
  const boundedRead = connection.queryBounded;
  const boundedInsert = connection.executeFixtureBounded;
  if (!boundedControl || !boundedRead || !boundedInsert) {
    connection.destroy?.();
    throw new Error(
      'B09 billing verification refused: bounded fixture capabilities are unavailable.',
    );
  }

  let transactionOpen = false;
  let phase = 'synthetic-fixture-transaction';
  let report: Record<string, unknown> | undefined;
  try {
    await boundedControl('START TRANSACTION', B09_CENSUS_CONTROL_TIMEOUT_MS);
    transactionOpen = true;
    phase = 'synthetic-account-selection';
    const accountResult = await boundedRead(
      `SELECT b.id AS account_id, b.account_kind AS owner_type, CASE WHEN b.account_kind = 'agent' THEN b.user_id WHEN b.account_kind = 'agency' THEN b.agency_id WHEN b.account_kind = 'developer' THEN b.developer_organisation_id END AS owner_id, s.id AS subscription_id FROM billable_accounts b INNER JOIN subscriptions s ON s.billable_account_id = b.id WHERE (b.account_kind = 'agent' AND b.user_id IS NOT NULL) OR (b.account_kind = 'agency' AND b.agency_id IS NOT NULL) OR (b.account_kind = 'developer' AND b.developer_organisation_id IS NOT NULL) ORDER BY b.id, s.id LIMIT 32`,
      remaining(),
    );
    const accounts = resultRows(accountResult).flatMap(row => {
      const accountId = positiveInteger(row.account_id ?? row.ACCOUNT_ID);
      const ownerId = positiveInteger(row.owner_id ?? row.OWNER_ID);
      const subscriptionId = positiveInteger(row.subscription_id ?? row.SUBSCRIPTION_ID);
      const ownerType = String(row.owner_type ?? row.OWNER_TYPE ?? '');
      return accountId &&
        ownerId &&
        subscriptionId &&
        ['agent', 'agency', 'developer'].includes(ownerType)
        ? [{ accountId, ownerId, subscriptionId, ownerType }]
        : [];
    });
    let accountA: (typeof accounts)[number] | undefined;
    let accountB: (typeof accounts)[number] | undefined;
    for (const first of accounts) {
      const second = accounts.find(candidate => candidate.accountId !== first.accountId);
      if (second && (second.ownerType !== first.ownerType || second.ownerId !== first.ownerId)) {
        accountA = first;
        accountB = second;
        break;
      }
    }
    if (!accountA || !accountB) {
      throw new Error(
        'B09 billing verification refused: two distinct synthetic account fixtures are required.',
      );
    }

    phase = 'baseline-aggregate';
    const baseline = sanitizeB09AggregateResult(await boundedRead(B09_CENSUS_QUERY, remaining()));
    const probeId = randomUUID();
    const insert = async (statement: string, values: readonly unknown[]) =>
      requireInsertId(await boundedInsert(statement, remaining(), values));

    phase = 'synthetic-cross-account-invoice-and-payment-inserts';
    await insert(
      'INSERT INTO billing_invoices (owner_type, owner_id, billable_account_id, subscription_id, invoice_number, payment_reference, amount_due) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        accountA.ownerType,
        accountA.ownerId,
        accountA.accountId,
        accountB.subscriptionId,
        `b09-${probeId}-sub-mismatch`,
        `b09-${probeId}-sub-payment`,
        100,
      ],
    );
    const invoiceBId = await insert(
      'INSERT INTO billing_invoices (owner_type, owner_id, billable_account_id, subscription_id, invoice_number, payment_reference, amount_due) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        accountB.ownerType,
        accountB.ownerId,
        accountB.accountId,
        accountB.subscriptionId,
        `b09-${probeId}-invoice`,
        `b09-${probeId}-invoice-payment`,
        100,
      ],
    );
    const paymentId = await insert(
      'INSERT INTO billing_payments (invoice_id, subscription_id, owner_type, owner_id, billable_account_id, amount, payment_reference, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        invoiceBId,
        accountA.subscriptionId,
        accountA.ownerType,
        accountA.ownerId,
        accountA.accountId,
        100,
        `b09-${probeId}-payment`,
        `b09-${probeId}-idempotency`,
      ],
    );
    await insert(
      'INSERT INTO billing_payment_documents (payment_id, invoice_id, owner_type, owner_id, billable_account_id, storage_key, original_file_name, mime_type, file_size_bytes, sha256_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        paymentId,
        invoiceBId,
        accountA.ownerType,
        accountA.ownerId,
        accountA.accountId,
        `b09-synthetic/${probeId}`,
        'synthetic-proof.pdf',
        'application/pdf',
        1,
        '0'.repeat(64),
      ],
    );
    await insert(
      'INSERT INTO billing_audit_events (owner_type, owner_id, billable_account_id, subscription_id, invoice_id, payment_id, event_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        accountA.ownerType,
        accountA.ownerId,
        accountA.accountId,
        accountA.subscriptionId,
        invoiceBId,
        paymentId,
        'b09_synthetic_cross_account_verification',
      ],
    );

    phase = 'relationship-anomaly-aggregate';
    const after = sanitizeB09AggregateResult(await boundedRead(B09_CENSUS_QUERY, remaining()));
    const anomalyDeltas = assertB09BillingRelationshipAnomalyDeltas(baseline, after);
    if (
      B09_BILLING_RELATIONSHIP_METRICS.some(metric => BigInt(anomalyDeltas[metric]) < BigInt(1))
    ) {
      throw new Error(
        'B09 billing verification failed: expected relationship anomalies were not observed.',
      );
    }
    phase = 'bounded-fixture-rollback';
    await boundedControl('ROLLBACK', B09_CENSUS_ROLLBACK_TIMEOUT_MS);
    transactionOpen = false;
    report = {
      verificationVersion: 1,
      operation: 'b09-census-synthetic-billing-relationships',
      targetFingerprintHash: authority.context.targetFingerprintHash,
      targetClass: authority.context.targetClass,
      accountIdentifiersReturned: false,
      fixtureValuesReturned: false,
      anomalyDeltas,
      executionBoundMs: FIXTURE_EXECUTION_BOUND_MS,
      elapsedMs: Date.now() - startedAt,
      rollbackCompleted: true,
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('B09 ')) throw error;
    throw new Error(
      `B09 billing verification failed during ${phase} (${safeDatabaseCode(error)}); database details are suppressed.`,
    );
  } finally {
    if (transactionOpen && !connection.isTerminated?.()) {
      try {
        await boundedControl('ROLLBACK', B09_CENSUS_ROLLBACK_TIMEOUT_MS);
        transactionOpen = false;
      } catch {
        connection.destroy?.();
        transactionOpen = false;
        throw new Error(
          'B09 billing verification cleanup failed: bounded rollback did not complete; target preserved.',
        );
      }
    }
    await connection.end();
  }
  if (!report || transactionOpen) {
    connection.destroy?.();
    throw new Error('B09 billing verification refused: result or rollback state is incomplete.');
  }
  return report;
}
