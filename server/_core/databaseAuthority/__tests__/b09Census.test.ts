import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  B09_CENSUS_ACTIVE_SESSION_QUERY,
  B09_CENSUS_CANCELLATION_CLEANUP_MS,
  B09_CENSUS_CONTROL_TIMEOUT_MS,
  B09_CENSUS_EXPECTED_HEAD,
  B09_CENSUS_MAX_MIGRATION_ROWS,
  B09_CENSUS_MAX_METADATA_ROWS_PER_QUERY,
  B09_CENSUS_METRICS,
  B09_CENSUS_OPERATION,
  B09_BILLING_RELATIONSHIP_METRICS,
  B09_CENSUS_READ_TABLES,
  B09_CENSUS_READ_METADATA,
  B09_CENSUS_ROLLBACK_TIMEOUT_MS,
  B09_CENSUS_SCOPE_ID,
  B09_CENSUS_QUERY,
  B09_CENSUS_TIMEOUT_PROBE_QUERY,
  B09_CENSUS_SCHEMA_MAPPING_ID,
  B09_MIGRATION_HISTORY_QUERY,
  B09_INCOMPLETE_ATTEMPTS_QUERY,
  assertB09MigrationLedger,
  assertB09BillingRelationshipAnomalyDeltas,
  buildB09CensusAuthorizationTemplate,
  runB09Census,
  sanitizeB09AggregateResult,
  validateB09CensusAuthorization,
} from '../b09Census';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import type { ResolvedDatabaseAuthority } from '../types';
import { loadAndValidateMigrationManifest } from '../../../migrations/migrationManifest';

const context = {
  operation: B09_CENSUS_OPERATION,
  targetFingerprintHash: 'a'.repeat(64),
  targetClass: 'disposable-worktree',
  credentialClass: 'local-owner',
} as const;

const migrationManifest = loadAndValidateMigrationManifest();
const migrationManifestDigest = migrationManifest.manifestDigest;
const stableNow = new Date('2026-09-27T12:00:00.000Z');

function authorization(overrides: Record<string, unknown> = {}) {
  return {
    ...buildB09CensusAuthorizationTemplate({ context, migrationManifestDigest }),
    approvalReference: 'B09-SYNTHETIC-TEST',
    approvedBy: 'local-test-owner',
    issuedAt: '2026-09-27T11:55:00.000Z',
    expiresAt: '2026-09-27T12:15:00.000Z',
    ...overrides,
  };
}

function zeroCounts(): Record<string, string> {
  return Object.fromEntries(B09_CENSUS_METRICS.map(metric => [metric, '0']));
}

function canonicalLedgerRows() {
  return migrationManifest.orderedMigrations.map(migration => ({
    numeric_version: migration.sequence,
    filename: migration.filename,
    checksum: migration.checksum,
  }));
}

