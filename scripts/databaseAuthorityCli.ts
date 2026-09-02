import { resolve } from 'node:path';
import * as schema from '../drizzle/schema';
import {
  authorizeDatabaseOperation,
  expectedDatabaseAcknowledgement,
  protectedDatabaseApprovalFromEnvironment,
} from '../server/_core/databaseAuthority/authorization';
import { createAuthoritySqlConnection } from '../server/_core/databaseAuthority/connectionAuthority';
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
} from '../server/_core/databaseAuthority/types';
import { loadAndValidateMigrationManifest } from '../server/migrations/migrationManifest';
import { runRejectedZeroStatementRecovery } from '../server/migrations/recoverRejectedZeroStatementMigration';
import { runSqlMigrations } from '../server/migrations/runSqlMigrations';

type Command =
  | 'context'
  | 'manifest'
  | 'data:manifest'
  | 'worktree:create'
  | 'worktree:dispose'
  | 'worktree:ack'
  | 'migration:plan'
  | 'migration:apply'
  | 'migration-recovery:plan'
  | 'migration-recovery:apply'
  | 'release:plan'
  | 'release:apply'
  | 'release-reference:plan'
  | 'release-reference:apply'
  | 'release-reference:verify'
  | 'readiness'
  | 'schema:check'
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
    credentialClass: credentialClass(fallbackCredential),
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

  if (command === 'context') {
    const authority = authorityFor(operationOption('read-only-connect'));
    print({
      ...authority.context,
      localService: {
        host: LOCAL_SERVICE_HOST,
        port: LOCAL_SERVICE_PORT,
        directory: localServiceRoot(),
        dataDirectory: localServiceDataDir(),
        fingerprint: localServiceFingerprint(),
        legacyHomeDirectory: localServiceLegacyRoot(),
        legacyPathPolicy: 'inactive-residue-only; never adopted or deleted automatically',
      },
    });
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
    command === 'migration-recovery:plan' ||
    command === 'migration-recovery:apply'
  ) {
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

  const authority = authorityFor('diagnostics');
  const decision = authorizationFor(authority);
  const connection = await createAuthoritySqlConnection(authority, decision);
  try {
    const desired = normalizedDesiredSchema(schema);
    const actual = await normalizedPhysicalSchema(connection);
    const report = compareNormalizedSchemas(desired, actual);
    print({
      targetFingerprintHash: authority.context.targetFingerprintHash,
      targetClass: authority.context.targetClass,
      ...report,
      differences: report.differences.slice(0, 100),
      omittedDifferenceCount: Math.max(0, report.differences.length - 100),
    });
    if (!report.congruent) process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

const command = process.argv[2] as Command | undefined;
const commands = new Set<Command>([
  'context',
  'manifest',
  'data:manifest',
  'worktree:create',
  'worktree:dispose',
  'worktree:ack',
  'migration:plan',
  'migration:apply',
  'migration-recovery:plan',
  'migration-recovery:apply',
  'release:plan',
  'release:apply',
  'release-reference:plan',
  'release-reference:apply',
  'release-reference:verify',
  'readiness',
  'schema:check',
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
