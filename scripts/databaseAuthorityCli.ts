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
  prepareSearchToLeadScenario,
  verifySearchToLeadScenario,
} from '../server/_core/databaseAuthority/dataAdapters/searchToLeadScenario';
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
import { runSqlMigrations } from '../server/migrations/runSqlMigrations';

type Command =
  | 'context'
  | 'manifest'
  | 'worktree:create'
  | 'worktree:dispose'
  | 'worktree:ack'
  | 'migration:plan'
  | 'migration:apply'
  | 'release:plan'
  | 'release:apply'
  | 'readiness'
  | 'schema:check'
  | 'reference:prepare'
  | 'reference:verify'
  | 'scenario:prepare'
  | 'scenario:verify';

function option(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .slice(3)
    .find(value => value.startsWith(prefix))
    ?.slice(prefix.length);
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
    command === 'scenario:prepare' ||
    command === 'scenario:verify'
  ) {
    const isReference = command.startsWith('reference:');
    const isPrepare = command.endsWith(':prepare');
    const operation = isPrepare
      ? isReference
        ? 'reference-seed'
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
        : isPrepare
          ? await prepareSearchToLeadScenario({ authority, decision, connection })
          : await verifySearchToLeadScenario({ authority, decision, connection });
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
  'worktree:create',
  'worktree:dispose',
  'worktree:ack',
  'migration:plan',
  'migration:apply',
  'release:plan',
  'release:apply',
  'readiness',
  'schema:check',
  'reference:prepare',
  'reference:verify',
  'scenario:prepare',
  'scenario:verify',
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