function authority(): ResolvedDatabaseAuthority {
  return {
    context: {
      contextVersion: 1,
      contextId: 'synthetic-context',
      correlationId: 'synthetic-correlation',
      resolvedAt: stableNow.toISOString(),
      operation: B09_CENSUS_OPERATION,
      runtimeMode: 'development',
      environmentSource: 'explicit-caller',
      environmentFiles: [],
      targetFingerprint: 'mysql://loopback/listify_wt_synthetic',
      targetFingerprintHash: context.targetFingerprintHash,
      targetClass: context.targetClass,
      databaseName: 'listify_wt_synthetic',
      host: '127.0.0.1',
      port: '3307',
      provider: 'mysql',
      dialect: 'mysql',
      local: true,
      tls: { required: false, certificateVerificationRequired: false },
      credentialClass: context.credentialClass,
      credentialSource: 'database-url',
      repository: {
        root: process.cwd(),
        gitCommonDirectoryFingerprint: 'c'.repeat(64),
        head: 'd'.repeat(40),
      },
      worktree: {
        path: '/synthetic/worktree',
        branch: 'test/b09',
        upstream: null,
        registered: true,
        clean: true,
        ownershipKey: 'synthetic-owner',
        expectedDatabase: 'listify_wt_synthetic',
        ownershipMatches: true,
        cleanMainOwnershipMatches: false,
      },
    },
    targetCredential: { handleId: 'target' },
    credential: { handleId: 'credential' },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('B09 purpose-bound database census', () => {
  it('accepts the exact, current, time-bounded disposable-target authorization', () => {
    const accepted = validateB09CensusAuthorization(authorization(), {
      context,
      migrationManifestDigest,
      now: stableNow,
    });
    expect(accepted.targetFingerprintHash).toBe(context.targetFingerprintHash);
    expect(accepted.readTables).toEqual(B09_CENSUS_READ_TABLES);
  });

  it.each([
    ['target fingerprint', { targetFingerprintHash: 'e'.repeat(64) }],
    ['query hash', { querySha256: 'f'.repeat(64) }],
    ['code hash', { codeSha256: '0'.repeat(64) }],
    ['schema mapping', { schemaMappingId: 'historical-v1' }],
    ['read scope', { readTables: [...B09_CENSUS_READ_TABLES, 'users_private_archive'] }],
    ['metadata scope', { readMetadata: [...B09_CENSUS_READ_METADATA, 'information_schema.users'] }],
    ['execution bound', { maxExecutionMs: 15_001 }],
    ['row bound', { maxResultRows: 2 }],
    ['migration row bound', { maxMigrationRows: B09_CENSUS_MAX_MIGRATION_ROWS + 1 }],
    ['metadata row bound', { maxMetadataRowsPerQuery: B09_CENSUS_MAX_METADATA_ROWS_PER_QUERY + 1 }],
    [
      'cancellation cleanup bound',
      { maxCancellationCleanupMs: B09_CENSUS_CANCELLATION_CLEANUP_MS + 1 },
    ],
    ['control timeout bound', { maxControlCommandMs: B09_CENSUS_CONTROL_TIMEOUT_MS + 1 }],
    ['rollback cleanup bound', { maxRollbackCleanupMs: B09_CENSUS_ROLLBACK_TIMEOUT_MS + 1 }],
    ['expired approval', { expiresAt: '2026-09-27T11:59:59.000Z' }],
    ['missing reviewer', { approvedBy: '' }],
    ['unrecognized field', { arbitraryQuery: 'SELECT * FROM users' }],
  ])('rejects a changed or absent %s authorization constraint', (_label, override) => {
    expect(() =>
      validateB09CensusAuthorization(authorization(override), {
        context,
        migrationManifestDigest,
        now: stableNow,
      }),
    ).toThrow('B09 authorization refused');
  });

  it('rejects protected, main, or unknown target classes before connection', () => {
    for (const targetClass of ['production', 'clean-main-local', 'unknown']) {
      expect(() =>
        validateB09CensusAuthorization(authorization({ targetClass }), {
          context: { ...context, targetClass },
          migrationManifestDigest,
          now: stableNow,
        }),
      ).toThrow('B09 authorization refused');
    }
  });

  it('emits only the allow-listed aggregate counts and rejects raw or excess result fields', () => {
    const counts = zeroCounts();
    counts.users_total = '3';
    counts.leads_total = '2';
    const safe = sanitizeB09AggregateResult([[counts], []]);
    expect(safe.users_total).toBe('3');
    expect(safe.leads_total).toBe('2');
    expect(Object.keys(safe).sort()).toEqual([...B09_CENSUS_METRICS].sort());

    const unsafe = { ...counts, email: 'synthetic-private@example.invalid' };
    let message = '';
    try {
      sanitizeB09AggregateResult([[unsafe], []]);
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }
    expect(message).toContain('outside the approved report');
    expect(message).not.toContain('synthetic-private@example.invalid');
    expect(() => sanitizeB09AggregateResult([[counts, counts], []])).toThrow('row limit');
  });

  it('accepts only the exact complete migration ledger prefix, including sequence and every checksum', () => {
    const rows = canonicalLedgerRows();
    expect(rows.at(-1)?.filename).toBe(B09_CENSUS_EXPECTED_HEAD);
    expect(() =>
      assertB09MigrationLedger([rows, []], migrationManifest, context.targetFingerprintHash),
    ).not.toThrow();

    const checksumDrift = rows.map(row => ({ ...row }));
    checksumDrift[5].checksum = '0'.repeat(64);
    expect(() =>
      assertB09MigrationLedger(
        [checksumDrift, []],
        migrationManifest,
        context.targetFingerprintHash,
      ),
    ).toThrow('checksum differs');

    const duplicateWithUnchangedHead = [...rows];
    duplicateWithUnchangedHead[4] = { ...duplicateWithUnchangedHead[3] };
    expect(duplicateWithUnchangedHead.at(-1)?.filename).toBe(B09_CENSUS_EXPECTED_HEAD);
    expect(() =>
      assertB09MigrationLedger(
        [duplicateWithUnchangedHead, []],
        migrationManifest,
        context.targetFingerprintHash,
      ),
    ).toThrow('identity or checksum differs');

    expect(() =>
      assertB09MigrationLedger(
        [rows.slice(1), []],
        migrationManifest,
        context.targetFingerprintHash,
      ),
    ).toThrow('exact approved prefix');
  });

  it('rejects an unchanged full migration head when the physical mapping is invalid before census counts', async () => {
    const calls: string[] = [];
    const queryBounded = vi.fn(async (statement: string) => {
      calls.push(statement);
      if (statement === B09_MIGRATION_HISTORY_QUERY) return [canonicalLedgerRows(), []];
      if (statement === B09_INCOMPLETE_ATTEMPTS_QUERY) {
        return [[{ incomplete_attempts: '0' }], []];
      }
      if (statement.includes('@@global.lower_case_table_names')) {
        return [[{ lower_case_table_names: 0 }], []];
      }
      if (statement.includes('information_schema.')) return [[], []];
      return [[], []];
    });
    const controls: string[] = [];
    const connection: AuthoritySqlConnection = {
      execute: vi.fn(async () => undefined),
      query: vi.fn(async () => undefined),
      queryBounded,
      queryControlBounded: vi.fn(async statement => {
        controls.push(statement);
        return undefined;
      }),
      end: vi.fn(async () => undefined),
    };
    const approved = validateB09CensusAuthorization(authorization(), {
      context,
      migrationManifestDigest,
      now: stableNow,
    });

    await expect(
      runB09Census({
        authority: authority(),
        connection,
        authorization: approved,
        migrationManifest,
        migrationManifestDigest,
      }),
    ).rejects.toThrow('physical tables do not match');
    expect(calls).toContain(B09_MIGRATION_HISTORY_QUERY);
    expect(calls).not.toContain(B09_CENSUS_QUERY);
    expect(controls).toEqual(['START TRANSACTION READ ONLY', 'ROLLBACK']);
  });

  it('terminates the census path without rollback after a confirmed query-session cancellation', async () => {
    const queryBounded = vi.fn(async (statement: string) => {
      if (statement === B09_MIGRATION_HISTORY_QUERY) return [canonicalLedgerRows(), []];
      if (statement === B09_INCOMPLETE_ATTEMPTS_QUERY) {
        return [[{ incomplete_attempts: '0' }], []];
      }
      throw new Error(
        'Database query refused: execution deadline expired; the server session was terminated and the active query settled.',
      );
    });
    const queryControlBounded = vi.fn(async () => undefined);
    const connection: AuthoritySqlConnection = {
      execute: vi.fn(async () => undefined),
      query: vi.fn(async () => undefined),
      queryBounded,
      queryControlBounded,
      isTerminated: () => true,
      end: vi.fn(async () => undefined),
    };
    await expect(
      runB09Census({
        authority: authority(),
        connection,
        authorization: validateB09CensusAuthorization(authorization(), {
          context,
          migrationManifestDigest,
          now: stableNow,
        }),
        migrationManifest,
        migrationManifestDigest,
      }),
    ).rejects.toThrow('server session was terminated');
    expect(queryControlBounded).toHaveBeenCalledTimes(1);
    expect(queryControlBounded).toHaveBeenCalledWith(
      'START TRANSACTION READ ONLY',
      B09_CENSUS_CONTROL_TIMEOUT_MS,
    );
    expect(queryControlBounded).not.toHaveBeenCalledWith(
      'ROLLBACK',
      B09_CENSUS_ROLLBACK_TIMEOUT_MS,
    );
  });

  it('keeps timeout verification statements fixed and exact to the own-session scope', () => {
    expect(B09_CENSUS_TIMEOUT_PROBE_QUERY).toBe('SELECT SLEEP(30) AS timeout_probe');
    expect(B09_CENSUS_ACTIVE_SESSION_QUERY).toBe(
      'SELECT COUNT(*) AS active_sessions FROM information_schema.processlist WHERE ID = ?',
    );
    expect(B09_CENSUS_SCOPE_ID).toBe('b09-launch-data-aggregate-v2');
    expect(B09_CENSUS_SCHEMA_MAPPING_ID).toBe('canonical-launch-0094-v2');
  });

  it('requires positive deltas for invoice, payment, document, and audit ownership anomalies', () => {
    const before = zeroCounts();
    const after = { ...before };
    for (const metric of B09_BILLING_RELATIONSHIP_METRICS) after[metric] = '1';
    expect(assertB09BillingRelationshipAnomalyDeltas(before, after)).toEqual({
      billing_invoices_owner_relationship_issue: '1',
      billing_payments_owner_relationship_issue: '1',
      billing_payment_documents_owner_relationship_issue: '1',
      billing_audit_events_owner_relationship_issue: '1',
    });
    after.billing_payments_owner_relationship_issue = '0';
    expect(() => assertB09BillingRelationshipAnomalyDeltas(before, after)).toThrow(
      'did not increase billing_payments_owner_relationship_issue',
    );
  });

  it('checks the account, owner, and subscription links across every billing relationship', () => {
    expect(B09_CENSUS_QUERY).toContain('p.billable_account_id <> i.billable_account_id');
    expect(B09_CENSUS_QUERY).toContain('s.billable_account_id <> i.billable_account_id');
    expect(B09_CENSUS_QUERY).toContain('i.billable_account_id <> d.billable_account_id');
    expect(B09_CENSUS_QUERY).toContain('i.billable_account_id <> e.billable_account_id');
    expect(B09_CENSUS_QUERY).toContain('p.invoice_id <> e.invoice_id');
  });

  it('reports a safe failure phase and driver code without disclosing database error text', async () => {
    const queryBounded = vi.fn(async (statement: string) => {
      if (statement === B09_MIGRATION_HISTORY_QUERY)
        throw Object.assign(
          new Error('Private connection diagnostic and confidential-owner@example.invalid'),
          { code: 'ER_ACCESS_DENIED_ERROR' },
        );
      return [[{ incomplete_attempts: '0' }], []];
    });
    const connection: AuthoritySqlConnection = {
      execute: vi.fn(async () => undefined),
      query: vi.fn(async () => undefined),
      queryBounded,
      queryControlBounded: vi.fn(async () => undefined),
      end: vi.fn(async () => undefined),
    };
    const approved = validateB09CensusAuthorization(authorization(), {
      context,
      migrationManifestDigest,
      now: stableNow,
    });

    let message = '';
    try {
      await runB09Census({
        authority: authority(),
        connection,
        authorization: approved,
        migrationManifest,
        migrationManifestDigest,
      });
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }
    expect(message).toContain('migration-ledger-integrity-check (ER_ACCESS_DENIED_ERROR)');
    expect(message).not.toContain('confidential-owner@example.invalid');
  });
});
