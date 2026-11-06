import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import type { ResolvedDatabaseContext } from './types';

type RehearsalRegistration = {
  acceptedOldHead: string;
  expectedHead: string;
  authorizationLive: boolean;
  sourceBinding: { algorithm: 'sha256'; files: readonly string[]; sha256: string };
  subscriptionId: string;
  resourceGroup: string;
  provider: string;
  serverName: string;
  hostname: string;
  database: string;
  purpose: string;
  serverCreatedAt: string;
  createdAt: string;
  expiresAt: string;
  status: string;
  [key: string]: unknown;
};

const DEFAULT_REGISTRATION_RELATIVE =
  'docs/database-authority/disposable-rehearsal-authorization.json';

const repositoryRootForSelection = fileURLToPath(new URL('../../../', import.meta.url));
const registrationSelection = process.env.PROPERTYLISTIFY_REHEARSAL_REGISTRATION?.trim();
const registrationAbsolutePath = registrationSelection
  ? resolve(registrationSelection)
  : join(repositoryRootForSelection, DEFAULT_REGISTRATION_RELATIVE);
const registrationRelativePath = relative(repositoryRootForSelection, registrationAbsolutePath);
const registration: RehearsalRegistration = JSON.parse(
  readFileSync(registrationAbsolutePath, 'utf8'),
) as RehearsalRegistration;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export const REHEARSAL = deepFreeze({ ...registration }) as RehearsalRegistration;
export const REHEARSAL_RESOURCE_ID = `/subscriptions/${REHEARSAL.subscriptionId}/resourceGroups/${REHEARSAL.resourceGroup}/providers/${REHEARSAL.provider}/${REHEARSAL.serverName}`;
export const REHEARSAL_FINGERPRINT = `mysql://${REHEARSAL.hostname}:3306/${REHEARSAL.database}`;
export const REHEARSAL_SOURCE_DIGEST = REHEARSAL.sourceBinding.sha256;

export const REHEARSAL_SOURCE_FILES = Object.freeze([
  registrationRelativePath,
  'docs/database-authority/operation-policy.json',
  'server/_core/databaseAuthority/authorization.ts',
  'server/_core/databaseAuthority/connectionAuthority.ts',
  'server/_core/databaseAuthority/context.ts',
  'server/_core/databaseAuthority/credentialVault.ts',
  'server/_core/databaseAuthority/environment.ts',
  'server/_core/databaseAuthority/rehearsalAuthority.ts',
  'server/_core/databaseAuthority/types.ts',
  'server/_core/databaseTls.ts',
  'server/migrations/manifest.json',
  'server/migrations/migrationManifest.ts',
  'server/migrations/runSqlMigrations.ts',
]);

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const recordPath = registrationAbsolutePath;

function registrationContentForHash(root: string): string {
  const content = readFileSync(join(root, registrationRelativePath), 'utf8');
  const current = JSON.parse(content) as RehearsalRegistration;
  if (!current.sourceBinding || typeof current.sourceBinding.sha256 !== 'string') {
    throw new Error('Rehearsal source binding is missing or malformed.');
  }
  current.sourceBinding.sha256 = '';
  return `${JSON.stringify(current, null, 2)}\n`;
}

function calculateSourceDigest(root: string): string {
  const hash = createHash('sha256');
  for (const relativePath of REHEARSAL_SOURCE_FILES) {
    const content =
      relativePath === registrationRelativePath
        ? registrationContentForHash(root)
        : readFileSync(join(root, relativePath), 'utf8');
    hash.update(relativePath).update('\0').update(content).update('\0');
  }
  return hash.digest('hex');
}

/**
 * Bind registration to the exact authority and execution files. The digest
 * field is blanked while hashing the registration itself, avoiding a
 * self-referential commit or digest. The commit hash is intentionally not used:
 * the registration is part of the commit it would otherwise need to name.
 */
export function assertRehearsalSourceBinding(root = repositoryRoot): void {
  let current: RehearsalRegistration;
  try {
    current = JSON.parse(readFileSync(join(root, registrationRelativePath), 'utf8'));
  } catch {
    throw new Error('Rehearsal source binding refused: registration could not be read.');
  }
  if (
    JSON.stringify(current) !== JSON.stringify(registration) ||
    current.sourceBinding?.algorithm !== 'sha256' ||
    JSON.stringify(current.sourceBinding?.files) !== JSON.stringify(REHEARSAL_SOURCE_FILES)
  ) {
    throw new Error('Rehearsal source binding refused: registration or guarded file set changed.');
  }
  let actualDigest: string;
  try {
    actualDigest = calculateSourceDigest(root);
  } catch {
    throw new Error('Rehearsal source binding refused: a guarded source file is missing.');
  }
  if (
    !/^[a-f0-9]{64}$/.test(current.sourceBinding.sha256) ||
    actualDigest !== current.sourceBinding.sha256
  ) {
    throw new Error(
      'Rehearsal source binding refused: guarded source digest does not match registration.',
    );
  }
}

