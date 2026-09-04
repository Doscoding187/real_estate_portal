import { createHash } from 'node:crypto';
import * as canonicalSchema from '../../drizzle/schema';
import {
  assertAuthorizedDatabaseOperation,
  type AuthorizedDatabaseOperation,
} from '../_core/databaseAuthority/authorization';
import {
  readTiDbCheckConstraintCapability,
  TIDB_CHECK_CONSTRAINT_VARIABLE,
} from '../_core/databaseAuthority/tidbCheckConstraintCapability';
import {
  createAuthoritySqlConnection,
  type AuthoritySqlConnection,
} from '../_core/databaseAuthority/connectionAuthority';
import type { ResolvedDatabaseAuthority } from '../_core/databaseAuthority/types';
import {
  normalizeSqlExpression,
  normalizedDesiredSchema,
} from '../_core/databaseAuthority/schemaCongruency';
import {
  acquireMigrationLock,
  assertRunnerConnectionTarget,
  queryMigrationRows,
  releaseMigrationLock,
} from './runSqlMigrations';
import { loadAndValidateMigrationManifest, migrationChecksum } from './migrationManifest';

/**
 * The production TiDB target was migrated while CHECK enforcement was OFF.
 * The original migration ledger is immutable, so this exact bounded repair
 * restores the canonical checks without replaying or rewriting history.
 */
export const TIDB_CHECK_CONSTRAINT_CONVERGENCE = Object.freeze({
  recoveryVersion: 1,
  recoveryFilename: 'tidb_check_constraint_convergence_v1',
  approvalReference: 'DBX-TIDB-CHECK-CONSTRAINT-CONVERGENCE-2026-09-04-Edward',
  reason: 'tidb_check_constraints_were_disabled_during_canonical_release',
});

export type TidbCheckConstraintDefinition = Readonly<{
  tableName: string;
  constraintName: string;
  expression: string;
}>;

