import { resolve } from 'node:path';
import * as schema from '../drizzle/schema';
import {
  authorizeDatabaseOperation,
  expectedDatabaseAcknowledgement,
  protectedDatabaseApprovalFromEnvironment,
} from '../server/_core/databaseAuthority/authorization';
import { createAuthoritySqlConnection } from '../server/_core/databaseAuthority/connectionAuthority';
import { provisionB08AzureInspectionIdentity } from '../server/_core/databaseAuthority/b08AzureInspectionIdentity';
import { resolveDatabaseAuthority } from '../server/_core/databaseAuthority/context';
import {
  createOwnedWorktreeDatabase,
  disposeOwnedWorktreeDatabase,
} from '../server/_core/databaseAuthority/lifecycle';
import { assessRuntimeDatabaseReadiness } from '../server/_core/databaseAuthority/readiness';
import {
  prepareCanonicalGeography,
  verifyCanonicalGeography,
} from '../server/_core/databaseAuthority/dataAdapters/canonicalGeography';
import {
  assertDataRoleManifest,
  DATA_ROLE_MANIFEST,
} from '../server/_core/databaseAuthority/dataAdapters/dataRoleManifest';
import {
  prepareCanonicalFoundation,
  verifyCanonicalFoundation,
} from '../server/_core/databaseAuthority/dataAdapters/canonicalFoundation';
import {
  planCanonicalCommercialReferenceData,
  prepareCanonicalCommercialReferenceData,
  verifyCanonicalCommercialReference,
} from '../server/_core/databaseAuthority/dataAdapters/canonicalCommercial';
import {
  prepareSearchToLeadScenario,
  verifySearchToLeadScenario,
} from '../server/_core/databaseAuthority/dataAdapters/searchToLeadScenario';
import {
  prepareListingPreviewFixture,
  verifyListingPreviewFixture,
} from '../server/_core/databaseAuthority/dataAdapters/listingPreviewFixture';
import {
  prepareHomepageJourneyPreviewFixture,
  verifyHomepageJourneyPreviewFixture,
} from '../server/_core/databaseAuthority/dataAdapters/homepageJourneyPreviewFixture';
import {
  preparePlePublicationEntitlement,
  verifyPlePublicationEntitlement,
} from '../server/_core/databaseAuthority/dataAdapters/plePublicationEntitlement';
import {
  preparePleReviewerFixture,
  verifyPleReviewerFixture,
} from '../server/_core/databaseAuthority/dataAdapters/pleReviewerFixture';
import {
  compareNormalizedSchemas,
  normalizedDesiredSchema,
  normalizedPhysicalSchema,
  summarizeCheckConstraintEnforcement,
} from '../server/_core/databaseAuthority/schemaCongruency';
import { readTiDbCheckConstraintCapability } from '../server/_core/databaseAuthority/tidbCheckConstraintCapability';
import { auditTidbStructuralAdmission } from '../server/_core/databaseAuthority/tidbStructuralAdmission';
import {
  LOCAL_SERVICE_HOST,
  LOCAL_SERVICE_PORT,
  localServiceDataDir,
  localServiceFingerprint,
  localServiceLegacyRoot,
  localServiceRoot,
} from '../server/_core/databaseAuthority/localServicePaths';
import {
  DATABASE_OPERATIONS,
  type DatabaseCredentialClass,
  type DatabaseOperation,
  type ResolvedDatabaseAuthority,
} from '../server/_core/databaseAuthority/types';
import { loadAndValidateMigrationManifest } from '../server/migrations/migrationManifest';
import { runRejectedZeroStatementRecovery } from '../server/migrations/recoverRejectedZeroStatementMigration';
import { runRejectedReleaseZeroStatementRecovery } from '../server/migrations/recoverRejectedReleaseZeroStatementMigration';
import { runRejectedReleaseCommercialQuoteTermsRecovery } from '../server/migrations/recoverRejectedReleaseCommercialQuoteTermsMigration';
import { runTidbCheckConstraintConvergence } from '../server/migrations/recoverTidbCheckConstraintConvergence';
import { runSqlMigrations } from '../server/migrations/runSqlMigrations';

