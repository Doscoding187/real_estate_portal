import { completeLegalReleaseCommand, LegalReleaseCommandFailure } from './legalReleaseCommand';
import {
  completePlaceReleaseCommand,
  placeCommandFailure,
  PlaceReleaseCommandFailure,
  type PlaceReleaseCommand,
} from './placeReleaseCommand';
import {
  readFileSync,
} from 'node:fs';
import {
  releaseCanonicalPlaces,
  previewCanonicalPlaceRelease,
} from '../server/_core/databaseAuthority/dataAdapters/placeRelease';
import { retireFordsburgDuplicate } from '../server/_core/databaseAuthority/dataAdapters/fordsburgPlaceRetirement';
import { reconcileGautengReviewedTypes } from '../server/_core/databaseAuthority/dataAdapters/gautengReviewedTypeReconciliation';
import {
  seedGautengEvidenceNoteMismatch,
  verifyGautengEvidenceNoteMismatch,
  prepareMigrationPrefix0111,
  verifyMigrationPrefix0111,
} from '../server/_core/databaseAuthority/dataAdapters/migrationPrefix0111';
import { inspectPlaceReleaseTarget } from '../server/_core/databaseAuthority/dataAdapters/placeReleaseInspection';
import { resolve } from 'node:path';
import {
  installLegalRelease,
  prepareLegalInstallationPacket,
} from '../server/_core/databaseAuthority/legalReleaseInstallation';
import * as schema from '../drizzle/schema';
import {
  authorizeDatabaseOperation,
  expectedDatabaseAcknowledgement,
  protectedDatabaseApprovalFromEnvironment,
} from '../server/_core/databaseAuthority/authorization';
import { createAuthoritySqlConnection } from '../server/_core/databaseAuthority/connectionAuthority';
import { assertRehearsalReferenceAdapter } from '../server/_core/databaseAuthority/rehearsalAuthority';
import { provisionB08AzureInspectionIdentity } from '../server/_core/databaseAuthority/b08AzureInspectionIdentity';
import {
  provisionB08AzureMigrationIdentity,
  verifyB08AzureMigrationIdentity,
} from '../server/_core/databaseAuthority/b08AzureMigrationIdentity';
import {
  grantB08AzureRuntimeLedgerRead,
  provisionB08AzureRuntimeIdentities,
  verifyB08AzureRuntimeIdentities,
} from '../server/_core/databaseAuthority/b08AzureRuntimeIdentities';
import {
  verifyB08AzureBehavior,
  verifyB08AzureEstablishment,
} from '../server/_core/databaseAuthority/b08AzurePostApplyVerification';
import { resolveDatabaseAuthority } from '../server/_core/databaseAuthority/context';
import {
  createOwnedWorktreeDatabase,
  disposeOwnedWorktreeDatabase,
} from '../server/_core/databaseAuthority/lifecycle';
import { assessRuntimeDatabaseReadiness } from '../server/_core/databaseAuthority/readiness';
import {
  prepareCanonicalPlaces,
  prepareNationalCanonicalPlaces,
  verifyNationalCanonicalPlaces,
  verifyCanonicalPlaces,
} from '../server/_core/databaseAuthority/dataAdapters/canonicalPlaces';
import {
  assertDataRoleManifest,
  DATA_ROLE_MANIFEST,
} from '../server/_core/databaseAuthority/dataAdapters/dataRoleManifest';
import {
  prepareCanonicalPlatformSettings,
  verifyCanonicalPlatformSettings,
} from '../server/_core/databaseAuthority/dataAdapters/canonicalPlatformSettings';
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
  prepareDistributionReferrerPreviewFixture,
  verifyDistributionReferrerPreviewFixture,
} from '../server/_core/databaseAuthority/dataAdapters/distributionReferrerPreviewFixture';
import {
  prepareDistributionReferrerActivityPreviewFixture,
  verifyDistributionReferrerActivityPreviewFixture,
} from '../server/_core/databaseAuthority/dataAdapters/distributionReferrerActivityPreviewFixture';
import {
  prepareLocalJourneyPreview,
  verifyLocalJourneyPreview,
} from '../server/_core/databaseAuthority/dataAdapters/localJourneyPreview';
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
  prepareMigrationPrefix0096,
  verifyMigrationPrefix0096,
} from '../server/_core/databaseAuthority/dataAdapters/migrationPrefix0096';
import {
  compareNormalizedSchemas,
  normalizedDesiredSchema,
  normalizedPhysicalSchema,
  summarizeCheckConstraintEnforcement,
} from '../server/_core/databaseAuthority/schemaCongruency';
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
import { runSqlMigrations } from '../server/migrations/runSqlMigrations';