/** These are the 22 checks proven absent by the protected production audit. */
export const TIDB_CANONICAL_CHECK_CONSTRAINTS: readonly TidbCheckConstraintDefinition[] =
  Object.freeze([
    {
      tableName: 'catalogue_publishers',
      constraintName: 'chk_catalogue_publishers_authority_shape',
      expression:
        "((`authority_kind` = 'platform_reference' AND `developer_organisation_id` IS NULL) OR (`authority_kind` = 'developer_first_party' AND `developer_organisation_id` IS NOT NULL))",
    },
    {
      tableName: 'catalogue_publishers',
      constraintName: 'chk_catalogue_publishers_platform_source',
      expression:
        "(`authority_kind` <> 'platform_reference' OR CHAR_LENGTH(TRIM(COALESCE(`source_attribution`, ''))) > 0)",
    },
    {
      tableName: 'commercial_availabilities',
      constraintName: 'chk_commercial_availabilities_freshness_order',
      expression:
        "((`availability_state` <> 'available_upcoming') OR (`occupation_date` IS NOT NULL)) AND ((`last_confirmed_at` IS NULL) OR (`reconfirmation_due_at` IS NOT NULL AND `reconfirmation_due_at` >= `last_confirmed_at`))",
    },
    {
      tableName: 'commercial_availabilities',
      constraintName: 'chk_commercial_availabilities_positive_claim_provenance',
      expression:
        "((`availability_state` NOT IN ('available_confirmed','available_upcoming')) OR (`last_confirmed_at` IS NOT NULL AND `confirmation_source` IS NOT NULL AND `reconfirmation_due_at` IS NOT NULL))",
    },
    {
      tableName: 'commercial_availability_economics',
      constraintName: 'chk_commercial_availability_economics_range',
      expression:
        '(`range_maximum_minor` IS NULL) OR ((`amount_minor` IS NOT NULL) AND (`range_maximum_minor` >= `amount_minor`))',
    },
    {
      tableName: 'commercial_availability_economics',
      constraintName: 'chk_commercial_availability_economics_value_state',
      expression:
        "((`value_state` IN ('supplied','estimated')) AND (`amount_minor` IS NOT NULL) AND (`charge_basis` IS NOT NULL)) OR ((`value_state` IN ('unknown','not_applicable')) AND (`amount_minor` IS NULL) AND (`range_maximum_minor` IS NULL) AND (`charge_basis` IS NULL) AND (`annual_escalation_percent` IS NULL))",
    },
    {
      tableName: 'commercial_availability_lease_terms',
      constraintName: 'chk_commercial_lease_terms_nonnegative',
      expression:
        '((`minimum_lease_months` IS NULL) OR (`minimum_lease_months` > 0)) AND ((`quoted_lease_months` IS NULL) OR (`quoted_lease_months` > 0)) AND ((`annual_escalation_percent` IS NULL) OR (`annual_escalation_percent` >= 0)) AND ((`deposit_minor` IS NULL) OR (`deposit_minor` >= 0)) AND ((`tenant_installation_allowance_minor` IS NULL) OR (`tenant_installation_allowance_minor` >= 0)) AND ((`beneficial_occupation_days` IS NULL) OR (`beneficial_occupation_days` >= 0))',
    },
    {
      tableName: 'commercial_space_specifications',
      constraintName: 'chk_commercial_space_specifications_boolean',
      expression: '(`boolean_value` IS NULL OR `boolean_value` IN (0, 1))',
    },
    {
      tableName: 'commercial_space_specifications',
      constraintName: 'chk_commercial_space_specifications_value_state',
      expression:
        "((`value_state` = 'known') AND ((`numeric_value` IS NOT NULL) + (`text_value` IS NOT NULL) + (`boolean_value` IS NOT NULL) = 1)) OR ((`value_state` IN ('unknown','unavailable','not_applicable')) AND (`numeric_value` IS NULL) AND (`text_value` IS NULL) AND (`boolean_value` IS NULL))",
    },
    {
      tableName: 'commercial_spaces',
      constraintName: 'chk_commercial_spaces_positive_areas',
      expression:
        '((`rentable_area_m2` IS NULL) OR (`rentable_area_m2` > 0)) AND ((`usable_area_m2` IS NULL) OR (`usable_area_m2` > 0))',
    },
    {
      tableName: 'development_supersessions',
      constraintName: 'chk_development_supersessions_activation_order',
      expression: '(`activated_at` IS NULL OR `activated_at` >= `verified_at`)',
    },
    {
      tableName: 'development_supersessions',
      constraintName: 'chk_development_supersessions_activation_triplet',
      expression:
        '((`activated_by_actor_id` IS NULL AND `activated_at` IS NULL AND `source_public_root_path` IS NULL) OR (`activated_by_actor_id` IS NOT NULL AND `activated_at` IS NOT NULL AND `source_public_root_path` IS NOT NULL))',
    },
    {
      tableName: 'development_supersessions',
      constraintName: 'chk_development_supersessions_active_shape',
      expression:
        "(`status` <> 'active' OR (`activated_by_actor_id` IS NOT NULL AND `activated_at` IS NOT NULL AND `source_public_root_path` IS NOT NULL AND `reversed_by_actor_id` IS NULL AND `reversed_at` IS NULL AND `reversal_reason` IS NULL))",
    },
    {
      tableName: 'development_supersessions',
      constraintName: 'chk_development_supersessions_distinct_endpoints',
      expression: '(`source_development_id` <> `replacement_development_id`)',
    },
    {
      tableName: 'development_supersessions',
      constraintName: 'chk_development_supersessions_reversal_order',
      expression: '(`reversed_at` IS NULL OR `reversed_at` >= `verified_at`)',
    },
    {
      tableName: 'development_supersessions',
      constraintName: 'chk_development_supersessions_reversed_shape',
      expression:
        "(`status` <> 'reversed' OR (`reversed_by_actor_id` IS NOT NULL AND `reversed_at` IS NOT NULL AND CHAR_LENGTH(TRIM(`reversal_reason`)) > 0))",
    },
    {
      tableName: 'development_supersessions',
      constraintName: 'chk_development_supersessions_source_path',
      expression:
        '(`source_public_root_path` IS NULL OR CHAR_LENGTH(TRIM(`source_public_root_path`)) > 0)',
    },
    {
      tableName: 'development_supersessions',
      constraintName: 'chk_development_supersessions_verification_note',
      expression: 'CHAR_LENGTH(TRIM(`verification_note`)) > 0',
    },
    {
      tableName: 'development_supersessions',
      constraintName: 'chk_development_supersessions_verified_shape',
      expression:
        "(`status` <> 'verified' OR (`activated_by_actor_id` IS NULL AND `activated_at` IS NULL AND `source_public_root_path` IS NULL AND `reversed_by_actor_id` IS NULL AND `reversed_at` IS NULL AND `reversal_reason` IS NULL))",
    },
    {
      tableName: 'land_claims',
      constraintName: 'chk_land_claims_one_subject',
      expression: '((`land_asset_id` IS NOT NULL) + (`parcel_id` IS NOT NULL)) = 1',
    },
    {
      tableName: 'land_conflict_cases',
      constraintName: 'chk_land_conflict_case_candidate',
      expression:
        '(`conflicting_land_asset_id` IS NOT NULL OR `conflicting_listing_id` IS NOT NULL)',
    },
    {
      tableName: 'location_provider_mappings',
      constraintName: 'location_provider_mappings_exactly_one_target',
      expression:
        '(((`province_id` IS NOT NULL) + (`city_id` IS NOT NULL)) + (`suburb_id` IS NOT NULL)) = 1',
    },
  ]);