export function isRegisteredRehearsal(
  fingerprint: string,
  binding?: { resourceId: string; purpose: string },
): boolean {
  return (
    fingerprint === REHEARSAL_FINGERPRINT &&
    binding?.resourceId === REHEARSAL_RESOURCE_ID &&
    binding.purpose === REHEARSAL.purpose
  );
}

export function assertRehearsalAuthorization(
  context: ResolvedDatabaseContext,
  _legacyApproval?: string,
): void {
  assertRehearsalSourceBinding();
  const current = JSON.parse(readFileSync(recordPath, 'utf8')) as RehearsalRegistration;
  if (
    !Number.isFinite(Date.parse(current.createdAt)) ||
    !Number.isFinite(Date.parse(current.expiresAt)) ||
    current.authorizationLive !== true ||
    current.status !== 'approved' ||
    JSON.stringify(current) !== JSON.stringify(registration) ||
    Date.now() < Date.parse(current.createdAt) ||
    Date.now() >= Date.parse(current.expiresAt)
  ) {
    throw new Error('Rehearsal authorization expired, revoked or changed; review required.');
  }

  const readOnlyOperations = new Set([
    'read-only-connect',
    'verification',
    'readiness',
    'diagnostics',
    'release-plan',
    'release-reference-plan',
    'release-reference-verify',
  ]);
  const applyOperations = new Set(['release-apply', 'release-reference-apply']);
  const allowedOperation =
    readOnlyOperations.has(context.operation) || applyOperations.has(context.operation);
  const credentialMatches =
    (applyOperations.has(context.operation) &&
      context.credentialClass === 'migration' &&
      context.credentialSource === 'protected-migration-url') ||
    (readOnlyOperations.has(context.operation) && context.credentialClass === 'read-only');
  if (
    context.operation === 'rehearsal-regression' ||
    !allowedOperation ||
    !credentialMatches ||
    context.targetClass !== 'disposable-rehearsal' ||
    !isRegisteredRehearsal(context.targetFingerprint, context.rehearsal) ||
    context.provider !== 'mysql' ||
    context.dialect !== 'mysql' ||
    !context.tls.required ||
    !context.tls.certificateVerificationRequired
  ) {
    throw new Error(
      'Rehearsal refused: exact registered target, approved operation, credential and verified TLS are required.',
    );
  }
}

export function assertRehearsalResource(resource: any): void {
  const p = resource?.properties;
  if (
    resource?.id !== REHEARSAL_RESOURCE_ID ||
    resource?.name !== REHEARSAL.serverName ||
    resource?.type !== REHEARSAL.provider ||
    resource?.location?.toLowerCase().replace(/ /g, '') !== 'southafricanorth' ||
    p?.fullyQualifiedDomainName !== REHEARSAL.hostname ||
    p?.state !== 'Ready' ||
    !/^8\.(0|4)(\.|$)/.test(String(p?.fullVersion ?? p?.version)) ||
    Date.parse(resource?.systemData?.createdAt) !== Date.parse(REHEARSAL.serverCreatedAt)
  ) {
    throw new Error('Rehearsal refused: live Azure resource identity/state could not be proven.');
  }
}

/** Read live ARM evidence for an operator preflight; release migration code does not call this. */
export async function verifyRehearsalResource(): Promise<void> {
  try {
    const { stdout } = await promisify(execFile)(
      'az',
      [
        'rest',
        '--method',
        'get',
        '--subscription',
        REHEARSAL.subscriptionId,
        '--url',
        `https://management.azure.com${REHEARSAL_RESOURCE_ID}?api-version=2024-12-30`,
        '--output',
        'json',
      ],
      { timeout: 30_000, maxBuffer: 1024 * 1024 },
    );
    assertRehearsalResource(JSON.parse(stdout));
  } catch {
    throw new Error('Rehearsal refused: authenticated live ARM verification failed.');
  }
}
