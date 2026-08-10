import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  authorizeDatabaseOperation,
  protectedDatabaseApprovalFromEnvironment,
} from '../server/_core/databaseAuthority/authorization';
import { resolveDatabaseAuthority } from '../server/_core/databaseAuthority/context';
import { assessRuntimeDatabaseReadiness } from '../server/_core/databaseAuthority/readiness';
import {
  LOCAL_SERVICE_HOST,
  LOCAL_SERVICE_PORT,
  localServiceDataDir,
  localServiceFingerprint,
  localServiceRoot,
} from '../server/_core/databaseAuthority/localServicePaths';
import { loadAndValidateMigrationManifest } from '../server/migrations/migrationManifest';
import {
  inspectCentralLocalEnvironment,
  inspectWorktreeLink,
  requiredLocalVariableStates,
  resolveCentralLocalEnvironment,
} from './localEnvironmentAuthority';

export type AuthorityManifest = {
  authorityVersion: number;
  canonicalMigrationPath: string;
  activeMigrationDirectory: string;
  archivedMigrationDirectory: string;
  canonicalDrizzleSchemaRoots: string[];
  migrationRunner: string;
  migrationManifest: string;
  migrationLedger: string;
  migrationAttemptLedger: string;
  resolvedContextAuthority: string;
  operationPolicy: string;
  connectionAuthority: string;
  worktreeLifecycleAuthority: string;
  worktreeProfileRelativeDirectory: string;
  worktreeDatabasePrefix: string;
  schemaCongruencyAuthority: string;
  readinessAuthority: string;
  connectionPathInventory: string;
  continuationPackets: string;
  approvedLocalDatabaseName: string;
  localEnvironmentTemplate: string;
  machineLocalEnvironmentRelativePath: string;
  requiredLocalVariables: string[];
  approvedLocalHosts: string[];
  approvedLocalCommands: string[];
  destructiveLocalCommands: string[];
  prohibitedCommandCategories: string[];
  localSeedEntrypoint: string;
  verificationEntrypoints: string[];
  consumerContractEntrypoint: string;
  staticAuthorityCheck: string;
  agentEntryContract: string;
  databaseChangeProtocol: string;
  migrationTreeAuthority: string;
  residualUtilityAuthority: string;
  localServicePathAuthority: string;
  localServiceLifecycle: string;
  localServiceDirectoryPattern: string;
  canonicalReferenceDataAdapter: string;
  acceptanceScenarioAdapter: string;
};

const MANIFEST_PATH = 'docs/database-authority/authority-manifest.json';
const REQUIRED_PACKAGE_SCRIPTS = [
  'db:authority:status',
  'db:authority:manifest',
  'db:authority:context',
  'db:authority:consumer-contract',
  'db:authority:check',
  'db:worktree:create',
  'db:worktree:dispose',
  'db:migrate:plan',
  'db:migrate:apply',
  'db:release:plan',
  'db:release:ack',
  'db:release:apply',
  'db:readiness',
  'db:schema:congruency',
  'db:authority:service:start',
  'db:authority:service:wait',
  'db:authority:service:status',
  'db:authority:service:stop',
  'db:authority:service:recover',
  'db:reference:prepare',
  'db:reference:verify',
  'db:scenario:prepare',
  'db:scenario:verify',
] as const;

export function loadAuthorityManifest(root = process.cwd()): AuthorityManifest {
  return JSON.parse(readFileSync(resolve(root, MANIFEST_PATH), 'utf8')) as AuthorityManifest;
}

