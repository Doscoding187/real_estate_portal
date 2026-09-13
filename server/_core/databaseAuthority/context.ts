import { createHash, randomUUID } from 'node:crypto';
import { buildMysqlConnectionSecurityConfig } from '../databaseTls';
import { storeDatabaseCredentialUrl, readDatabaseCredentialUrl } from './credentialVault';
import { resolveDatabaseEnvironment } from './environment';
import { isProtectedIntegrationBranch, readRuntimeWorktreeIdentity } from './worktreeIdentity';
import { readWorktreeDatabaseProfile } from './worktreeProfile';
import {
  isIsolatedGitHubCiService,
  isolatedCiCredentialClassForOperation,
  selectIsolatedCiCredential,
} from './isolatedCiCredentials';
import type {
  DatabaseCredentialClass,
  DatabaseOperation,
  DatabaseTargetClass,
  GitWorktreeIdentity,
  ResolvedDatabaseAuthority,
  ResolvedDatabaseContext,
} from './types';

const LOCAL_HOSTS = new Set(['127.0.0.1']);
const LOCAL_LOOPBACK_PORTS = new Set(['3307']);
// CI owns its isolated test service separately; the local development service
// above remains pinned to 127.0.0.1:3307.
const TEST_LOOPBACK_PORTS = new Set(['3306', '3307']);
const CREDENTIAL_CLASSES = new Set<DatabaseCredentialClass>([
  'runtime',
  'worker',
  'read-only',
  'migration',
  'bootstrap-admin',
  'lifecycle-admin',
  'local-owner',
  'test-owner',
  'unknown',
]);

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function decodeDatabaseName(url: URL): string {
  const rawDatabaseName = url.pathname.replace(/^\//, '');
  if (!/^[A-Za-z0-9_]+$/.test(rawDatabaseName)) {
    throw new Error(
      'Database context resolution refused: database name must use the canonical unencoded identifier form.',
    );
  }
  return rawDatabaseName;
}

type DatabaseTargetIdentity = {
  host: string;
  port: string;
  databaseName: string;
  fingerprint: string;
};

function targetIdentity(url: URL): DatabaseTargetIdentity {
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const defaultPort = url.protocol === 'mysql:' ? '3306' : '(default)';
  const port = url.port || defaultPort;
  const databaseName = decodeDatabaseName(url) || '(none)';

  return {
    host,
    port,
    databaseName,
    fingerprint: `${url.protocol.replace(':', '')}://${host}:${port}/${databaseName}`,
  };
}

function canonicalDatabaseUsername(url: URL): string {
  try {
    return decodeURIComponent(url.username).trim().toLowerCase();
  } catch {
    throw new Error('Protected migration credential refused: migration username is invalid.');
  }
}

function requiresProtectedMigrationCredential(
  targetClass: DatabaseTargetClass,
  credentialClass: DatabaseCredentialClass,
): boolean {
  return (
    credentialClass === 'migration' && (targetClass === 'staging' || targetClass === 'production')
  );
}

function selectProtectedMigrationCredential(input: {
  runtimeMode: string;
  processEnv: NodeJS.ProcessEnv;
  runtimeTarget: URL;
  runtimeTargetIdentity: DatabaseTargetIdentity;
}): string {
  // This deliberately reads only the current process environment. A protected
  // migration credential must not be sourced from a repository, worktree, or
  // central environment file.
  const rawMigrationUrl = String(input.processEnv.DATABASE_MIGRATION_URL ?? '').trim();
  if (!rawMigrationUrl) {
    throw new Error(
      'Protected migration credential refused: DATABASE_MIGRATION_URL is required in the current process environment.',
    );
  }

  let migrationTarget: URL;
  try {
    migrationTarget = new URL(rawMigrationUrl);
  } catch {
    throw new Error('Protected migration credential refused: migration target is invalid.');
  }

  let migrationIdentity: DatabaseTargetIdentity;
  try {
    migrationIdentity = targetIdentity(migrationTarget);
  } catch {
    throw new Error('Protected migration credential refused: migration target is invalid.');
  }

  if (
    migrationTarget.protocol !== 'mysql:' ||
    migrationIdentity.fingerprint !== input.runtimeTargetIdentity.fingerprint
  ) {
    throw new Error(
      'Protected migration credential refused: migration target must exactly match the approved runtime target.',
    );
  }

  if (
    !canonicalDatabaseUsername(migrationTarget) ||
    !migrationTarget.password ||
    canonicalDatabaseUsername(migrationTarget) === canonicalDatabaseUsername(input.runtimeTarget)
  ) {
    throw new Error(
      'Protected migration credential refused: migration credentials must use a distinct nonempty database username and password.',
    );
  }

  try {
    buildMysqlConnectionSecurityConfig(migrationTarget.toString(), input.runtimeMode);
  } catch {
    throw new Error(
      'Protected migration credential refused: migration credential does not satisfy the current TLS policy.',
    );
  }

  return migrationTarget.toString();
}

function classifyCredential(
  explicit: DatabaseCredentialClass | undefined,
  environmentValue: string | undefined,
  targetClass: DatabaseTargetClass,
  operation: DatabaseOperation,
  isolatedGitHubCi: boolean,
): DatabaseCredentialClass {
  const requested = explicit ?? (environmentValue as DatabaseCredentialClass | undefined);
  if (isolatedGitHubCi) {
    const expected = isolatedCiCredentialClassForOperation(operation);
    if (!expected) {
      throw new Error('Isolated CI credential refused: operation has no approved role binding.');
    }
    if (requested && requested !== expected) {
      throw new Error(
        'Isolated CI credential refused: credential class cannot override the operation role.',
      );
    }
    return expected;
  }
  if (requested) {
    if (!CREDENTIAL_CLASSES.has(requested)) {
      throw new Error('Database context resolution refused: credential class is unknown.');
    }
    return requested;
  }
  if (targetClass === 'disposable-test') return 'test-owner';
  if (targetClass === 'clean-main-local' || targetClass === 'disposable-worktree') {
    return 'local-owner';
  }
  return 'unknown';
}

function isLocalPortAllowed(host: string, port: string, runtimeMode: string): boolean {
  return runtimeMode === 'test' ? TEST_LOOPBACK_PORTS.has(port) : LOCAL_LOOPBACK_PORTS.has(port);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

export function resolveDatabaseAuthority(input: {
  operation: DatabaseOperation;
  cwd?: string;
  processEnv?: NodeJS.ProcessEnv;
  explicitDatabaseUrl?: string;
  credentialClass?: DatabaseCredentialClass;
  correlationId?: string;
  resolvedAt?: Date;
  gitIdentity?: GitWorktreeIdentity;
  centralPath?: string;
  profileRoot?: string;
}): ResolvedDatabaseAuthority {
  const cwd = input.cwd ?? process.cwd();
  const processEnv = input.processEnv ?? process.env;
  const identity = input.gitIdentity ?? readRuntimeWorktreeIdentity(cwd, { env: processEnv });
  const environment = resolveDatabaseEnvironment({
    cwd,
    processEnv,
    explicitDatabaseUrl: input.explicitDatabaseUrl,
    centralPath: input.centralPath,
  });
  if (!environment.databaseUrl) {
    throw new Error('Database context resolution refused: no database target is configured.');
  }

  let parsed: URL;
  try {
    parsed = new URL(environment.databaseUrl);
  } catch {
    throw new Error('Database context resolution refused: configured database target is invalid.');
  }

  const initialTargetIdentity = targetIdentity(parsed);
  const local = LOCAL_HOSTS.has(initialTargetIdentity.host);
  const protectedBranch = isProtectedIntegrationBranch(identity.branch);
  let source = environment.source;

  if (
    local &&
    !protectedBranch &&
    (source === 'central-local-fallback' || source === 'worktree-profile')
  ) {
    const profile = readWorktreeDatabaseProfile(identity, input.profileRoot);
    parsed.pathname = `/${profile?.databaseName ?? identity.expectedWorktreeDatabase}`;
    source = profile ? 'worktree-profile' : 'central-local-derived-worktree';
  }

  const resolvedTargetIdentity = targetIdentity(parsed);
  const resolvedHost = resolvedTargetIdentity.host;
  const resolvedPort = resolvedTargetIdentity.port;
  const resolvedDatabaseName = resolvedTargetIdentity.databaseName;
  const resolvedTargetFingerprint = resolvedTargetIdentity.fingerprint;
  const resolvedLocal = LOCAL_HOSTS.has(resolvedHost);
  const expectedTestDatabase = `listify_test_${identity.ownershipKey.slice(0, 12)}`;
  const isolatedCiTestTarget =
    environment.runtimeMode === 'test' &&
    environment.values.CI === 'true' &&
    resolvedDatabaseName === 'listify_test' &&
    resolvedLocal &&
    resolvedPort === '3306';
  const isolatedGitHubCi = isIsolatedGitHubCiService({
    runtimeMode: environment.runtimeMode,
    processEnv,
    host: resolvedHost,
    port: resolvedPort,
    databaseName: resolvedDatabaseName,
  });
  let targetClass: DatabaseTargetClass = 'unknown';
  if (
    resolvedLocal &&
    parsed.protocol === 'mysql:' &&
    isLocalPortAllowed(resolvedHost, resolvedPort, environment.runtimeMode)
  ) {
    if (resolvedDatabaseName === 'listify_local') {
      targetClass = 'clean-main-local';
    } else if (resolvedDatabaseName === identity.expectedWorktreeDatabase) {
      targetClass = 'disposable-worktree';
    } else if (
      environment.runtimeMode === 'test' &&
      (resolvedDatabaseName === expectedTestDatabase || isolatedCiTestTarget)
    ) {
      targetClass = 'disposable-test';
    }
  } else if (!resolvedLocal) {
    if (resolvedDatabaseName === 'listify_property_sa') {
      targetClass = 'production';
    } else if (resolvedDatabaseName === 'listify_staging') {
      targetClass = 'staging';
    } else {
      targetClass = 'shared-remote';
    }
  }

  const provider =
    parsed.protocol === 'mysql:' ? (/tidb/i.test(resolvedHost) ? 'tidb' : 'mysql') : 'unknown';
  const dialect = parsed.protocol === 'mysql:' ? 'mysql' : 'unknown';
  let tlsRequired = !resolvedLocal;
  let certificateVerificationRequired = !resolvedLocal;
  if (parsed.protocol === 'mysql:') {
    const security = buildMysqlConnectionSecurityConfig(parsed.toString(), environment.runtimeMode);
    tlsRequired = Boolean(security.ssl);
    certificateVerificationRequired = Boolean(security.ssl?.rejectUnauthorized);
  }

  const targetFingerprintHash = sha256(resolvedTargetFingerprint);
  const parentFingerprint = environment.values.DATABASE_AUTHORITY_PARENT_FINGERPRINT;
  if (parentFingerprint && parentFingerprint !== targetFingerprintHash) {
    throw new Error(
      'Database context resolution refused: child target fingerprint differs from the parent operation.',
    );
  }

  const ownershipMatches =
    identity.registered &&
    ((targetClass === 'disposable-worktree' &&
      resolvedDatabaseName === identity.expectedWorktreeDatabase) ||
      (targetClass === 'disposable-test' &&
        (resolvedDatabaseName === expectedTestDatabase || isolatedCiTestTarget)) ||
      (targetClass === 'clean-main-local' && protectedBranch));
  const cleanMainOwnershipMatches =
    targetClass === 'clean-main-local' &&
    protectedBranch &&
    identity.registered &&
    identity.clean &&
    Boolean(identity.originMainHead) &&
    identity.head === identity.originMainHead;
  const credentialClass = classifyCredential(
    input.credentialClass,
    environment.values.DATABASE_CREDENTIAL_CLASS,
    targetClass,
    input.operation,
    isolatedGitHubCi,
  );
  const requiresMigrationCredential = requiresProtectedMigrationCredential(
    targetClass,
    credentialClass,
  );
  const selectedIsolatedCiCredential = isolatedGitHubCi
    ? selectIsolatedCiCredential({
        operation: input.operation,
        requestedClass: credentialClass,
        processEnv,
        runtimeTarget: parsed,
      })
    : undefined;
  const credentialUrl = selectedIsolatedCiCredential
    ? selectedIsolatedCiCredential.credentialUrl
    : requiresMigrationCredential
      ? selectProtectedMigrationCredential({
          runtimeMode: environment.runtimeMode,
          processEnv,
          runtimeTarget: parsed,
          runtimeTargetIdentity: resolvedTargetIdentity,
        })
      : parsed.toString();
  const resolvedAt = input.resolvedAt ?? new Date();
  const context: ResolvedDatabaseContext = deepFreeze({
    contextVersion: 1,
    contextId: randomUUID(),
    correlationId:
      input.correlationId ?? environment.values.DATABASE_AUTHORITY_CORRELATION_ID ?? randomUUID(),
    resolvedAt: resolvedAt.toISOString(),
    operation: input.operation,
    runtimeMode: environment.runtimeMode,
    environmentSource: source,
    environmentFiles: Object.freeze([...environment.loadedFiles]),
    targetFingerprint: resolvedTargetFingerprint,
    targetFingerprintHash,
    targetClass,
    databaseName: resolvedDatabaseName,
    host: resolvedHost,
    port: resolvedPort,
    provider,
    dialect,
    local: resolvedLocal,
    tls: {
      required: tlsRequired,
      certificateVerificationRequired,
    },
    credentialClass,
    credentialSource:
      selectedIsolatedCiCredential?.source ??
      (requiresMigrationCredential ? 'protected-migration-url' : 'database-url'),
    repository: {
      root: identity.repositoryRoot,
      gitCommonDirectoryFingerprint: identity.gitCommonDirectoryFingerprint,
      head: identity.head,
    },
    worktree: {
      path: identity.worktreePath,
      branch: identity.branch,
      upstream: identity.upstream,
      registered: identity.registered,
      clean: identity.clean,
      ownershipKey: identity.ownershipKey,
      expectedDatabase: identity.expectedWorktreeDatabase,
      ownershipMatches,
      cleanMainOwnershipMatches,
    },
  });

  return Object.freeze({
    context,
    targetCredential: storeDatabaseCredentialUrl(parsed.toString()),
    credential: storeDatabaseCredentialUrl(credentialUrl),
  });
}

export function databaseAuthorityChildEnvironment(
  authority: ResolvedDatabaseAuthority,
  base: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const isIsolatedCi =
    authority.context.credentialSource === 'isolated-ci-role-url' ||
    authority.context.credentialSource === 'isolated-ci-bootstrap-url';
  const { DATABASE_BOOTSTRAP_URL: _ignoredBootstrapUrl, ...withoutBootstrap } = base;
  const safeBase = (() => {
    if (isIsolatedCi) return withoutBootstrap;
    const { DATABASE_MIGRATION_URL: _ignoredMigrationUrl, ...withoutMigration } = withoutBootstrap;
    return withoutMigration;
  })();
  return {
    ...safeBase,
    DATABASE_URL: readDatabaseCredentialUrl(authority.targetCredential),
    ...(authority.context.credentialSource === 'protected-migration-url'
      ? { DATABASE_MIGRATION_URL: readDatabaseCredentialUrl(authority.credential) }
      : {}),
    DATABASE_AUTHORITY_PARENT_FINGERPRINT: authority.context.targetFingerprintHash,
    DATABASE_AUTHORITY_CORRELATION_ID: authority.context.correlationId,
    ...(isIsolatedCi ? {} : { DATABASE_CREDENTIAL_CLASS: authority.context.credentialClass }),
    NODE_ENV: authority.context.runtimeMode,
    APP_ENV: authority.context.runtimeMode,
  };
}

export function sanitizedDatabaseContext(
  authority: ResolvedDatabaseAuthority,
): ResolvedDatabaseContext {
  return authority.context;
}