type Command =
  | 'context'
  | 'manifest'
  | 'data:manifest'
  | 'b08:inspector:provision'
  | 'b08:inspect-metadata'
  | 'worktree:create'
  | 'worktree:dispose'
  | 'worktree:ack'
  | 'migration:plan'
  | 'migration:apply'
  | 'migration-recovery:plan'
  | 'migration-recovery:apply'
  | 'release-migration-recovery:plan'
  | 'release-migration-recovery:apply'
  | 'release-commercial-quote-terms-recovery:plan'
  | 'release-commercial-quote-terms-recovery:apply'
  | 'release-tidb-check-constraint-convergence:plan'
  | 'release-tidb-check-constraint-convergence:apply'
  | 'release:plan'
  | 'release:apply'
  | 'release-reference:plan'
  | 'release-reference:apply'
  | 'release-reference:verify'
  | 'readiness'
  | 'schema:check'
  | 'schema:tidb-audit'
  | 'reference:prepare'
  | 'reference:verify'
  | 'foundation:prepare'
  | 'foundation:verify'
  | 'scenario:prepare'
  | 'scenario:verify'
  | 'listing-preview:prepare'
  | 'listing-preview:verify'
  | 'homepage-preview:prepare'
  | 'homepage-preview:verify'
  | 'ple-publication-entitlement:prepare'
  | 'ple-publication-entitlement:verify'
  | 'ple-reviewer:prepare'
  | 'ple-reviewer:verify';

function option(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .slice(3)
    .find(value => value.startsWith(prefix))
    ?.slice(prefix.length);
}

function requiredOption(name: string): string {
  const value = option(name)?.trim();
  if (!value) throw new Error(`Missing required --${name}=... option.`);
  return value;
}

function operationOption(fallback: DatabaseOperation): DatabaseOperation {
  const value = option('operation') ?? fallback;
  if (!DATABASE_OPERATIONS.includes(value as DatabaseOperation)) {
    throw new Error(`Unknown database operation ${value}.`);
  }
  return value as DatabaseOperation;
}

function credentialClass(fallback?: DatabaseCredentialClass): DatabaseCredentialClass | undefined {
  return (option('credential') ?? process.env.DATABASE_CREDENTIAL_CLASS ?? fallback) as
    | DatabaseCredentialClass
    | undefined;
}

function authorityFor(operation: DatabaseOperation, fallbackCredential?: DatabaseCredentialClass) {
  return resolveDatabaseAuthority({
    operation,
    // The isolated GitHub service binds identity from the operation after
    // target resolution. A local-owner fallback must never select its role.
    credentialClass: credentialClass(
      process.env.GITHUB_ACTIONS === 'true' ? undefined : fallbackCredential,
    ),
  });
}

function authorizationFor(authority: ReturnType<typeof authorityFor>, acknowledgement?: string) {
  return authorizeDatabaseOperation(authority, {
    approval: protectedDatabaseApprovalFromEnvironment(authority),
    acknowledgement,
  });
}