export function validateAuthorityManifest(manifest: AuthorityManifest, root = process.cwd()) {
  const paths = [
    manifest.canonicalMigrationPath,
    manifest.activeMigrationDirectory,
    manifest.archivedMigrationDirectory,
    ...manifest.canonicalDrizzleSchemaRoots,
    manifest.migrationRunner,
    manifest.migrationManifest,
    manifest.resolvedContextAuthority,
    manifest.operationPolicy,
    manifest.connectionAuthority,
    manifest.worktreeLifecycleAuthority,
    manifest.schemaCongruencyAuthority,
    manifest.readinessAuthority,
    manifest.connectionPathInventory,
    manifest.continuationPackets,
    manifest.localEnvironmentTemplate,
    manifest.localSeedEntrypoint,
    ...manifest.verificationEntrypoints,
    manifest.consumerContractEntrypoint,
    manifest.staticAuthorityCheck,
    manifest.agentEntryContract,
    manifest.databaseChangeProtocol,
    manifest.migrationTreeAuthority,
    manifest.residualUtilityAuthority,
    manifest.localServicePathAuthority,
    manifest.localServiceLifecycle,
    manifest.canonicalReferenceDataAdapter,
    manifest.acceptanceScenarioAdapter,
  ];
  const missingPaths = paths.filter(path => !existsSync(resolve(root, path)));
  const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  const scripts = packageJson.scripts ?? {};
  const missingScripts = [
    ...REQUIRED_PACKAGE_SCRIPTS,
    ...manifest.approvedLocalCommands,
    ...manifest.destructiveLocalCommands,
  ].filter(script => !scripts[script]);
  const invalid = [
    manifest.authorityVersion !== 3 ? 'authority version must be 3' : '',
    manifest.approvedLocalDatabaseName !== 'listify_local'
      ? 'quarantined local database identity must remain listify_local'
      : '',
    manifest.migrationLedger !== 'sql_migration_history'
      ? 'successful migration history table is inconsistent'
      : '',
    manifest.migrationAttemptLedger !== 'sql_migration_attempts'
      ? 'migration attempt table is inconsistent'
      : '',
    manifest.worktreeDatabasePrefix !== 'listify_wt_'
      ? 'worktree database prefix is inconsistent'
      : '',
    manifest.machineLocalEnvironmentRelativePath !== '.config/property-listify/local.env'
      ? 'machine-local environment path is inconsistent'
      : '',
    manifest.worktreeProfileRelativeDirectory !== '.config/property-listify/worktrees'
      ? 'worktree profile directory is inconsistent'
      : '',
    manifest.localServiceDirectoryPattern !== '/var/tmp/property-listify-<uid>/mysql-3307'
      ? 'local service directory pattern is inconsistent'
      : '',
  ].filter(Boolean);

  if (missingPaths.length || missingScripts.length || invalid.length) {
    throw new Error(
      `Database authority manifest is inconsistent: ${[
        missingPaths.length ? `missing paths: ${missingPaths.join(', ')}` : '',
        missingScripts.length ? `missing scripts: ${missingScripts.join(', ')}` : '',
        ...invalid,
      ]
        .filter(Boolean)
        .join('; ')}`,
    );
  }
}

type Target = {
  classification: 'local' | 'test' | 'staging' | 'production' | 'unknown';
  approved: boolean;
  host: string;
  database: string;
  url?: URL;
};

/** Compatibility-only classifier. New operations must use resolveDatabaseAuthority(). */
export function classifyDatabaseTarget(
  rawUrl: string | undefined,
  manifest: AuthorityManifest,
  env: NodeJS.ProcessEnv = process.env,
): Target {
  if (!rawUrl) {
    return { classification: 'unknown', approved: false, host: '(unset)', database: '(unset)' };
  }
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { classification: 'unknown', approved: false, host: '(invalid)', database: '(invalid)' };
  }
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase() || '(none)';
  const rawDatabaseName = url.pathname.replace(/^\//, '');
  if (!/^[A-Za-z0-9_]+$/.test(rawDatabaseName)) {
    return { classification: 'unknown', approved: false, host: '(invalid)', database: '(invalid)' };
  }
  const database = rawDatabaseName;
  const runtimeModes = [env.APP_ENV, env.NODE_ENV]
    .filter((mode): mode is string => Boolean(mode))
    .map(mode => mode.toLowerCase());
  const runtime = runtimeModes[0] ?? '';
  const unsafeRuntime = runtimeModes.some(mode => mode === 'production' || mode === 'staging');
  const localHost = manifest.approvedLocalHosts
    .map(value => value.replace(/^\[|\]$/g, '').toLowerCase())
    .includes(host);
  if (
    url.protocol === 'mysql:' &&
    localHost &&
    database === manifest.approvedLocalDatabaseName &&
    !unsafeRuntime &&
    runtimeModes.every(mode => mode === 'development' || mode === 'test')
  ) {
    return { classification: 'local', approved: true, host, database, url };
  }
  if (
    url.protocol === 'mysql:' &&
    localHost &&
    database === 'listify_test' &&
    !unsafeRuntime &&
    runtimeModes.every(mode => mode === 'development' || mode === 'test')
  ) {
    return { classification: 'test', approved: true, host, database, url };
  }
  if (
    runtime === 'production' ||
    database === 'listify_property_sa' ||
    /prod|railway|tidb/i.test(host)
  ) {
    return { classification: 'production', approved: false, host, database, url };
  }
  if (runtime === 'staging' || database === 'listify_staging' || /stag/i.test(host)) {
    return { classification: 'staging', approved: false, host, database, url };
  }
  return { classification: 'unknown', approved: false, host, database, url };
}