type Command =
  | 'context'
  | 'manifest'
  | 'data:manifest'
  | 'b08:inspector:provision'
  | 'b08:inspect-metadata'
  | 'b08:migrator:provision'
  | 'b08:migrator:verify'
  | 'b08:runtime:provision'
  | 'b08:runtime:verify'
  | 'b08:runtime:grant-ledger-read'
  | 'b08:verify-establishment'
  | 'b08:verify-behavior'
  | 'worktree:create'
  | 'worktree:dispose'
  | 'worktree:ack'
  | 'migration:plan'
  | 'migration:apply'
  | 'places:prepare'
  | 'places:verify'
  | 'places:prepare-national'
  | 'places:verify-national'
  | 'release:plan'
  | 'release:apply'
  | 'release-reference:plan'
  | 'release-reference:inspect'
  | 'places:release-preview:prepare'
  | 'places:release-preview:verify'
  | 'places:identity-retirement:prepare'
  | 'places:identity-retirement:verify'
  | 'places:type-reconciliation:prepare'
  | 'places:type-reconciliation:verify'
  | 'release-reference:apply'
  | 'release-reference:verify'
  | 'legal-release:prepare'
  | 'legal-release:plan'
  | 'legal-release:apply'
  | 'legal-release:verify'
  | 'readiness'
  | 'schema:check'
  | 'platform-settings:prepare'
  | 'platform-settings:verify'
  | 'foundation:prepare'
  | 'foundation:verify'
  | 'scenario:prepare'
  | 'scenario:verify'
  | 'listing-preview:prepare'
  | 'listing-preview:verify'
  | 'distribution-referrer-preview:prepare'
  | 'distribution-referrer-preview:verify'
  | 'distribution-referrer-activity:prepare'
  | 'distribution-referrer-activity:verify'
  | 'local-journey:prepare'
  | 'local-journey:verify'
  | 'homepage-preview:prepare'
  | 'homepage-preview:verify'
  | 'ple-publication-entitlement:prepare'
  | 'ple-publication-entitlement:verify'
  | 'ple-reviewer:prepare'
  | 'ple-reviewer:verify'
  | 'migration-prefix-0096:seed'
  | 'migration-prefix-0096:verify'
  | 'migration-prefix-0111:seed'
  | 'migration-prefix-0111:verify'
  | 'gauteng-evidence-note-mismatch:seed'
  | 'gauteng-evidence-note-mismatch:verify';

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
    port: Number(LOCAL_SERVICE_PORT),
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

  if (command === 'b08:migrator:provision') {
    print(await provisionB08AzureMigrationIdentity());
    return;
  }

  if (command === 'b08:migrator:verify') {
    print(await verifyB08AzureMigrationIdentity());
    return;
  }

  if (command === 'b08:runtime:provision') {
    print(await provisionB08AzureRuntimeIdentities(requiredOption('ack')));
    return;
  }

  if (command === 'b08:runtime:verify') {
    print(await verifyB08AzureRuntimeIdentities());
    return;
  }

  if (command === 'b08:runtime:grant-ledger-read') {
    print(await grantB08AzureRuntimeLedgerRead(requiredOption('ack')));
    return;
  }

  if (command === 'b08:verify-establishment') {
    print(await verifyB08AzureEstablishment());
    return;
  }

  if (command === 'b08:verify-behavior') {
    print(await verifyB08AzureBehavior(requiredOption('ack')));
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
        @@session.sql_require_primary_key AS sql_require_primary_key,
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
          requirePrimaryKey: session.sql_require_primary_key,
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
      ancestorHead: option('ancestor-head'),
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

  if (command === 'places:release-preview:prepare' || command === 'places:release-preview:verify') {
    const prepare = command.endsWith(':prepare');
    const authority = authorityFor(
      prepare ? 'reference-seed' : 'verification',
      prepare ? 'local-owner' : undefined,
    );
    const decision = authorizationFor(authority);
    print(
      await completePlaceReleaseCommand({
        command,
        open: () => createAuthoritySqlConnection(authority, decision),
        operation: connection => previewCanonicalPlaceRelease({ authority, decision, connection }),
      }),
    );
    return;
  }

  if (command === 'places:identity-retirement:prepare' || command === 'places:identity-retirement:verify') {
    const prepare = command.endsWith(':prepare');
    const authority = authorityFor(
      prepare ? 'reference-seed' : 'verification',
      prepare ? 'local-owner' : undefined,
    );
    const decision = authorizationFor(authority);
    print(
      await completePlaceReleaseCommand({
        command,
        open: () => createAuthoritySqlConnection(authority, decision),
        operation: connection => retireFordsburgDuplicate({ authority, decision, connection }),
      }),
    );
    return;
  }

  if (command === 'places:type-reconciliation:prepare' || command === 'places:type-reconciliation:verify') {
    const prepare = command.endsWith(':prepare');
    const authority = authorityFor(
      prepare ? 'reference-seed' : 'verification',
      prepare ? 'local-owner' : undefined,
    );
    const decision = authorizationFor(authority);
    print(
      await completePlaceReleaseCommand({
        command,
        open: () => createAuthoritySqlConnection(authority, decision),
        operation: connection =>
          reconcileGautengReviewedTypes({ authority, decision, connection }),
      }),
    );
    return;
  }

  if (command === 'release-reference:inspect') {
    if (requiredOption('adapter') !== 'places')
      throw new Error('Only Place release inspection is supported.');
    const authority = authorityFor('release-reference-plan', 'read-only');
    const decision = authorizationFor(authority);
    assertRehearsalReferenceAdapter({
      context: authority.context,
      decision,
      adapter: 'places-inspection',
    });
    print(
      await completePlaceReleaseCommand({
        command,
        open: () => createAuthoritySqlConnection(authority, decision),
        operation: connection => inspectPlaceReleaseTarget({ authority, decision, connection }),
      }),
    );
    return;
  }

  if (
    command === 'release-reference:plan' ||
    command === 'release-reference:apply' ||
    command === 'release-reference:verify'
  ) {
    const adapter = option('adapter') ?? 'commercial';
    if (!['commercial', 'places', 'fordsburg-retirement', 'gauteng-type-reconciliation'].includes(adapter))
      throw new Error('Unknown reference adapter.');
    const isPlan = command.endsWith(':plan');
    const isApply = command.endsWith(':apply');
    const operation: DatabaseOperation = isPlan
      ? 'release-reference-plan'
      : isApply
        ? 'release-reference-apply'
        : 'release-reference-verify';
    const authority = authorityFor(operation, isApply ? 'migration' : 'read-only');
    const decision = authorizationFor(authority, option('ack'));
    assertRehearsalReferenceAdapter({ context: authority.context, decision, adapter });
    if (adapter === 'places') {
      print(
        await completePlaceReleaseCommand({
          command,
          open: () => createAuthoritySqlConnection(authority, decision),
          operation: connection =>
            releaseCanonicalPlaces({
              authority,
              decision,
              connection,
              expectedPlanDigest: isApply ? requiredOption('plan-digest') : undefined,
            }),
        }),
      );
      return;
    }
    if (adapter === 'fordsburg-retirement') {
      print(
        await completePlaceReleaseCommand({
          command,
          open: () => createAuthoritySqlConnection(authority, decision),
          operation: connection =>
            retireFordsburgDuplicate({
              authority,
              decision,
              connection,
              expectedPlanDigest: isApply ? requiredOption('plan-digest') : undefined,
            }),
        }),
      );
      return;
    }
    if (adapter === 'gauteng-type-reconciliation') {
      print(
        await completePlaceReleaseCommand({
          command,
          open: () => createAuthoritySqlConnection(authority, decision),
          operation: connection =>
            reconcileGautengReviewedTypes({
              authority,
              decision,
              connection,
              expectedPlanDigest: isApply ? requiredOption('plan-digest') : undefined,
            }),
        }),
      );
      return;
    }
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

  if (command === 'legal-release:prepare') {
    const previous = requiredOption('previous-bundle');
    print(
      prepareLegalInstallationPacket({
        root: process.cwd(),
        plannedEffectiveAt: requiredOption('effective-at'),
        validUntil: requiredOption('valid-until'),
        expectedPreviousBundleId: previous === 'none' ? null : previous,
      }),
    );
    return;
  }

  if (command.startsWith('legal-release:')) {
    const apply = command === 'legal-release:apply';
    const operation: DatabaseOperation = apply
      ? 'legal-release-apply'
      : command === 'legal-release:plan'
        ? 'legal-release-plan'
        : 'legal-release-verify';
    const packet = JSON.parse(readFileSync(resolve(requiredOption('packet')), 'utf8'));
    const expectedPlanDigest = apply ? requiredOption('plan-digest') : undefined;
    const authority = authorityFor(operation, apply ? 'migration' : 'read-only');
    const decision = authorizationFor(authority, option('ack'));
    const connection = await createAuthoritySqlConnection(authority, decision);
    print(
      await completeLegalReleaseCommand({
        connection,
        operation: () =>
          installLegalRelease({ authority, decision, connection, packet, expectedPlanDigest }),
      }),
    );
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

  if (command === 'places:prepare' || command === 'places:verify') {
    const isPrepare = command === 'places:prepare';
    const operation: DatabaseOperation = isPrepare ? 'reference-seed' : 'verification';
    const authority = authorityFor(operation, isPrepare ? 'local-owner' : undefined);
    const decision = authorizationFor(authority);
    const connection = await createAuthoritySqlConnection(authority, decision);
    // Explicit territory selection. Without it a second province's load is
    // indistinguishable from the default territory's, and a Gauteng pass would be
    // reported as Western Cape proof.
    const territoryId = option('territory');
    const territory = territoryId ? { territoryId } : {};
    try {
      print(
        isPrepare
          ? await prepareCanonicalPlaces({ authority, decision, connection, ...territory })
          : await verifyCanonicalPlaces({ authority, decision, connection, ...territory }),
      );
    } finally {
      await connection.end();
    }
    return;
  }

  /**
   * National storage proof. Separate from `places:prepare` because it answers a
   * different question: `places:prepare` proves one province on its own target, this
   * proves all of them coexist in one target in one transaction. It takes no
   * `--territory`, because a national load that loads some provinces is not national.
   */
  if (command === 'places:prepare-national' || command === 'places:verify-national') {
    const isPrepare = command === 'places:prepare-national';
    const authority = authorityFor(
      isPrepare ? 'reference-seed' : 'verification',
      isPrepare ? 'local-owner' : undefined,
    );
    const decision = authorizationFor(authority);
    const connection = await createAuthoritySqlConnection(authority, decision);
    try {
      print(
        isPrepare
          ? await prepareNationalCanonicalPlaces({ authority, decision, connection })
          : await verifyNationalCanonicalPlaces({ authority, decision, connection }),
      );
    } finally {
      await connection.end();
    }
    return;
  }

  if (command === 'platform-settings:prepare' || command === 'platform-settings:verify') {
    const isPrepare = command === 'platform-settings:prepare';
    const operation: DatabaseOperation = isPrepare ? 'reference-seed' : 'verification';
    const authority = authorityFor(operation, isPrepare ? 'local-owner' : undefined);
    const decision = authorizationFor(authority);
    const connection = await createAuthoritySqlConnection(authority, decision);
    try {
      print(
        isPrepare
          ? await prepareCanonicalPlatformSettings({ authority, decision, connection })
          : await verifyCanonicalPlatformSettings({ authority, decision, connection }),
      );
    } finally {
      await connection.end();
    }
    return;
  }

  if (
    command === 'foundation:prepare' ||
    command === 'foundation:verify' ||
    command === 'scenario:prepare' ||
    command === 'scenario:verify' ||
    command === 'listing-preview:prepare' ||
    command === 'listing-preview:verify' ||
    command === 'distribution-referrer-preview:prepare' ||
    command === 'distribution-referrer-preview:verify' ||
    command === 'distribution-referrer-activity:prepare' ||
    command === 'distribution-referrer-activity:verify' ||
    command === 'homepage-preview:prepare' ||
    command === 'homepage-preview:verify' ||
    command === 'local-journey:prepare' ||
    command === 'local-journey:verify'
  ) {
    if (command.startsWith('local-journey:')) {
      const isPrepare = command.endsWith(':prepare');
      const authority = authorityFor(
        isPrepare ? 'demo-seed' : 'verification',
        isPrepare ? 'local-owner' : undefined,
      );
      const decision = authorizationFor(authority);
      const connection = await createAuthoritySqlConnection(authority, decision);
      try {
        print(
          await (isPrepare ? prepareLocalJourneyPreview : verifyLocalJourneyPreview)({
            authority,
            decision,
            connection,
          }),
        );
      } finally {
        await connection.end();
      }
      return;
    }

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

    if (command.startsWith('distribution-referrer-preview:')) {
      const isPrepare = command.endsWith(':prepare');
      const operation = isPrepare ? 'demo-seed' : 'verification';
      const authority = authorityFor(operation, isPrepare ? 'local-owner' : undefined);
      const decision = authorizationFor(authority);
      const connection = await createAuthoritySqlConnection(authority, decision);
      try {
        const evidence = isPrepare
          ? await prepareDistributionReferrerPreviewFixture({ authority, decision, connection })
          : await verifyDistributionReferrerPreviewFixture({ authority, decision, connection });
        print(evidence);
      } finally {
        await connection.end();
      }
      return;
    }

    if (command.startsWith('distribution-referrer-activity:')) {
      const isPrepare = command.endsWith(':prepare');
      const operation = isPrepare ? 'demo-seed' : 'verification';
      const authority = authorityFor(operation, isPrepare ? 'local-owner' : undefined);
      const decision = authorizationFor(authority);
      const connection = await createAuthoritySqlConnection(authority, decision);
      try {
        const evidence = isPrepare
          ? await prepareDistributionReferrerActivityPreviewFixture({
              authority,
              decision,
              connection,
            })
          : await verifyDistributionReferrerActivityPreviewFixture({
              authority,
              decision,
              connection,
            });
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

    const isFoundation = command.startsWith('foundation:');
    const isPrepare = command.endsWith(':prepare');
    const operation = isPrepare
      ? isFoundation
        ? 'foundation-seed'
        : 'scenario-seed'
      : 'verification';
    const authority = authorityFor(operation, isPrepare ? 'local-owner' : undefined);
    const decision = authorizationFor(authority);
    const connection = await createAuthoritySqlConnection(authority, decision);
    try {
      const evidence = isFoundation
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

  if (
    command === 'gauteng-evidence-note-mismatch:seed' ||
    command === 'gauteng-evidence-note-mismatch:verify'
  ) {
    const isSeed = command.endsWith(':seed');
    const authority = authorityFor(
      isSeed ? 'test-fixture' : 'verification',
      isSeed ? 'local-owner' : undefined,
    );
    const decision = authorizationFor(authority);
    const connection = await createAuthoritySqlConnection(authority, decision);
    try {
      print(
        await (isSeed ? seedGautengEvidenceNoteMismatch : verifyGautengEvidenceNoteMismatch)(
          { authority, decision, connection },
        ),
      );
    } finally {
      await connection.end();
    }
    return;
  }

  if (
    command === 'migration-prefix-0096:seed' || command === 'migration-prefix-0096:verify' ||
    command === 'migration-prefix-0111:seed' || command === 'migration-prefix-0111:verify'
  ) {
    const isPrepare = command.endsWith(':seed');
    const operation = isPrepare ? 'test-fixture' : 'verification';
    const authority = authorityFor(operation, isPrepare ? 'local-owner' : undefined);
    const decision = authorizationFor(authority);
    const connection = await createAuthoritySqlConnection(authority, decision);
    try {
      if (command.startsWith('migration-prefix-0111:')) {
        print(await (isPrepare ? prepareMigrationPrefix0111 : verifyMigrationPrefix0111)({ authority, decision, connection }));
      } else {
        print(await (isPrepare ? prepareMigrationPrefix0096 : verifyMigrationPrefix0096)({ authority, decision, connection }));
      }
    } finally {
      await connection.end();
    }
    return;
  }

  if (command !== 'schema:check') {
    throw new Error(`Database diagnostics refused for unsupported command ${command}.`);
  }
  const authority = authorityFor('diagnostics');
  const decision = authorizationFor(authority);
  const connection = await createAuthoritySqlConnection(authority, decision);
  try {
    const desired = normalizedDesiredSchema(schema);
    const actual = await normalizedPhysicalSchema(connection, authority.context.provider, desired);
    const report = compareNormalizedSchemas(desired, actual);
    const physicalCheckEnforcement = summarizeCheckConstraintEnforcement(actual);
    const congruent = report.congruent && physicalCheckEnforcement.allEnforced;
    print({
      targetFingerprintHash: authority.context.targetFingerprintHash,
      targetClass: authority.context.targetClass,
      ...report,
      congruent,
      checkConstraintEnforcement: physicalCheckEnforcement,
      differences: report.differences.slice(0, 100),
      omittedDifferenceCount: Math.max(0, report.differences.length - 100),
    });
    if (!congruent) process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

/** Actual CLI entry boundary; only Place commands receive this structured failure policy. */
export async function runDatabaseAuthorityCommand(command: Command): Promise<void> {
  try {
    await run(command);
  } catch (error) {
    if (error instanceof LegalReleaseCommandFailure) {
      console.error(
        JSON.stringify(
          {
            command,
            unsafeToReplay: true,
            connectionClosed: false,
            operationResult: error.operationResult ?? null,
            primaryFailurePresent: error.primaryFailure !== undefined,
            message: error.message,
          },
          null,
          2,
        ),
      );
      throw error;
    }
    const placeCommand =
      command.startsWith('places:release-preview:') ||
      command.startsWith('places:identity-retirement:') ||
      command.startsWith('places:type-reconciliation:') ||
      command === 'release-reference:inspect' ||
      (command.startsWith('release-reference:') && ['places', 'fordsburg-retirement', 'gauteng-type-reconciliation'].includes(option('adapter') ?? ''));
    if (!placeCommand) throw error;
    const failure =
      error instanceof PlaceReleaseCommandFailure
        ? error
        : placeCommandFailure(command as PlaceReleaseCommand, error);
    console.error(JSON.stringify(failure.record, null, 2));
    throw failure;
  }
}

const command = process.argv[2] as Command | undefined;
const commands = new Set<Command>([
  'context',
  'manifest',
  'data:manifest',
  'b08:inspector:provision',
  'b08:inspect-metadata',
  'b08:migrator:provision',
  'b08:migrator:verify',
  'b08:runtime:provision',
  'b08:runtime:verify',
  'b08:runtime:grant-ledger-read',
  'b08:verify-establishment',
  'b08:verify-behavior',
  'worktree:create',
  'worktree:dispose',
  'worktree:ack',
  'migration:plan',
  'migration:apply',
  'release:plan',
  'release:apply',
  'release-reference:plan',
  'release-reference:inspect',
  'places:release-preview:prepare',
  'places:release-preview:verify',
  'places:identity-retirement:prepare',
  'places:identity-retirement:verify',
  'places:type-reconciliation:prepare',
  'places:type-reconciliation:verify',
  'release-reference:apply',
  'release-reference:verify',
  'legal-release:prepare',
  'legal-release:plan',
  'legal-release:apply',
  'legal-release:verify',
  'readiness',
  'schema:check',
  'platform-settings:prepare',
  'platform-settings:verify',
  'places:prepare',
  'places:verify',
  'places:prepare-national',
  'places:verify-national',
  'foundation:prepare',
  'foundation:verify',
  'scenario:prepare',
  'scenario:verify',
  'listing-preview:prepare',
  'listing-preview:verify',
  'distribution-referrer-preview:prepare',
  'distribution-referrer-preview:verify',
  'distribution-referrer-activity:prepare',
  'distribution-referrer-activity:verify',
  'local-journey:prepare',
  'local-journey:verify',
  'homepage-preview:prepare',
  'homepage-preview:verify',
  'ple-publication-entitlement:prepare',
  'ple-publication-entitlement:verify',
  'ple-reviewer:prepare',
  'ple-reviewer:verify',
  'migration-prefix-0096:seed',
  'migration-prefix-0096:verify',
  'migration-prefix-0111:seed',
  'migration-prefix-0111:verify',
  'gauteng-evidence-note-mismatch:seed',
  'gauteng-evidence-note-mismatch:verify',
]);

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  if (!command || !commands.has(command)) {
    console.error(`Usage: databaseAuthorityCli.ts <${[...commands].join('|')}> [--name=value]`);
    process.exit(1);
  }
  runDatabaseAuthorityCommand(command).catch(error => {
    if (!(error instanceof PlaceReleaseCommandFailure))
      console.error(error instanceof Error ? error.message : 'Database authority command failed.');
    process.exit(1);
  });
}