type ConstraintEvidence = {
  tableName: string;
  constraintName: string;
  state: 'missing' | 'present';
  violatingRows: number;
};

type RecoveryAttemptEvidence = {
  attemptId: string;
  planDigest: string;
  targetFingerprintHash: string;
  migrationChecksum: string;
  acceptedOldHead: string | null;
  expectedNewHead: string;
  state: string;
  completedStatementCount: number;
  lastStatementDigest: string | null;
  failureClass: string | null;
  failureDigest: string | null;
  applicationArtifact: string | null;
};

export type TidbCheckConstraintConvergencePlan = {
  recoveryVersion: 1;
  planId: string;
  planDigest: string;
  status: 'pending' | 'already-applied';
  targetFingerprintHash: string;
  targetClass: string;
  databaseName: string;
  canonicalHead: string;
  capability: {
    variable: typeof TIDB_CHECK_CONSTRAINT_VARIABLE;
    value: string;
    enabled: boolean;
  };
  constraints: readonly ConstraintEvidence[];
  violatingRowCount: number;
  recoveryAttemptId: string;
  review: {
    reference: string;
    actor: string;
    reason: string;
  };
};

export type TidbCheckConstraintConvergenceOptions = {
  mode: 'plan' | 'apply';
  authority: ResolvedDatabaseAuthority;
  authorization: AuthorizedDatabaseOperation;
  approvalReference: string;
  approvalActor: string;
  expectedPlanDigest?: string;
  connectionFactory?: (
    authority: ResolvedDatabaseAuthority,
    decision: AuthorizedDatabaseOperation,
  ) => Promise<AuthoritySqlConnection>;
};

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function rowValue(row: Record<string, unknown>, key: string): unknown {
  return row[key] ?? row[key.toUpperCase()] ?? row[key.toLowerCase()];
}

function optionalString(row: Record<string, unknown>, key: string): string | null {
  const value = rowValue(row, key);
  return value === undefined || value === null ? null : String(value);
}

function rowsFromResult(result: unknown): Array<Record<string, unknown>> {
  const value: any = result;
  if (Array.isArray(value?.[0])) return value[0];
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value)) return value;
  return [];
}

function requiredReviewValue(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 80 || !/^[a-zA-Z0-9_.:@/-]+$/.test(normalized)) {
    throw new Error(`TiDB CHECK-constraint convergence refused: ${label} is missing or malformed.`);
  }
  return normalized;
}

function assertReleaseTarget(authority: ResolvedDatabaseAuthority, mode: 'plan' | 'apply'): void {
  const expectedOperation = mode === 'plan' ? 'release-plan' : 'release-apply';
  if (authority.context.operation !== expectedOperation) {
    throw new Error(
      'TiDB CHECK-constraint convergence refused: resolved operation does not match mode.',
    );
  }
  if (
    authority.context.local ||
    authority.context.provider !== 'tidb' ||
    !['staging', 'production'].includes(authority.context.targetClass)
  ) {
    throw new Error(
      'TiDB CHECK-constraint convergence refused: only a protected hosted TiDB release target is eligible.',
    );
  }
}

function assertReviewMatchesAuthorization(
  authorization: AuthorizedDatabaseOperation,
  approvalReference: string,
  approvalActor: string,
): { reference: string; actor: string } {
  const reference = requiredReviewValue(approvalReference, 'approval reference');
  const actor = requiredReviewValue(approvalActor, 'approval actor');
  if (reference !== TIDB_CHECK_CONSTRAINT_CONVERGENCE.approvalReference) {
    throw new Error(
      'TiDB CHECK-constraint convergence refused: approval reference is not the reviewed convergence approval.',
    );
  }
  if (authorization.approvalReference !== reference || authorization.approvalActor !== actor) {
    throw new Error(
      'TiDB CHECK-constraint convergence refused: review evidence must match protected-target approval.',
    );
  }
  return { reference, actor };
}