async function main() {
  const manifest = loadAuthorityManifest();
  validateAuthorityManifest(manifest);
  const lineage = loadAndValidateMigrationManifest();
  const authority = resolveDatabaseAuthority({ operation: 'readiness' });
  const authorization = authorizeDatabaseOperation(authority, {
    approval: protectedDatabaseApprovalFromEnvironment(authority),
  });
  const readiness = await assessRuntimeDatabaseReadiness({ authority, authorization });
  const centralPath = resolveCentralLocalEnvironment();
  const central = inspectCentralLocalEnvironment(centralPath);
  const worktreeLink = inspectWorktreeLink(process.cwd(), centralPath);
  const variableStates = requiredLocalVariableStates(central.values);

  console.log(`Database Authority Version: ${manifest.authorityVersion}`);
  console.log(`Canonical Baseline: ${manifest.canonicalMigrationPath}`);
  console.log(`Canonical Manifest: ${manifest.migrationManifest}`);
  console.log(`Manifest Digest: ${lineage.manifestDigest}`);
  console.log(`Expected Manifest Head: ${lineage.document.expectedHead}`);
  console.log(`Current Migration Ledger State: ${readiness.layers.migrationHead.code}`);
  console.log(`Incomplete Attempt State: ${readiness.layers.incompleteAttemptState.code}`);
  console.log(`Current Environment: ${authority.context.runtimeMode}`);
  console.log(`Environment Source: ${authority.context.environmentSource}`);
  console.log(`Central Local Environment: ${central.exists ? 'found' : 'missing'}`);
  console.log(`Resolved Central Path: ${central.path}`);
  console.log(`Central Permissions: ${central.permissions}`);
  console.log(`Worktree .env.local: ${worktreeLink}`);
  console.log(
    `Required Local Variables: ${Object.entries(variableStates)
      .map(([name, state]) => `${name}=${state}`)
      .join(', ')}`,
  );
  console.log(`Sanitized Target: ${authority.context.targetFingerprint}`);
  console.log(`Target Fingerprint Hash: ${authority.context.targetFingerprintHash}`);
  console.log(`Target Classification: ${authority.context.targetClass}`);
  console.log(`Local Service Host: ${LOCAL_SERVICE_HOST}`);
  console.log(`Local Service Port: ${LOCAL_SERVICE_PORT}`);
  console.log(`Local Service Directory: ${localServiceRoot()}`);
  console.log(`Local Service Data Directory: ${localServiceDataDir()}`);
  console.log(`Local Service Fingerprint: ${localServiceFingerprint()}`);
  console.log(
    `Worktree Ownership: ${authority.context.worktree.ownershipMatches ? 'exact' : 'not-exact'}`,
  );
  console.log(`Service Availability: ${readiness.layers.serviceAvailable.code}`);
  console.log(`Target Ownership: ${readiness.layers.targetOwned.code}`);
  console.log(`Schema Migrated: ${readiness.layers.schemaMigrated.code}`);
  console.log(`Schema Congruency: ${readiness.layers.schemaCongruent.code}`);
  console.log(`Canonical Reference Data: ${readiness.layers.canonicalReferenceData.code}`);
  console.log(`Acceptance Scenario Data: ${readiness.layers.acceptanceScenario.code}`);
  console.log(`Requested Runtime: ${readiness.requestedRuntime}`);
  console.log(`Application Readiness: ${readiness.applicationReady ? 'ready' : 'not-ready'}`);
  console.log(`Authority Contract Path: ${manifest.agentEntryContract}`);
  console.log(`Prohibited Operations: ${manifest.prohibitedCommandCategories.join('; ')}`);
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : 'Database authority status failed.');
    process.exit(1);
  });
}