function print(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

type LocalServiceContextReport =
  | {
      applicability: 'local';
      host: string;
      port: number;
      directory: string;
      dataDirectory: string;
      fingerprint: string;
      legacyHomeDirectory: string;
      legacyPathPolicy: string;
    }
  | {
      applicability: 'not-applicable';
      reason: string;
    };

function localServiceContextReport(): Extract<
  LocalServiceContextReport,
  { applicability: 'local' }
> {
  return {
    applicability: 'local',
    host: LOCAL_SERVICE_HOST,
    port: LOCAL_SERVICE_PORT,
    directory: localServiceRoot(),
    dataDirectory: localServiceDataDir(),
    fingerprint: localServiceFingerprint(),
    legacyHomeDirectory: localServiceLegacyRoot(),
    legacyPathPolicy: 'inactive-residue-only; never adopted or deleted automatically',
  };
}

/**
 * Context diagnostics never connect to a database. Local-service metadata is
 * meaningful only for the authority-owned loopback target, so hosted
 * deployments must not derive a UID-bound local path merely to print context.
 */
export function databaseAuthorityContextReport(
  authority: ResolvedDatabaseAuthority,
  localServiceReport: () => Extract<
    LocalServiceContextReport,
    { applicability: 'local' }
  > = localServiceContextReport,
): ResolvedDatabaseAuthority['context'] & { localService: LocalServiceContextReport } {
  return {
    ...authority.context,
    localService: authority.context.local
      ? localServiceReport()
      : {
          applicability: 'not-applicable',
          reason: 'The resolved database target is not local; no local-service path was evaluated.',
        },
  };
}

async function run(command: Command): Promise<void> {
  if (command === 'manifest') {
    const manifest = loadAndValidateMigrationManifest();
    print({
      manifestVersion: manifest.document.manifestVersion,
      manifestDigest: manifest.manifestDigest,
      expectedHead: manifest.document.expectedHead,
      historyTable: manifest.document.historyTable,
      attemptTable: manifest.document.attemptTable,
      orderedMigrations: manifest.orderedMigrations.map(item => ({
        sequence: item.sequence,
        filename: item.filename,
        checksum: item.checksum,
        parent: item.parent,
      })),
    });
    return;
  }

  if (command === 'data:manifest') {
    assertDataRoleManifest();
    print(DATA_ROLE_MANIFEST);
    return;
  }

  if (command === 'b08:inspector:provision') {
    print(await provisionB08AzureInspectionIdentity());
    return;
  }

  if (command === 'b08:inspect-metadata') {
    const authority = authorityFor('read-only-connect', 'read-only');
    const decision = authorizationFor(authority);
    if (
      authority.context.targetFingerprintHash !==
        'b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced' ||
      authority.context.credentialClass !== 'read-only'
    ) {
      throw new Error('B08 metadata inspection refused: exact Azure read-only target required.');
    }
    const connection = await createAuthoritySqlConnection(authority, decision);
    const rows = async (statement: string): Promise<Array<Record<string, unknown>>> => {
      const result = await connection.query(statement);
      return Array.isArray(result) && Array.isArray(result[0])
        ? (result[0] as Array<Record<string, unknown>>)
        : [];
    };
    try {
      const session = (await rows(`SELECT VERSION() AS version, DATABASE() AS selected_database,
        CURRENT_USER() AS current_identity, @@session.sql_mode AS sql_mode,
        @@session.time_zone AS session_time_zone,
        @@session.transaction_isolation AS transaction_isolation,
        @@session.character_set_connection AS character_set_connection,
        @@session.collation_connection AS collation_connection,
        @@global.lower_case_table_names AS lower_case_table_names,
        @@global.sql_generate_invisible_primary_key AS sql_generate_invisible_primary_key,
        @@global.require_secure_transport AS require_secure_transport`))[0];
      if (
        session?.selected_database !== 'propertylistify_database' ||
        !String(session.current_identity).startsWith('propertylistify_b08_inspector@')
      ) {
        throw new Error('B08 metadata inspection refused: selected database or identity differs.');
      }
      const tlsCipher = (await rows("SHOW SESSION STATUS LIKE 'Ssl_cipher'"))[0];
      const tlsVersion = (await rows("SHOW SESSION STATUS LIKE 'Ssl_version'"))[0];
      const tables = await rows(`SELECT TABLE_NAME AS table_name, TABLE_TYPE AS table_type,
        TABLE_ROWS AS estimated_rows, ENGINE AS engine, TABLE_COLLATION AS table_collation
        FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME`);
      const specialColumns = await rows(`SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name,
        EXTRA AS extra, COLUMN_KEY AS column_key, DATA_TYPE AS data_type
        FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('content_topics', 'user_onboarding_state') ORDER BY TABLE_NAME, ORDINAL_POSITION`);
      const foreignKeys = await rows(`SELECT COUNT(*) AS total FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()`);
      const checks = await rows(`SELECT CONSTRAINT_NAME AS name, ENFORCED AS enforced
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE()
        AND CONSTRAINT_TYPE = 'CHECK' ORDER BY CONSTRAINT_NAME`);
      const indexes = await rows(`SELECT COUNT(DISTINCT CONCAT(TABLE_NAME, '.', INDEX_NAME)) AS total
        FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE()`);
      const features = await rows(`SELECT
        SUM(DATA_TYPE = 'json') AS json_columns,
        SUM(DATA_TYPE IN ('timestamp', 'datetime') AND DATETIME_PRECISION = 6) AS microsecond_timestamps
        FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE()`);
      const grantRows = await rows('SHOW GRANTS');
      const grants = grantRows.flatMap(row => Object.values(row)).map(String);
      const usageOnly = grants.filter(grant => /^GRANT USAGE ON \*\.\*/i.test(grant)).length === 1;
      const selectOnly = grants.filter(grant =>
        /^GRANT SELECT ON [`']?propertylistify_database[`']?\.\* TO /i.test(grant),
      ).length === 1;
      print({
        targetFingerprintHash: authority.context.targetFingerprintHash,
        server: session.version,
        selectedDatabase: session.selected_database,
        inspectorIdentityVerified: true,
        tls: {
          cipherPresent: Boolean(tlsCipher?.Value),
          version: tlsVersion?.Value ?? null,
          certificateVerificationRequired: authority.context.tls.certificateVerificationRequired,
          secureTransportRequired: session.require_secure_transport,
        },
        session: {
          sqlMode: session.sql_mode,
          timezone: session.session_time_zone,
          transactionIsolation: session.transaction_isolation,
          characterSet: session.character_set_connection,
          collation: session.collation_connection,
          lowerCaseTableNames: session.lower_case_table_names,
          generateInvisiblePrimaryKey: session.sql_generate_invisible_primary_key,
        },
        tableInventory: {
          count: tables.length,
          names: tables.map(table => table.table_name),
          estimatedNonempty: tables.filter(table => Number(table.estimated_rows) > 0).map(table => ({
            table: table.table_name,
            estimatedRows: table.estimated_rows,
          })),
          engines: [...new Set(tables.map(table => table.engine))],
          collations: [...new Set(tables.map(table => table.table_collation))],
        },
        propertyImagesPhysicalNames: tables.filter(table =>
          String(table.table_name).toLowerCase() === 'propertyimages',
        ).map(table => table.table_name),
        specialColumns,
        migrationLedgerPresent: tables.some(table => table.table_name === 'sql_migration_history'),
        migrationAttemptLedgerPresent: tables.some(table => table.table_name === 'sql_migration_attempts'),
        foreignKeyCount: foreignKeys[0]?.total ?? null,
        checks,
        indexCount: indexes[0]?.total ?? null,
        jsonColumnCount: features[0]?.json_columns ?? null,
        microsecondTimestampCount: features[0]?.microsecond_timestamps ?? null,
        grants: {
          count: grants.length,
          onlyUsageAndDatabaseSelect: usageOnly && selectOnly && grants.length === 2,
          selectOnApprovedDatabase: selectOnly,
          mutationPrivilegesPresent: grants.some(grant =>
            /\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|INDEX|TRIGGER|GRANT OPTION)\b/i.test(grant),
          ),
        },
      });
    } finally {
      await connection.end();
    }
    return;
  }

  if (command === 'context') {
    const authority = authorityFor(operationOption('read-only-connect'));
    print(databaseAuthorityContextReport(authority));
    return;
  }

  if (command === 'worktree:ack') {
    const operation = operationOption('database-dispose');
    const authority = authorityFor(operation, 'lifecycle-admin');
    print({
      operation,
      targetFingerprintHash: authority.context.targetFingerprintHash,
      targetClass: authority.context.targetClass,
      databaseName: authority.context.databaseName,
      acknowledgement: expectedDatabaseAcknowledgement(authority.context),
    });
    return;
  }

  if (command === 'worktree:create') {
    const authority = authorityFor('database-create', 'lifecycle-admin');
    const decision = authorizationFor(authority);
    print(await createOwnedWorktreeDatabase({ authority, decision }));
    return;
  }

  if (command === 'worktree:dispose') {
    const authority = authorityFor('database-dispose', 'lifecycle-admin');
    const acknowledgement = option('ack');
    const decision = authorizationFor(authority, acknowledgement);
    print(await disposeOwnedWorktreeDatabase({ authority, decision }));
    return;
  }

  if (command === 'migration-recovery:plan' || command === 'migration-recovery:apply') {
    const planOnly = command.endsWith(':plan');
    const authority = authorityFor(planOnly ? 'migration-plan' : 'migration-apply');
    const decision = authorizationFor(authority);
    const result = await runRejectedZeroStatementRecovery({
      mode: planOnly ? 'plan' : 'apply',
      authority,
      authorization: decision,
      attemptId: requiredOption('attempt-id'),
      approvalReference: requiredOption('approval-reference'),
      approvalActor: requiredOption('approval-actor'),
      expectedPlanDigest: planOnly ? undefined : requiredOption('plan-digest'),
    });
    print(result);
    return;
  }

  if (
    command === 'release-migration-recovery:plan' ||
    command === 'release-migration-recovery:apply'
  ) {
    const planOnly = command.endsWith(':plan');
    const authority = authorityFor(
      planOnly ? 'release-plan' : 'release-apply',
      planOnly ? 'read-only' : 'migration',
    );
    const decision = authorizationFor(authority, option('ack'));
    const result = await runRejectedReleaseZeroStatementRecovery({
      mode: planOnly ? 'plan' : 'apply',
      authority,
      authorization: decision,
      attemptId: requiredOption('attempt-id'),
      approvalReference: requiredOption('approval-reference'),
      approvalActor: requiredOption('approval-actor'),
      expectedPlanDigest: planOnly ? undefined : requiredOption('plan-digest'),
    });
    print(result);
    return;
  }

  if (
    command === 'release-commercial-quote-terms-recovery:plan' ||
    command === 'release-commercial-quote-terms-recovery:apply'
  ) {
    const planOnly = command.endsWith(':plan');
    const authority = authorityFor(
      planOnly ? 'release-plan' : 'release-apply',
      planOnly ? 'read-only' : 'migration',
    );
    const decision = authorizationFor(authority, option('ack'));
    const result = await runRejectedReleaseCommercialQuoteTermsRecovery({
      mode: planOnly ? 'plan' : 'apply',
      authority,
      authorization: decision,
      approvalReference: requiredOption('approval-reference'),
      approvalActor: requiredOption('approval-actor'),
      expectedPlanDigest: planOnly ? undefined : requiredOption('plan-digest'),
    });
    print(result);
    return;
  }

  if (
    command === 'release-tidb-check-constraint-convergence:plan' ||
    command === 'release-tidb-check-constraint-convergence:apply'
  ) {
    const planOnly = command.endsWith(':plan');
    const authority = authorityFor(
      planOnly ? 'release-plan' : 'release-apply',
      planOnly ? 'read-only' : 'migration',
    );
    const decision = authorizationFor(authority, option('ack'));
    const result = await runTidbCheckConstraintConvergence({
      mode: planOnly ? 'plan' : 'apply',
      authority,
      authorization: decision,
      approvalReference: requiredOption('approval-reference'),
      approvalActor: requiredOption('approval-actor'),
      expectedPlanDigest: planOnly ? undefined : requiredOption('plan-digest'),
    });
    print(result);
    return;
  }

  if (
    command === 'migration:plan' ||
    command === 'migration:apply' ||
    command === 'release:plan' ||
    command === 'release:apply'
  ) {
    const planOnly = command.endsWith(':plan');
    const releaseOperation = command.startsWith('release:');
    const result = await runSqlMigrations({
      mode: planOnly ? 'plan' : 'apply',
      operation: releaseOperation
        ? planOnly
          ? 'release-plan'
          : 'release-apply'
        : planOnly
          ? 'migration-plan'
          : 'migration-apply',
      acceptedOldHead: option('accepted-old-head') === 'none' ? null : option('accepted-old-head'),
      expectedNewHead: option('expected-new-head'),
      acknowledgement: option('ack'),
      expectedPlanDigest: releaseOperation && !planOnly ? requiredOption('plan-digest') : undefined,
    });
    print({
      mode: result.mode,
      planId: result.plan.planId,
      planDigest: result.plan.planDigest,
      targetFingerprintHash: result.plan.targetFingerprintHash,
      acceptedOldHead: result.plan.acceptedOldHead,
      pending: result.plan.pending,
      expectedNewHead: result.plan.expectedNewHead,
      lock: result.lock,
      applied: result.applied,
      freshSessionEvidence: result.freshSessionEvidence,
    });
    return;
  }

  if (
    command === 'release-reference:plan' ||
    command === 'release-reference:apply' ||
    command === 'release-reference:verify'
  ) {
    const isPlan = command.endsWith(':plan');
    const isApply = command.endsWith(':apply');
    const operation: DatabaseOperation = isPlan
      ? 'release-reference-plan'
      : isApply
        ? 'release-reference-apply'
        : 'release-reference-verify';
    const authority = authorityFor(operation, isApply ? 'migration' : 'read-only');
    const decision = authorizationFor(authority, option('ack'));
    const connection = await createAuthoritySqlConnection(authority, decision);
    try {
      const evidence = isPlan
        ? await planCanonicalCommercialReferenceData({ authority, decision, connection })
        : isApply
          ? await prepareCanonicalCommercialReferenceData({ authority, decision, connection })
          : await verifyCanonicalCommercialReference({ authority, decision, connection });
      print(evidence);
    } finally {
      await connection.end();
    }
    return;
  }

  if (command === 'readiness') {
    print(
      await assessRuntimeDatabaseReadiness({
        purpose: (option('purpose') as any) ?? 'location-discovery',
      }),
    );
    return;
  }

  if (
    command === 'reference:prepare' ||
    command === 'reference:verify' ||
    command === 'foundation:prepare' ||
    command === 'foundation:verify' ||
    command === 'scenario:prepare' ||
    command === 'scenario:verify' ||
    command === 'listing-preview:prepare' ||
    command === 'listing-preview:verify' ||
    command === 'homepage-preview:prepare' ||
    command === 'homepage-preview:verify'
  ) {
    if (command.startsWith('listing-preview:')) {
      const isPrepare = command.endsWith(':prepare');
      const operation = isPrepare ? 'demo-seed' : 'verification';
      const authority = authorityFor(operation, isPrepare ? 'local-owner' : undefined);
      const decision = authorizationFor(authority);
      const connection = await createAuthoritySqlConnection(authority, decision);
      try {
        const evidence = isPrepare
          ? await prepareListingPreviewFixture({ authority, decision, connection })
          : await verifyListingPreviewFixture({ authority, decision, connection });
        print(evidence);
      } finally {
        await connection.end();
      }
      return;
    }

    if (command.startsWith('homepage-preview:')) {
      const isPrepare = command.endsWith(':prepare');
      const operation = isPrepare ? 'demo-seed' : 'verification';
      const authority = authorityFor(operation, isPrepare ? 'local-owner' : undefined);
      const decision = authorizationFor(authority);
      const connection = await createAuthoritySqlConnection(authority, decision);
      try {
        const evidence = isPrepare
          ? await prepareHomepageJourneyPreviewFixture({ authority, decision, connection })
          : await verifyHomepageJourneyPreviewFixture({ authority, decision, connection });
        print(evidence);
      } finally {
        await connection.end();
      }
      return;
    }

    const isReference = command.startsWith('reference:');
    const isFoundation = command.startsWith('foundation:');
    const isPrepare = command.endsWith(':prepare');
    const operation = isPrepare
      ? isReference
        ? 'reference-seed'
        : isFoundation
          ? 'foundation-seed'
          : 'scenario-seed'
      : 'verification';
    const authority = authorityFor(operation, isPrepare ? 'local-owner' : undefined);
    const decision = authorizationFor(authority);
    const connection = await createAuthoritySqlConnection(authority, decision);
    try {
      const evidence = isReference
        ? isPrepare
          ? await prepareCanonicalGeography({ authority, decision, connection })
          : await verifyCanonicalGeography({ authority, decision, connection })
        : isFoundation
          ? isPrepare
            ? await prepareCanonicalFoundation({ authority, decision, connection })
            : await verifyCanonicalFoundation({ authority, decision, connection })
          : isPrepare
            ? await prepareSearchToLeadScenario({ authority, decision, connection })
            : await verifySearchToLeadScenario({ authority, decision, connection });
      print(evidence);
    } finally {
      await connection.end();
    }
    if (command === 'scenario:verify') {
      // Contained application acceptance imports the public router graph; its
      // module-level workers retain event-loop handles after success, so an
      // explicit exit mirrors the failure path instead of hanging the shell.
      process.exit(0);
    }
    return;
  }

  if (
    command === 'ple-publication-entitlement:prepare' ||
    command === 'ple-publication-entitlement:verify' ||
    command === 'ple-reviewer:prepare' ||
    command === 'ple-reviewer:verify'
  ) {
    const isPrepare = command.endsWith(':prepare');
    const operation = isPrepare ? 'test-fixture' : 'verification';
    const authority = authorityFor(operation, isPrepare ? 'local-owner' : undefined);
    const decision = authorizationFor(authority);
    const connection = await createAuthoritySqlConnection(authority, decision);
    try {
      const isReviewer = command.startsWith('ple-reviewer:');
      const evidence = isReviewer
        ? isPrepare
          ? await preparePleReviewerFixture({ authority, decision, connection })
          : await verifyPleReviewerFixture({ authority, decision, connection })
        : isPrepare
          ? await preparePlePublicationEntitlement({ authority, decision, connection })
          : await verifyPlePublicationEntitlement({ authority, decision, connection });
      print(evidence);
    } finally {
      await connection.end();
    }
    return;
  }

  if (command === 'schema:tidb-audit') {
    // Offline audit: never resolves credentials or opens a connection.
    const report = auditTidbStructuralAdmission(normalizedDesiredSchema(schema));
    print(report);
    if (!report.admitted) process.exitCode = 1;
    return;
  }

  const authority = authorityFor('diagnostics');
  const decision = authorizationFor(authority);
  const connection = await createAuthoritySqlConnection(authority, decision);
  try {
    const desired = normalizedDesiredSchema(schema);
    const actual = await normalizedPhysicalSchema(connection, authority.context.provider, desired);
    const report = compareNormalizedSchemas(desired, actual);
    const physicalCheckEnforcement = summarizeCheckConstraintEnforcement(actual);
    const checkConstraintEnforcement = await readTiDbCheckConstraintCapability(
      connection,
      authority.context.provider,
    );
    const congruent =
      report.congruent &&
      (!checkConstraintEnforcement.applicable || checkConstraintEnforcement.enabled === true);
    print({
      targetFingerprintHash: authority.context.targetFingerprintHash,
      targetClass: authority.context.targetClass,
      ...report,
      congruent,
      checkConstraintEnforcement: {
        ...checkConstraintEnforcement,
        physical: physicalCheckEnforcement,
      },
      differences: report.differences.slice(0, 100),
      omittedDifferenceCount: Math.max(0, report.differences.length - 100),
    });
    if (!congruent) process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

const command = process.argv[2] as Command | undefined;
const commands = new Set<Command>([
  'context',
  'manifest',
  'data:manifest',
  'b08:inspector:provision',
  'b08:inspect-metadata',
  'worktree:create',
  'worktree:dispose',
  'worktree:ack',
  'migration:plan',
  'migration:apply',
  'migration-recovery:plan',
  'migration-recovery:apply',
  'release-migration-recovery:plan',
  'release-migration-recovery:apply',
  'release-commercial-quote-terms-recovery:plan',
  'release-commercial-quote-terms-recovery:apply',
  'release-tidb-check-constraint-convergence:plan',
  'release-tidb-check-constraint-convergence:apply',
  'release:plan',
  'release:apply',
  'release-reference:plan',
  'release-reference:apply',
  'release-reference:verify',
  'readiness',
  'schema:check',
  'schema:tidb-audit',
  'reference:prepare',
  'reference:verify',
  'foundation:prepare',
  'foundation:verify',
  'scenario:prepare',
  'scenario:verify',
  'listing-preview:prepare',
  'listing-preview:verify',
  'homepage-preview:prepare',
  'homepage-preview:verify',
  'ple-publication-entitlement:prepare',
  'ple-publication-entitlement:verify',
  'ple-reviewer:prepare',
  'ple-reviewer:verify',
]);

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  if (!command || !commands.has(command)) {
    console.error(`Usage: databaseAuthorityCli.ts <${[...commands].join('|')}> [--name=value]`);
    process.exit(1);
  }
  run(command).catch(error => {
    console.error(error instanceof Error ? error.message : 'Database authority command failed.');
    process.exit(1);
  });
}
