import { createHash, randomUUID } from 'node:crypto';
import { buildMysqlConnectionSecurityConfig } from '../databaseTls';
import { storeDatabaseCredentialUrl, readDatabaseCredentialUrl } from './credentialVault';
import { resolveDatabaseEnvironment } from './environment';
import {
  isProtectedIntegrationBranch,
  readGitWorktreeIdentity,
} from './worktreeIdentity';
import { readWorktreeDatabaseProfile } from './worktreeProfile';
import type {
  DatabaseCredentialClass,
  DatabaseOperation,
  DatabaseTargetClass,
  GitWorktreeIdentity,
  ResolvedDatabaseAuthority,
  ResolvedDatabaseContext,
} from './types';

const LOCAL_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  'host.docker.internal',
  'listify-mysql-local',
]);
const LOCAL_LOOPBACK_PORTS = new Set(['3307']);
const TEST_LOOPBACK_PORTS = new Set(['3306', '3307']);
const CREDENTIAL_CLASSES = new Set<DatabaseCredentialClass>([
  'runtime',
  'read-only',
  'migration',
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

function classifyCredential(
  explicit: DatabaseCredentialClass | undefined,
  environmentValue: string | undefined,
  targetClass: DatabaseTargetClass,
): DatabaseCredentialClass {
  const requested = explicit ?? (environmentValue as DatabaseCredentialClass | undefined);
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

function isLocalPortAllowed(
  host: string,
  port: string,
  runtimeMode: string,
): boolean {
  if (host === 'host.docker.internal' || host === 'listify-mysql-local') {
    return port === '3306';
  }
  return runtimeMode === 'test'
    ? TEST_LOOPBACK_PORTS.has(port)
    : LOCAL_LOOPBACK_PORTS.has(port);
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
  const identity = input.gitIdentity ?? readGitWorktreeIdentity(cwd);
  const environment = resolveDatabaseEnvironment({
    cwd,
    processEnv: input.processEnv,
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

  const host = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const local = LOCAL_HOSTS.has(host);
  const defaultPort = parsed.protocol === 'mysql:' ? '3306' : '(default)';
  const port = parsed.port || defaultPort;
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

  const databaseName = decodeDatabaseName(parsed) || '(none)';
  const expectedTestDatabase = `listify_test_${identity.ownershipKey.slice(0, 12)}`;
  const isolatedCiTestTarget =
    environment.runtimeMode === 'test' &&
    environment.values.CI === 'true' &&
    databaseName === 'listify_test' &&
    local &&
    port === '3306';
  let targetClass: DatabaseTargetClass = 'unknown';
  if (local && parsed.protocol === 'mysql:' && isLocalPortAllowed(host, port, environment.runtimeMode)) {
    if (databaseName === 'listify_local') {
      targetClass = 'clean-main-local';
    } else if (databaseName === identity.expectedWorktreeDatabase) {
      targetClass = 'disposable-worktree';
    } else if (
      environment.runtimeMode === 'test' &&
      (databaseName === expectedTestDatabase || isolatedCiTestTarget)
    ) {
      targetClass = 'disposable-test';
    }
  } else if (!local) {
    if (databaseName === 'listify_property_sa') {
      targetClass = 'production';
    } else if (databaseName === 'listify_staging') {
      targetClass = 'staging';
    } else {
      targetClass = 'shared-remote';
    }
  }

  const provider =
    parsed.protocol === 'mysql:'
      ? /tidb/i.test(host)
        ? 'tidb'
        : 'mysql'
      : 'unknown';
  const dialect = parsed.protocol === 'mysql:' ? 'mysql' : 'unknown';
  let tlsRequired = !local;
  let certificateVerificationRequired = !local;
  if (parsed.protocol === 'mysql:') {
    const security = buildMysqlConnectionSecurityConfig(parsed.toString(), environment.runtimeMode);
    tlsRequired = Boolean(security.ssl);
    certificateVerificationRequired = Boolean(security.ssl?.rejectUnauthorized);
  }

  const targetFingerprint = `${parsed.protocol.replace(':', '')}://${host}:${port}/${databaseName}`;
  const targetFingerprintHash = sha256(targetFingerprint);
  const parentFingerprint = environment.values.DATABASE_AUTHORITY_PARENT_FINGERPRINT;
  if (parentFingerprint && parentFingerprint !== targetFingerprintHash) {
    throw new Error(
      'Database context resolution refused: child target fingerprint differs from the parent operation.',
    );
  }

  const ownershipMatches =
    identity.registered &&
    ((targetClass === 'disposable-worktree' && databaseName === identity.expectedWorktreeDatabase) ||
      (targetClass === 'disposable-test' &&
        (databaseName === expectedTestDatabase || isolatedCiTestTarget)) ||
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
  );
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
    targetFingerprint,
    targetFingerprintHash,
    targetClass,
    databaseName,
    host,
    port,
    provider,
    dialect,
    local,
    tls: {
      required: tlsRequired,
      certificateVerificationRequired,
    },
    credentialClass,
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
    credential: storeDatabaseCredentialUrl(parsed.toString()),
  });
}

export function databaseAuthorityChildEnvironment(
  authority: ResolvedDatabaseAuthority,
  base: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  return {
    ...base,
    DATABASE_URL: readDatabaseCredentialUrl(authority.credential),
    DATABASE_AUTHORITY_PARENT_FINGERPRINT: authority.context.targetFingerprintHash,
    DATABASE_AUTHORITY_CORRELATION_ID: authority.context.correlationId,
    DATABASE_CREDENTIAL_CLASS: authority.context.credentialClass,
    NODE_ENV: authority.context.runtimeMode,
    APP_ENV: authority.context.runtimeMode,
  };
}

export function sanitizedDatabaseContext(
  authority: ResolvedDatabaseAuthority,
): ResolvedDatabaseContext {
  return authority.context;
}