function assertCanonicalDefinitions(): string {
  const desired = normalizedDesiredSchema(canonicalSchema)
    .tables.flatMap(table =>
      table.checks.map(check => ({
        tableName: table.name,
        constraintName: check.name,
        expression: check.expression,
      })),
    )
    .sort((left, right) =>
      `${left.tableName}.${left.constraintName}`.localeCompare(
        `${right.tableName}.${right.constraintName}`,
      ),
    );
  const configured = TIDB_CANONICAL_CHECK_CONSTRAINTS.map(definition => ({
    tableName: definition.tableName,
    constraintName: definition.constraintName,
    expression: normalizeSqlExpression(definition.expression),
  })).sort((left, right) =>
    `${left.tableName}.${left.constraintName}`.localeCompare(
      `${right.tableName}.${right.constraintName}`,
    ),
  );
  if (JSON.stringify(desired) !== JSON.stringify(configured)) {
    throw new Error(
      'TiDB CHECK-constraint convergence refused: bounded definitions no longer match the canonical Drizzle model.',
    );
  }
  return sha256(configured);
}

function recoveryAttemptFromRow(row: Record<string, unknown>): RecoveryAttemptEvidence {
  return {
    attemptId: String(rowValue(row, 'attempt_id') ?? ''),
    planDigest: String(rowValue(row, 'plan_digest') ?? ''),
    targetFingerprintHash: String(rowValue(row, 'target_fingerprint_hash') ?? ''),
    migrationChecksum: String(rowValue(row, 'migration_checksum') ?? ''),
    acceptedOldHead: optionalString(row, 'accepted_old_head'),
    expectedNewHead: String(rowValue(row, 'expected_new_head') ?? ''),
    state: String(rowValue(row, 'state') ?? ''),
    completedStatementCount: Number(rowValue(row, 'completed_statement_count') ?? 0),
    lastStatementDigest: optionalString(row, 'last_statement_digest'),
    failureClass: optionalString(row, 'failure_class'),
    failureDigest: optionalString(row, 'failure_digest'),
    applicationArtifact: optionalString(row, 'application_artifact'),
  };
}

async function assertMigrationAtCanonicalHead(
  connection: AuthoritySqlConnection,
  manifest: ReturnType<typeof loadAndValidateMigrationManifest>,
): Promise<void> {
  const rows = await queryMigrationRows(
    connection,
    `SELECT filename, checksum FROM \`${manifest.document.historyTable}\` ORDER BY numeric_version, filename`,
  );
  if (rows.length !== manifest.orderedMigrations.length) {
    throw new Error(
      'TiDB CHECK-constraint convergence refused: migration history is not at the canonical head.',
    );
  }
  for (let index = 0; index < manifest.orderedMigrations.length; index += 1) {
    const expected = manifest.orderedMigrations[index];
    if (
      String(rowValue(rows[index], 'filename') ?? '') !== expected.filename ||
      String(rowValue(rows[index], 'checksum') ?? '') !== expected.checksum
    ) {
      throw new Error(
        'TiDB CHECK-constraint convergence refused: migration history differs from the canonical prefix.',
      );
    }
  }
}

async function assertNoIncompleteMigrationAttempts(
  connection: AuthoritySqlConnection,
  manifest: ReturnType<typeof loadAndValidateMigrationManifest>,
): Promise<void> {
  const rows = await queryMigrationRows(
    connection,
    `SELECT attempt_id, migration_filename, state FROM \`${manifest.document.attemptTable}\` WHERE state IN ('running', 'failed', 'blocked') ORDER BY started_at, attempt_id`,
  );
  if (rows.length > 0) {
    throw new Error(
      `TiDB CHECK-constraint convergence refused: incomplete migration attempt ${String(
        rowValue(rows[0], 'attempt_id') ?? '',
      )} for ${String(rowValue(rows[0], 'migration_filename') ?? '')} is ${String(
        rowValue(rows[0], 'state') ?? '',
      )}.`,
    );
  }
}

