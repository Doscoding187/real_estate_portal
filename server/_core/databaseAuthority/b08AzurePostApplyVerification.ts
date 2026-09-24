import { randomUUID } from 'node:crypto';
import { readFileSync, lstatSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { parse } from 'dotenv';
import * as schema from '../../../drizzle/schema';
import {
  authorizeDatabaseOperation,
  B08_AZURE_TARGET_FINGERPRINT_HASH,
  B08_INSPECTION_IDENTITY,
  B08_MIGRATION_IDENTITY,
  protectedDatabaseApprovalFromEnvironment,
} from './authorization';
import { createAuthoritySqlConnection, type AuthoritySqlConnection } from './connectionAuthority';
import { resolveDatabaseAuthority } from './context';
import { compareNormalizedSchemas, normalizedDesiredSchema, normalizedPhysicalSchema } from './schemaCongruency';
import { loadAndValidateMigrationManifest } from '../../migrations/migrationManifest';

const EXPECTED_HEAD = '0094_content_topics_primary_key.sql';
const EXPECTED_MANIFEST_DIGEST = '93d871e6f8760477f460b8821685d71d212374eb86ddd53bc6e2ccfc30608efc';
const EXPECTED_MODEL_DIGEST = 'a8ca8cf34bb3627594eab1b722b85115c6460225a0165db7992228a8547798e9';
const EXPECTED_APPLY_PLAN_DIGEST = '632f66e7eb10a16a4642a73fb4d2d8c0ebe15d4736ba17209141fa8dbab373ec';

function credentialUrl(filename: string, expectedIdentity: string): string {
  const file = join(homedir(), '.config', 'property-listify', filename);
  const parent = lstatSync(dirname(file));
  const stat = lstatSync(file);
  if (parent.uid !== process.getuid?.() || (parent.mode & 0o777) !== 0o700 ||
      stat.uid !== process.getuid?.() || !stat.isFile() || (stat.mode & 0o777) !== 0o600) {
    throw new Error('B08 Azure verification refused: credential permissions are unsafe.');
  }
  const url = parse(readFileSync(file, 'utf8')).DATABASE_URL;
  if (!url || decodeURIComponent(new URL(url).username) !== expectedIdentity) {
    throw new Error('B08 Azure verification refused: credential identity is wrong.');
  }
  return url;
}

function inspectorUrl(): string {
  return credentialUrl('b08-inspector.env', B08_INSPECTION_IDENTITY);
}

async function rows(connection: AuthoritySqlConnection, sql: string, values: readonly unknown[] = []): Promise<Record<string, unknown>[]> {
  const result = await connection.query(sql, values);
  return Array.isArray(result) && Array.isArray(result[0])
    ? result[0] as Record<string, unknown>[] : [];
}

async function expectMysqlError(connection: AuthoritySqlConnection, sql: string,
  values: readonly unknown[], expectedCode: string): Promise<void> {
  try {
    await connection.query(sql, values);
  } catch (error) {
    const observedCode = String((error as { code?: unknown }).code ?? 'unknown')
      .replace(/[^A-Z0-9_]/gi, '_').slice(0, 64);
    // Azure MySQL reports the same missing-parent FK rejection as either
    // ER_NO_REFERENCED_ROW (1216) or ER_NO_REFERENCED_ROW_2 (1452).
    if (observedCode === expectedCode ||
        (expectedCode === 'ER_NO_REFERENCED_ROW_2' && observedCode === 'ER_NO_REFERENCED_ROW')) return;
    throw new Error(`B08 Azure behavior proof failed: expected ${expectedCode}, received ${observedCode}.`);
  }
  throw new Error(`B08 Azure behavior proof failed: expected ${expectedCode} rejection.`);
}

export async function verifyB08AzureEstablishment(): Promise<Record<string, unknown>> {
  const env = { ...process.env, APP_ENV: 'production', NODE_ENV: 'production',
    DATABASE_URL: inspectorUrl(), DATABASE_AUTHORITY_APPROVED_CREDENTIAL_CLASS: 'read-only' };
  const authority = resolveDatabaseAuthority({ operation: 'verification', processEnv: env, credentialClass: 'read-only' });
  if (authority.context.targetFingerprintHash !== B08_AZURE_TARGET_FINGERPRINT_HASH ||
      authority.context.databaseName !== 'propertylistify_database' ||
      !authority.context.tls.certificateVerificationRequired) {
    throw new Error('B08 ledger verification refused: target or TLS differs.');
  }
  const decision = authorizeDatabaseOperation(authority, {
    approval: protectedDatabaseApprovalFromEnvironment(authority, env),
  });
  const manifest = loadAndValidateMigrationManifest();
  if (manifest.manifestDigest !== EXPECTED_MANIFEST_DIGEST ||
      manifest.document.expectedHead !== EXPECTED_HEAD || manifest.orderedMigrations.length !== 95) {
    throw new Error('B08 ledger verification refused: manifest differs.');
  }
  const connection = await createAuthoritySqlConnection(authority, decision);
  try {
    const session = (await rows(connection, `SELECT DATABASE() AS selected_database,
      CURRENT_USER() AS current_identity, @@global.lower_case_table_names AS lower_case_table_names,
      @@global.require_secure_transport AS require_secure_transport`))[0];
    const tlsCipher = (await rows(connection, "SHOW SESSION STATUS LIKE 'Ssl_cipher'"))[0];
    if (session?.selected_database !== 'propertylistify_database' ||
        !String(session.current_identity).startsWith(`${B08_INSPECTION_IDENTITY}@`) ||
        Number(session.lower_case_table_names) !== 1 ||
        Number(session.require_secure_transport) !== 1 || !tlsCipher?.Value) {
      throw new Error('B08 ledger verification refused: session differs.');
    }

    const history = await rows(connection, `SELECT numeric_version, filename, checksum
      FROM sql_migration_history ORDER BY numeric_version, filename`);
    const attempts = await rows(connection, `SELECT migration_filename, migration_checksum,
      plan_digest, target_fingerprint_hash, state, completed_statement_count
      FROM sql_migration_attempts ORDER BY migration_filename`);
    const attemptTimes = (await rows(connection, `SELECT MIN(started_at) AS first_started_at,
      MAX(finished_at) AS last_finished_at FROM sql_migration_attempts`))[0];
    if (history.length !== 95 || attempts.length !== 95) {
      throw new Error('B08 ledger verification refused: migration or attempt count differs.');
    }
    const attemptByName = new Map(attempts.map(row => [String(row.migration_filename), row]));
    if (attemptByName.size !== 95) {
      throw new Error('B08 ledger verification refused: duplicate migration attempt identity.');
    }
    for (let index = 0; index < manifest.orderedMigrations.length; index += 1) {
      const expected = manifest.orderedMigrations[index];
      const applied = history[index];
      const attempt = attemptByName.get(expected.filename);
      if (Number(applied.numeric_version) !== index ||
          applied.filename !== expected.filename || applied.checksum !== expected.checksum ||
          attempt?.migration_checksum !== expected.checksum ||
          attempt.plan_digest !== EXPECTED_APPLY_PLAN_DIGEST ||
          attempt.target_fingerprint_hash !== B08_AZURE_TARGET_FINGERPRINT_HASH ||
          attempt.state !== 'succeeded' ||
          Number(attempt.completed_statement_count) !== expected.statementCount) {
        throw new Error(`B08 ledger verification refused: migration ${expected.filename} differs.`);
      }
    }

    const myRowIds = await rows(connection, `SELECT TABLE_NAME AS table_name
      FROM information_schema.columns WHERE table_schema = DATABASE() AND column_name = 'my_row_id'`);
    if (myRowIds.length !== 0) throw new Error('B08 ledger verification refused: invisible primary key exists.');
    const primaryKeys = await rows(connection, `SELECT TABLE_NAME AS table_name,
      COLUMN_NAME AS column_name, ORDINAL_POSITION AS ordinal_position
      FROM information_schema.key_column_usage WHERE table_schema = DATABASE()
      AND constraint_name = 'PRIMARY' AND table_name IN ('user_onboarding_state', 'content_topics')
      ORDER BY table_name, ordinal_position`);
    const keyMap = new Map<string, string[]>();
    for (const row of primaryKeys) {
      const table = String(row.table_name);
      keyMap.set(table, [...(keyMap.get(table) ?? []), String(row.column_name)]);
    }
    if (JSON.stringify(keyMap.get('user_onboarding_state')) !== JSON.stringify(['user_id']) ||
        JSON.stringify(keyMap.get('content_topics')) !== JSON.stringify(['content_id', 'topic_id'])) {
      throw new Error('B08 ledger verification refused: explicit primary keys differ.');
    }

    const desired = normalizedDesiredSchema(schema);
    const actual = await normalizedPhysicalSchema(connection, 'mysql', desired);
    const comparison = compareNormalizedSchemas(desired, actual);
    if (!desired.tables.some(table => table.name === 'propertyImages') ||
        !comparison.congruent || comparison.differences.length !== 0 ||
        comparison.desiredDigest !== EXPECTED_MODEL_DIGEST ||
        comparison.actualDigest !== EXPECTED_MODEL_DIGEST ||
        actual.tables.some(table => table.checks.some(check => !check.enforced))) {
      throw new Error('B08 ledger verification refused: physical schema differs.');
    }
    const physicalTableRows = await rows(connection, `SELECT TABLE_NAME AS table_name
      FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'`);
    const folded = physicalTableRows.map(row => String(row.table_name).toLowerCase());
    const propertyImagesPhysical = physicalTableRows.filter(row =>
      String(row.table_name).toLowerCase() === 'propertyimages').map(row => String(row.table_name));
    if (new Set(folded).size !== folded.length ||
        JSON.stringify(propertyImagesPhysical) !== JSON.stringify(['propertyimages'])) {
      throw new Error('B08 ledger verification refused: physical table case differs.');
    }
    const residue = (await rows(connection, `SELECT
      (SELECT COUNT(*) FROM partner_tiers WHERE slug LIKE 'b08-json-%') AS partner_tiers,
      (SELECT COUNT(*) FROM transactional_email_deliveries WHERE purpose = 'b08-proof') AS deliveries,
      (SELECT COUNT(*) FROM users WHERE email LIKE 'b08-role-%@example.test') AS users,
      (SELECT COUNT(*) FROM managerial_audit_logs WHERE action = 'b08_role_proof') AS role_audits`))[0];
    const controlledRowsRemaining = Object.values(residue).reduce<number>(
      (sum, value) => sum + Number(value), 0,
    );
    if (controlledRowsRemaining !== 0) {
      throw new Error('B08 ledger verification refused: controlled verification rows remain.');
    }
    return {
      verifiedAt: new Date().toISOString(),
      targetFingerprintHash: authority.context.targetFingerprintHash,
      migrationHead: history[94].filename,
      migrationCount: history.length,
      succeededAttemptCount: attempts.length,
      incompleteAttemptCount: 0,
      firstAttemptStartedAt: attemptTimes.first_started_at,
      lastAttemptFinishedAt: attemptTimes.last_finished_at,
      applyPlanDigest: EXPECTED_APPLY_PLAN_DIGEST,
      manifestDigest: manifest.manifestDigest,
      desiredModelDigest: comparison.desiredDigest,
      actualModelDigest: comparison.actualDigest,
      schemaCongruent: comparison.congruent,
      physicalTableCount: physicalTableRows.length,
      logicalPropertyImages: 'propertyImages',
      physicalPropertyImages: propertyImagesPhysical,
      caseFoldCollisionCount: 0,
      foreignKeyCount: actual.tables.reduce((sum, table) => sum + table.foreignKeys.length, 0),
      unenforcedCheckCount: 0,
      myRowIdCount: 0,
      controlledRowsRemaining,
      primaryKeys: Object.fromEntries(keyMap),
      tlsCipherPresent: true,
      lowerCaseTableNames: 1,
    };
  } finally {
    await connection.end();
  }
}

export async function verifyB08AzureBehavior(acknowledgement: string): Promise<Record<string, unknown>> {
  const env = {
    ...process.env,
    APP_ENV: 'production', NODE_ENV: 'production',
    DATABASE_URL: inspectorUrl(),
    DATABASE_MIGRATION_URL: credentialUrl('b08-migrator.env', B08_MIGRATION_IDENTITY),
  };
  const authority = resolveDatabaseAuthority({
    operation: 'b08-behavior-verify', processEnv: env, credentialClass: 'migration',
  });
  if (authority.context.targetFingerprintHash !== B08_AZURE_TARGET_FINGERPRINT_HASH ||
      authority.context.databaseName !== 'propertylistify_database' ||
      !authority.context.tls.certificateVerificationRequired) {
    throw new Error('B08 Azure behavior proof refused: target or TLS differs.');
  }
  const decision = authorizeDatabaseOperation(authority, {
    approval: protectedDatabaseApprovalFromEnvironment(authority, env), acknowledgement,
  });
  const first = await createAuthoritySqlConnection(authority, decision);
  let second: AuthoritySqlConnection | undefined;
  try {
    second = await createAuthoritySqlConnection(authority, decision);
    const session = (await rows(first, `SELECT DATABASE() AS selected_database,
      CURRENT_USER() AS current_identity, CONNECTION_ID() AS connection_id,
      @@session.time_zone AS timezone, @@session.transaction_isolation AS isolation_level`))[0];
    const tlsCipher = (await rows(first, "SHOW SESSION STATUS LIKE 'Ssl_cipher'"))[0];
    if (session?.selected_database !== 'propertylistify_database' ||
        !String(session.current_identity).startsWith(`${B08_MIGRATION_IDENTITY}@`) ||
        session.timezone !== '+00:00' || session.isolation_level !== 'REPEATABLE-READ' ||
        !tlsCipher?.Value) {
      throw new Error('B08 Azure behavior proof refused: migration session differs.');
    }
    const nonce = randomUUID();
    const slug = `b08-json-${nonce}`;
    const deliveryKey = `b08-delivery-${nonce}`;
    const email = `b08-role-${nonce}@example.test`;
    const lockName = `b08-behavior-${nonce}`;
    let userId = 0;
    await first.query('START TRANSACTION');
    try {
      await first.query(
        'INSERT INTO `partner_tiers` (`name`, `slug`, `priceZar`, `features`) VALUES (?, ?, ?, ?)',
        ['B08 Azure proof', slug, 100, JSON.stringify({ source: 'b08', nested: { value: 7 } })],
      );
      const json = (await rows(first,
        "SELECT JSON_UNQUOTE(JSON_EXTRACT(`features`, '$.nested.value')) AS nested_value FROM `partner_tiers` WHERE `slug` = ? FOR UPDATE",
        [slug]))[0];
      if (json?.nested_value !== '7') throw new Error('B08 Azure behavior proof failed: JSON or FOR UPDATE.');
      await expectMysqlError(first,
        "INSERT INTO `billable_accounts` (`account_kind`) VALUES ('agent')", [],
        'ER_CHECK_CONSTRAINT_VIOLATED');
      await expectMysqlError(first,
        "INSERT INTO `transactional_email_attempts` (`delivery_id`, `attempt_number`, `claim_token`, `state`) VALUES (2147483647, 1, ?, 'claimed')",
        [`b08-fk-${nonce}`], 'ER_NO_REFERENCED_ROW_2');
      await first.query(
        "INSERT INTO `transactional_email_deliveries` (`source_type`, `source_id`, `purpose`, `recipient_email`, `delivery_key`) VALUES ('billing_audit', 1, 'b08-proof', 'b08@example.test', ?)",
        [deliveryKey],
      );
      const time = (await rows(first,
        "SELECT DATE_FORMAT(`created_at`, '%f') AS microseconds FROM `transactional_email_deliveries` WHERE `delivery_key` = ?",
        [deliveryKey]))[0];
      if (!/^\d{6}$/.test(String(time?.microseconds ?? ''))) {
        throw new Error('B08 Azure behavior proof failed: microsecond timestamp.');
      }
      await expectMysqlError(first,
        "INSERT INTO `transactional_email_deliveries` (`source_type`, `source_id`, `purpose`, `recipient_email`, `delivery_key`) VALUES ('billing_audit', 2, 'b08-proof', 'b08@example.test', ?)",
        [deliveryKey], 'ER_DUP_ENTRY');

      const insertUser = await first.query('INSERT INTO `users` (`email`, `role`) VALUES (?, ?)', [email, 'visitor']);
      userId = Number((insertUser as [{ insertId?: number }])[0]?.insertId);
      if (!Number.isSafeInteger(userId) || userId <= 0) {
        throw new Error('B08 Azure behavior proof failed: controlled user identity.');
      }
      await first.query("UPDATE `users` SET `role` = 'agent' WHERE `id` = ?", [userId]);
      await first.query(
        "INSERT INTO `managerial_audit_logs` (`actor_user_id`, `action`, `target_type`, `target_id`, `before_data`, `after_data`) VALUES (?, 'b08_role_proof', 'user', ?, ?, ?)",
        [userId, userId, JSON.stringify({ role: 'visitor' }), JSON.stringify({ role: 'agent' })],
      );
      const role = (await rows(first, 'SELECT `role` AS role FROM `users` WHERE `id` = ? FOR UPDATE', [userId]))[0];
      const audit = (await rows(first,
        "SELECT COUNT(*) AS total FROM `managerial_audit_logs` WHERE `target_type` = 'user' AND `target_id` = ? AND `action` = 'b08_role_proof'",
        [userId]))[0];
      if (role?.role !== 'agent' || Number(audit?.total) !== 1) {
        throw new Error('B08 Azure behavior proof failed: role/audit transaction.');
      }
    } finally {
      await first.query('ROLLBACK');
    }

    const residueChecks = [
      await rows(first, 'SELECT `id` FROM `partner_tiers` WHERE `slug` = ?', [slug]),
      await rows(first, 'SELECT `id` FROM `transactional_email_deliveries` WHERE `delivery_key` = ?', [deliveryKey]),
      await rows(first, 'SELECT `id` FROM `users` WHERE `email` = ?', [email]),
      await rows(first, "SELECT `id` FROM `managerial_audit_logs` WHERE `target_type` = 'user' AND `target_id` = ? AND `action` = 'b08_role_proof'", [userId]),
    ];
    if (residueChecks.some(result => result.length !== 0)) {
      throw new Error('B08 Azure behavior proof failed: controlled data remained after rollback.');
    }

    const firstLock = (await rows(first, 'SELECT GET_LOCK(?, 0) AS acquired', [lockName]))[0];
    if (Number(firstLock?.acquired) !== 1) throw new Error('B08 Azure behavior proof failed: GET_LOCK acquisition.');
    let releaseStatus = 0;
    try {
      const secondLock = (await rows(second, 'SELECT GET_LOCK(?, 0) AS acquired', [lockName]))[0];
      if (Number(secondLock?.acquired) !== 0) {
        throw new Error('B08 Azure behavior proof failed: GET_LOCK exclusion.');
      }
    } finally {
      const released = (await rows(first, 'SELECT RELEASE_LOCK(?) AS released', [lockName]))[0];
      releaseStatus = Number(released?.released);
    }
    if (releaseStatus !== 1) throw new Error('B08 Azure behavior proof failed: GET_LOCK release.');

    return {
      verifiedAt: new Date().toISOString(),
      targetFingerprintHash: authority.context.targetFingerprintHash,
      identity: B08_MIGRATION_IDENTITY,
      firstConnectionId: Number(session.connection_id),
      tlsCipherPresent: true,
      timezone: '+00:00',
      isolation: 'REPEATABLE-READ',
      foreignKeyRejection: true,
      checkRejection: true,
      jsonRoundTrip: true,
      microsecondTimestamp: true,
      transactionalEmailUniqueness: true,
      roleAuditTransaction: true,
      transactionRollback: true,
      forUpdate: true,
      getLockExclusion: true,
      controlledRowsRemaining: 0,
    };
  } finally {
    await second?.end();
    await first.end();
  }
}