async function readConstraintEvidence(
  connection: AuthoritySqlConnection,
): Promise<ConstraintEvidence[]> {
  const tableNames = [...new Set(TIDB_CANONICAL_CHECK_CONSTRAINTS.map(item => item.tableName))];
  const tablePlaceholders = tableNames.map(() => '?').join(', ');
  const tableRows = await queryMigrationRows(
    connection,
    `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN (${tablePlaceholders})`,
    tableNames,
  );
  const presentTables = new Set(tableRows.map(row => String(rowValue(row, 'table_name') ?? '')));
  const missingTables = tableNames.filter(tableName => !presentTables.has(tableName));
  if (missingTables.length > 0) {
    throw new Error(
      `TiDB CHECK-constraint convergence refused: canonical table(s) are absent (${missingTables.join(', ')}).`,
    );
  }

  const constraintNames = TIDB_CANONICAL_CHECK_CONSTRAINTS.map(item => item.constraintName);
  const expectedTableByConstraintName = new Map<string, string>();
  for (const definition of TIDB_CANONICAL_CHECK_CONSTRAINTS) {
    const existingTable = expectedTableByConstraintName.get(definition.constraintName);
    if (existingTable && existingTable !== definition.tableName) {
      throw new Error(
        `TiDB CHECK-constraint convergence refused: canonical constraint name ${definition.constraintName} is assigned to multiple tables.`,
      );
    }
    expectedTableByConstraintName.set(definition.constraintName, definition.tableName);
  }
  const constraintPlaceholders = constraintNames.map(() => '?').join(', ');
  // TiDB exposes checks through its provider-specific inventory. Its
  // TABLE_CONSTRAINTS view does not carry MySQL's CHECK/ENFORCED shape.
  const checkRows = await queryMigrationRows(
    connection,
    `SELECT TABLE_NAME AS table_name, CONSTRAINT_NAME AS constraint_name, CHECK_CLAUSE AS check_clause FROM information_schema.TIDB_CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME IN (${constraintPlaceholders}) ORDER BY TABLE_NAME, CONSTRAINT_NAME`,
    constraintNames,
  );
  const actualByKey = new Map<string, Record<string, unknown>>();
  for (const row of checkRows) {
    const tableName = String(rowValue(row, 'table_name') ?? '');
    const constraintName = String(rowValue(row, 'constraint_name') ?? '');
    const expectedTable = expectedTableByConstraintName.get(constraintName);
    if (expectedTable && expectedTable !== tableName) {
      throw new Error(
        `TiDB CHECK-constraint convergence refused: existing ${constraintName} belongs to ${tableName}, expected ${expectedTable}.`,
      );
    }
    const key = `${String(rowValue(row, 'table_name') ?? '')}\0${String(
      rowValue(row, 'constraint_name') ?? '',
    )}`;
    if (actualByKey.has(key)) {
      throw new Error(
        'TiDB CHECK-constraint convergence refused: check inventory contains duplicate named evidence.',
      );
    }
    actualByKey.set(key, row);
  }

  const evidence: ConstraintEvidence[] = [];
  for (const definition of TIDB_CANONICAL_CHECK_CONSTRAINTS) {
    const row = actualByKey.get(`${definition.tableName}\0${definition.constraintName}`);
    if (row) {
      const actualExpression = normalizeSqlExpression(String(rowValue(row, 'check_clause') ?? ''));
      const expectedExpression = normalizeSqlExpression(definition.expression);
      if (actualExpression !== expectedExpression) {
        throw new Error(
          `TiDB CHECK-constraint convergence refused: existing ${definition.constraintName} has a different expression.`,
        );
      }
      evidence.push({
        tableName: definition.tableName,
        constraintName: definition.constraintName,
        state: 'present',
        violatingRows: 0,
      });
    } else {
      evidence.push({
        tableName: definition.tableName,
        constraintName: definition.constraintName,
        state: 'missing',
        violatingRows: 0,
      });
    }
  }
  return evidence;
}

async function readViolations(
  connection: AuthoritySqlConnection,
  evidence: ConstraintEvidence[],
): Promise<ConstraintEvidence[]> {
  const byKey = new Map(evidence.map(item => [`${item.tableName}\0${item.constraintName}`, item]));
  for (const definition of TIDB_CANONICAL_CHECK_CONSTRAINTS) {
    const rows = rowsFromResult(
      await connection.execute(
        `SELECT COUNT(*) AS violation_count FROM \`${definition.tableName}\` WHERE NOT (${definition.expression})`,
      ),
    );
    const count = Number(rowValue(rows[0] ?? {}, 'violation_count') ?? NaN);
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error(
        `TiDB CHECK-constraint convergence refused: violation count could not be proven for ${definition.constraintName}.`,
      );
    }
    byKey.get(`${definition.tableName}\0${definition.constraintName}`)!.violatingRows = count;
  }
  return evidence;
}

function failureEvidence(error: unknown): { failureClass: string; failureDigest: string } {
  const candidate = error as { name?: string; code?: string; errno?: string | number };
  const failureClass = String(
    candidate?.code ?? candidate?.errno ?? candidate?.name ?? 'recovery_error',
  )
    .replace(/[^a-zA-Z0-9_.-]/g, '_')
    .slice(0, 128);
  return { failureClass, failureDigest: sha256({ failureClass }) };
}

async function buildPlan(input: {
  connection: AuthoritySqlConnection;
  authority: ResolvedDatabaseAuthority;
  approvalReference: string;
  approvalActor: string;
}): Promise<TidbCheckConstraintConvergencePlan> {
  const { connection, authority } = input;
  await assertRunnerConnectionTarget(connection, authority);
  const manifest = loadAndValidateMigrationManifest();
  await assertMigrationAtCanonicalHead(connection, manifest);
  await assertNoIncompleteMigrationAttempts(connection, manifest);
  const definitionDigest = assertCanonicalDefinitions();
  const capability = await readTiDbCheckConstraintCapability(
    connection,
    authority.context.provider,
  );
  if (!capability.applicable || capability.value === null || capability.enabled === null) {
    throw new Error('TiDB CHECK-constraint convergence refused: TiDB capability was not returned.');
  }
  let evidence = await readConstraintEvidence(connection);
  evidence = await readViolations(connection, evidence);
  const violatingRowCount = evidence.reduce((total, item) => total + item.violatingRows, 0);
  const review = {
    reference: requiredReviewValue(input.approvalReference, 'approval reference'),
    actor: requiredReviewValue(input.approvalActor, 'approval actor'),
    reason: TIDB_CHECK_CONSTRAINT_CONVERGENCE.reason,
  };
  const recoveryRows = await queryMigrationRows(
    connection,
    `SELECT attempt_id, plan_digest, target_fingerprint_hash, migration_checksum, accepted_old_head, expected_new_head, state, completed_statement_count, last_statement_digest, failure_class, failure_digest, application_artifact FROM \`${manifest.document.attemptTable}\` WHERE migration_filename = ? ORDER BY started_at, attempt_id`,
    [TIDB_CHECK_CONSTRAINT_CONVERGENCE.recoveryFilename],
  );
  if (recoveryRows.length > 1) {
    throw new Error(
      'TiDB CHECK-constraint convergence refused: multiple durable recovery attempts exist.',
    );
  }
  const prior = recoveryRows.length === 1 ? recoveryAttemptFromRow(recoveryRows[0]) : null;
  if (prior && ['running', 'failed', 'blocked'].includes(prior.state)) {
    throw new Error(
      `TiDB CHECK-constraint convergence refused: durable attempt ${prior.attemptId} is ${prior.state}; reviewed recovery is required before continuation.`,
    );
  }
  const allPresent = evidence.every(item => item.state === 'present');
  if (prior && prior.state === 'succeeded') {
    const expectedLastStatementDigest = migrationChecksum(
      constraintSql(TIDB_CANONICAL_CHECK_CONSTRAINTS[TIDB_CANONICAL_CHECK_CONSTRAINTS.length - 1]!),
    );
    const expectedArtifact = JSON.stringify({
      recovery: TIDB_CHECK_CONSTRAINT_CONVERGENCE.recoveryFilename,
      definitionDigest,
      reference: review.reference,
      actor: review.actor,
    });
    if (
      !/^[a-f0-9]{64}$/.test(prior.planDigest) ||
      prior.targetFingerprintHash !== authority.context.targetFingerprintHash ||
      prior.migrationChecksum !== definitionDigest ||
      prior.acceptedOldHead !== manifest.document.expectedHead ||
      prior.expectedNewHead !== manifest.document.expectedHead ||
      prior.completedStatementCount !== TIDB_CANONICAL_CHECK_CONSTRAINTS.length ||
      prior.lastStatementDigest !== expectedLastStatementDigest ||
      prior.applicationArtifact !== expectedArtifact ||
      !allPresent ||
      !capability.enabled ||
      violatingRowCount !== 0
    ) {
      throw new Error(
        'TiDB CHECK-constraint convergence refused: durable success evidence contradicts current physical state.',
      );
    }
  } else if (evidence.some(item => item.state !== 'missing')) {
    throw new Error(
      'TiDB CHECK-constraint convergence refused: a partial or complete convergence state exists without durable evidence.',
    );
  }
  const digestMaterial = {
    recoveryVersion: TIDB_CHECK_CONSTRAINT_CONVERGENCE.recoveryVersion,
    targetFingerprintHash: authority.context.targetFingerprintHash,
    targetClass: authority.context.targetClass,
    databaseName: authority.context.databaseName,
    canonicalHead: manifest.document.expectedHead,
    manifestDigest: manifest.manifestDigest,
    definitionDigest,
    capability: {
      variable: capability.variable,
      value: capability.value,
      enabled: capability.enabled,
    },
    constraints: evidence,
    violatingRowCount,
    review,
  };
  const planDigest = sha256(digestMaterial);
  return Object.freeze({
    recoveryVersion: 1,
    planId: planDigest.slice(0, 24),
    planDigest,
    status: prior?.state === 'succeeded' ? 'already-applied' : 'pending',
    targetFingerprintHash: authority.context.targetFingerprintHash,
    targetClass: authority.context.targetClass,
    databaseName: authority.context.databaseName,
    canonicalHead: manifest.document.expectedHead,
    capability: Object.freeze({
      variable: capability.variable,
      value: capability.value,
      enabled: capability.enabled,
    }),
    constraints: Object.freeze(evidence.map(item => Object.freeze({ ...item }))),
    violatingRowCount,
    recoveryAttemptId:
      prior?.attemptId ?? `release-tidb-check-constraints-${planDigest.slice(0, 32)}`,
    review: Object.freeze(review),
  });
}

async function beginRecoveryAttempt(input: {
  connection: AuthoritySqlConnection;
  authority: ResolvedDatabaseAuthority;
  plan: TidbCheckConstraintConvergencePlan;
  definitionDigest: string;
  lockOwnerConnectionId: string;
}): Promise<void> {
  const artifact = JSON.stringify({
    recovery: TIDB_CHECK_CONSTRAINT_CONVERGENCE.recoveryFilename,
    definitionDigest: input.definitionDigest,
    reference: input.plan.review.reference,
    actor: input.plan.review.actor,
  });
  if (artifact.length > 255) {
    throw new Error('TiDB CHECK-constraint convergence refused: review evidence is too long.');
  }
  await input.connection.execute(
    `INSERT INTO \`sql_migration_attempts\` (attempt_id, plan_digest, target_fingerprint_hash, migration_filename, migration_checksum, accepted_old_head, expected_new_head, state, completed_statement_count, last_statement_digest, application_artifact, correlation_id, lock_owner_connection_id) VALUES (?, ?, ?, ?, ?, ?, ?, 'running', 0, NULL, ?, ?, ?)`,
    [
      input.plan.recoveryAttemptId,
      input.plan.planDigest,
      input.authority.context.targetFingerprintHash,
      TIDB_CHECK_CONSTRAINT_CONVERGENCE.recoveryFilename,
      input.definitionDigest,
      input.plan.canonicalHead,
      input.plan.canonicalHead,
      artifact,
      input.authority.context.correlationId,
      input.lockOwnerConnectionId,
    ],
  );
}

async function updateRecoveryProgress(
  connection: AuthoritySqlConnection,
  attemptId: string,
  completed: number,
  statementDigest: string,
): Promise<void> {
  await connection.execute(
    "UPDATE `sql_migration_attempts` SET completed_statement_count = ?, last_statement_digest = ? WHERE attempt_id = ? AND state = 'running'",
    [completed, statementDigest, attemptId],
  );
}

async function markRecoveryFailed(
  connection: AuthoritySqlConnection,
  attemptId: string,
  error: unknown,
): Promise<void> {
  const evidence = failureEvidence(error);
  try {
    await connection.execute(
      "UPDATE `sql_migration_attempts` SET state = 'failed', failure_class = ?, failure_digest = ?, finished_at = CURRENT_TIMESTAMP(3) WHERE attempt_id = ? AND state = 'running'",
      [evidence.failureClass, evidence.failureDigest, attemptId],
    );
  } catch {
    // A still-running durable row intentionally blocks future continuation.
  }
}

async function markRecoverySucceeded(
  connection: AuthoritySqlConnection,
  attemptId: string,
): Promise<void> {
  await connection.execute(
    "UPDATE `sql_migration_attempts` SET state = 'succeeded', finished_at = CURRENT_TIMESTAMP(3) WHERE attempt_id = ? AND state = 'running'",
    [attemptId],
  );
}

function constraintSql(definition: TidbCheckConstraintDefinition): string {
  return `ALTER TABLE \`${definition.tableName}\` ADD CONSTRAINT \`${definition.constraintName}\` CHECK (${definition.expression})`;
}

export async function runTidbCheckConstraintConvergence(
  options: TidbCheckConstraintConvergenceOptions,
): Promise<{
  mode: 'plan' | 'apply';
  plan: TidbCheckConstraintConvergencePlan;
  applied: boolean;
}> {
  assertReleaseTarget(options.authority, options.mode);
  const expectedOperation = options.mode === 'plan' ? 'release-plan' : 'release-apply';
  assertAuthorizedDatabaseOperation(options.authority, options.authorization, [expectedOperation]);
  assertReviewMatchesAuthorization(
    options.authorization,
    options.approvalReference,
    options.approvalActor,
  );
  if (options.mode === 'apply' && !options.expectedPlanDigest) {
    throw new Error(
      'TiDB CHECK-constraint convergence refused: apply requires the exact reviewed plan digest.',
    );
  }

  const connection = await (options.connectionFactory ?? createAuthoritySqlConnection)(
    options.authority,
    options.authorization,
  );
  const manifest = loadAndValidateMigrationManifest();
  let lockEvidence: Awaited<ReturnType<typeof acquireMigrationLock>> | null = null;
  try {
    await assertRunnerConnectionTarget(connection, options.authority);
    if (options.mode === 'apply') {
      lockEvidence = await acquireMigrationLock(connection, manifest.document.lockName);
    }
    const plan = await buildPlan({
      connection,
      authority: options.authority,
      approvalReference: options.approvalReference,
      approvalActor: options.approvalActor,
    });
    if (options.mode === 'plan') return { mode: options.mode, plan, applied: false };
    if (plan.planDigest !== options.expectedPlanDigest) {
      throw new Error(
        'TiDB CHECK-constraint convergence refused: reviewed plan digest does not match current evidence.',
      );
    }
    if (plan.status === 'already-applied') return { mode: options.mode, plan, applied: false };
    if (plan.violatingRowCount > 0) {
      throw new Error(
        `TiDB CHECK-constraint convergence refused: ${plan.violatingRowCount} existing row(s) violate the canonical checks.`,
      );
    }
    if (!lockEvidence) {
      throw new Error(
        'TiDB CHECK-constraint convergence refused: migration lock evidence is absent.',
      );
    }

    const definitionDigest = assertCanonicalDefinitions();
    await beginRecoveryAttempt({
      connection,
      authority: options.authority,
      plan,
      definitionDigest,
      lockOwnerConnectionId: lockEvidence.ownerConnectionId,
    });
    let completed = 0;
    try {
      // This is intentionally non-transactional: TiDB DDL has independent jobs.
      await assertRunnerConnectionTarget(connection, options.authority);
      await connection.query(`SET GLOBAL ${TIDB_CHECK_CONSTRAINT_VARIABLE} = ON`);
      const capability = await readTiDbCheckConstraintCapability(connection, 'tidb');
      if (!capability.enabled) {
        throw new Error(
          `TiDB CHECK-constraint convergence failed: ${TIDB_CHECK_CONSTRAINT_VARIABLE} did not become ON.`,
        );
      }
      for (const [index, definition] of TIDB_CANONICAL_CHECK_CONSTRAINTS.entries()) {
        const planned = plan.constraints[index];
        if (planned.state === 'missing') {
          await assertRunnerConnectionTarget(connection, options.authority);
          await connection.query(constraintSql(definition));
          await updateRecoveryProgress(
            connection,
            plan.recoveryAttemptId,
            index + 1,
            migrationChecksum(constraintSql(definition)),
          );
        } else {
          await updateRecoveryProgress(
            connection,
            plan.recoveryAttemptId,
            index + 1,
            migrationChecksum(`verified:${definition.tableName}.${definition.constraintName}`),
          );
        }
        completed = index + 1;
      }
      const finalEvidence = await readConstraintEvidence(connection);
      if (
        finalEvidence.some(item => item.state !== 'present') ||
        finalEvidence.length !== TIDB_CANONICAL_CHECK_CONSTRAINTS.length
      ) {
        throw new Error(
          'TiDB CHECK-constraint convergence failed closed: all canonical checks were not proven after apply.',
        );
      }
      await markRecoverySucceeded(connection, plan.recoveryAttemptId);
    } catch (error) {
      await markRecoveryFailed(connection, plan.recoveryAttemptId, error);
      throw new Error(
        `TiDB CHECK-constraint convergence failed after ${completed} of ${TIDB_CANONICAL_CHECK_CONSTRAINTS.length} checks; durable attempt ${plan.recoveryAttemptId} blocks ordinary continuation.`,
      );
    }
    const appliedPlan = await buildPlan({
      connection,
      authority: options.authority,
      approvalReference: options.approvalReference,
      approvalActor: options.approvalActor,
    });
    if (appliedPlan.status !== 'already-applied') {
      throw new Error(
        'TiDB CHECK-constraint convergence failed closed: durable success evidence was not proven.',
      );
    }
    return { mode: options.mode, plan: appliedPlan, applied: true };
  } finally {
    if (lockEvidence) await releaseMigrationLock(connection, manifest.document.lockName);
    await connection.end();
  }
}
