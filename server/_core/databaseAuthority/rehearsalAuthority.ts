import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import registration from '../../../docs/database-authority/disposable-rehearsal-authorization.json' with { type: 'json' };
import type { AuthorizedDatabaseOperation } from './authorization';
import type { ResolvedDatabaseContext } from './types';

export const REHEARSAL = Object.freeze({ ...registration });
export const REHEARSAL_RESOURCE_ID = `/subscriptions/${REHEARSAL.subscriptionId}/resourceGroups/${REHEARSAL.resourceGroup}/providers/${REHEARSAL.provider}/${REHEARSAL.serverName}`;
export const REHEARSAL_FINGERPRINT = `mysql://${REHEARSAL.hostname}:3306/${REHEARSAL.database}`;
const recordPath = new URL(
  '../../../docs/database-authority/disposable-rehearsal-authorization.json',
  import.meta.url,
);

type RehearsalRegistration = {
  status?: string;
  approvedBy?: string;
  createdAt?: string;
  expiresAt?: string;
  purpose?: string;
  subscriptionId?: string;
  resourceGroup?: string;
  provider?: string;
  serverName?: string;
  hostname?: string;
  database?: string;
  engineFamily?: string;
  targetFingerprint?: string;
  targetFingerprintHash?: string;
  runtimeMode?: string;
  allowedOperations?: string[];
  credentialClassesByOperation?: Record<string, string[]>;
  allowedReferenceAdapters?: string[];
  deniedTargetFingerprints?: string[];
  expectedOldHead?: string;
  expectedNewHead?: string;
};
type RehearsalApproval = {
  reference?: string;
  actor?: string;
  operation?: string;
  targetFingerprintHash?: string;
  credentialClass?: string;
};
type RehearsalTargetInput = {
  context: ResolvedDatabaseContext;
  approval?: RehearsalApproval;
  adapter?: string;
  registration?: RehearsalRegistration;
  now?: number;
};

const REHEARSAL_REFERENCE_OPERATIONS = [
  'release-reference-plan',
  'release-reference-apply',
  'release-reference-verify',
] as const;
const REHEARSAL_MIGRATION_OPERATIONS = ['release-plan', 'release-apply'] as const;
const MAX_REHEARSAL_WINDOW_MS = 12 * 60 * 60 * 1000;
const REHEARSAL_EXPECTED_OLD_HEAD = '0111_properties_canonical_place_reference_fk.sql';
const REHEARSAL_EXPECTED_NEW_HEAD = '0197_drop_seller_prospects_province.sql';
const PRODUCTION_HOST = 'propertylistify-mysql.mysql.database.azure.com';
const PRODUCTION_FINGERPRINT = `mysql://${PRODUCTION_HOST}:3306/propertylistify_database`;

function fingerprintHash(fingerprint: string): string {
  return createHash('sha256').update(fingerprint).digest('hex');
}

function registeredResourceId(record: RehearsalRegistration): string {
  return `/subscriptions/${record.subscriptionId}/resourceGroups/${record.resourceGroup}/providers/${record.provider}/${record.serverName}`;
}

function resourceIdentityFromRegistration(record: RehearsalRegistration):
  | {
      resourceId: string;
      resourceName: string;
      hostname: string;
    }
  | undefined {
  if (
    typeof record.subscriptionId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      record.subscriptionId,
    ) ||
    typeof record.resourceGroup !== 'string' ||
    !record.resourceGroup ||
    record.resourceGroup.includes('/') ||
    record.provider !== 'Microsoft.DBforMySQL/flexibleServers' ||
    typeof record.serverName !== 'string' ||
    !/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/.test(record.serverName)
  ) {
    return undefined;
  }

  const resourceId = registeredResourceId(record);
  const parts = resourceId.split('/');
  if (
    parts.length !== 9 ||
    parts[1] !== 'subscriptions' ||
    parts[3] !== 'resourceGroups' ||
    parts[5] !== 'providers' ||
    parts[6] !== 'Microsoft.DBforMySQL' ||
    parts[7] !== 'flexibleServers' ||
    parts[8] !== record.serverName
  ) {
    return undefined;
  }
  return {
    resourceId,
    resourceName: parts[8],
    hostname: `${parts[8]}.mysql.database.azure.com`,
  };
}

/** Validate the short-lived founder approval for one reference adapter and exact restored resource. */
export function assertApprovedRehearsalReferenceTarget(input: RehearsalTargetInput): void {
  assertApprovedRehearsalTarget(input, 'reference data');
}

/** Diagnostics are read-only and use the same exact-resource binding as reference releases. */
export function assertApprovedRehearsalDiagnosticsTarget(input: RehearsalTargetInput): void {
  if (input.context.operation !== 'diagnostics' || input.context.credentialClass !== 'read-only') {
    throw new Error('Rehearsal diagnostics refused: the operation requires read-only credentials.');
  }
  assertApprovedRehearsalTarget(input, 'diagnostics');
}

function assertApprovedRehearsalTarget(
  input: RehearsalTargetInput,
  operationLabel: 'reference data' | 'diagnostics',
): void {
  const record: RehearsalRegistration =
    input.registration ?? (REHEARSAL as unknown as RehearsalRegistration);
  const context = input.context;
  const host = String(context.host).toLowerCase();
  const resource = resourceIdentityFromRegistration(record);
  if (!resource) {
    throw new Error(
      `Rehearsal ${operationLabel} refused: registration resource ID is missing or malformed.`,
    );
  }
  if (/(railway|rlwy)/i.test(host)) {
    throw new Error('Railway hosts cannot be rehearsal targets.');
  }
  if (
    host === PRODUCTION_HOST ||
    resource.resourceName.toLowerCase() === 'propertylistify-mysql' ||
    context.targetFingerprint === PRODUCTION_FINGERPRINT ||
    context.targetClass === 'production'
  ) {
    throw new Error(
      'Production host or resource cannot be admitted as a disposable rehearsal target.',
    );
  }
  if (record.hostname !== resource.hostname) {
    throw new Error(
      `Rehearsal ${operationLabel} refused: registration hostname does not match its resource ID.`,
    );
  }
  if (context.host !== resource.hostname) {
    throw new Error(
      `Rehearsal ${operationLabel} refused: target hostname does not match its resource ID.`,
    );
  }

  const createdAt = Date.parse(String(record.createdAt ?? ''));
  const expiresAt = Date.parse(String(record.expiresAt ?? ''));
  const expectedFingerprint = `mysql://${resource.hostname}:3306/${record.database}`;
  const allowedOperations = Array.isArray(record.allowedOperations) ? record.allowedOperations : [];
  const credentialClasses = record.credentialClassesByOperation?.[context.operation];
  const approval = input.approval;
  if (
    record.status !== 'approved' ||
    String(record.approvedBy ?? '')
      .trim()
      .toLowerCase() !== 'founder' ||
    !Number.isFinite(createdAt) ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= createdAt ||
    expiresAt - createdAt > MAX_REHEARSAL_WINDOW_MS ||
    (input.now ?? Date.now()) < createdAt ||
    (input.now ?? Date.now()) >= expiresAt ||
    !String(record.purpose ?? '').trim() ||
    record.provider !== 'Microsoft.DBforMySQL/flexibleServers' ||
    record.engineFamily !== 'MySQL' ||
    record.targetFingerprint !== expectedFingerprint ||
    record.targetFingerprintHash !== fingerprintHash(expectedFingerprint) ||
    !allowedOperations.includes(context.operation) ||
    !Array.isArray(credentialClasses) ||
    !credentialClasses.includes(context.credentialClass) ||
    (input.adapter != null && !record.allowedReferenceAdapters?.includes(input.adapter)) ||
    (record.deniedTargetFingerprints ?? []).includes(context.targetFingerprint) ||
    context.targetClass !== 'disposable-rehearsal' ||
    context.targetFingerprint !== expectedFingerprint ||
    context.targetFingerprintHash !== record.targetFingerprintHash ||
    context.host !== resource.hostname ||
    context.databaseName !== record.database ||
    context.rehearsal?.resourceId !== resource.resourceId ||
    context.rehearsal?.purpose !== record.purpose ||
    context.provider !== 'mysql' ||
    context.dialect !== 'mysql' ||
    context.local ||
    context.runtimeMode !== record.runtimeMode ||
    context.environmentSource !== 'explicit-process' ||
    !context.tls.required ||
    !context.tls.certificateVerificationRequired ||
    !approval ||
    approval.actor?.trim().toLowerCase() !== 'founder' ||
    approval.reference !== record.purpose ||
    approval.operation !== context.operation ||
    approval.targetFingerprintHash !== context.targetFingerprintHash ||
    (approval.credentialClass != null && approval.credentialClass !== context.credentialClass)
  ) {
    throw new Error(
      `Rehearsal ${operationLabel} refused: exact unexpired Founder registration, resource, operation and approval are required.`,
    );
  }
}

export function assertRehearsalReferenceAuthorization(input: {
  context: ResolvedDatabaseContext;
  approval?: RehearsalApproval;
  adapter: string;
}): void {
  const current = JSON.parse(readFileSync(recordPath, 'utf8'));
  if (JSON.stringify(current) !== JSON.stringify(registration)) {
    throw new Error('Rehearsal authorization changed; review required.');
  }
  assertApprovedRehearsalReferenceTarget({
    ...input,
    registration: current,
  });
}

export function assertRehearsalReferenceAdapter(input: {
  context: ResolvedDatabaseContext;
  decision: AuthorizedDatabaseOperation;
  adapter: string;
}): void {
  if (input.context.targetClass !== 'disposable-rehearsal') return;
  assertRehearsalReferenceAuthorization({
    context: input.context,
    approval: {
      actor: input.decision.approvalActor ?? undefined,
      reference: input.decision.approvalReference ?? undefined,
      operation: input.decision.operation,
      targetFingerprintHash: input.decision.targetFingerprintHash,
      credentialClass: input.decision.credentialClass,
    },
    adapter: input.adapter,
  });
}

/** Preserve the original release migration route, bound to one registered restore. */
export function assertApprovedRehearsalMigrationTarget(input: {
  context: ResolvedDatabaseContext;
  approval?: RehearsalApproval | string;
  registration?: RehearsalRegistration;
  now?: number;
}): void {
  const record: RehearsalRegistration =
    input.registration ?? (REHEARSAL as unknown as RehearsalRegistration);
  const context = input.context;
  const resource = resourceIdentityFromRegistration(record);
  if (!resource) {
    throw new Error(
      'Rehearsal migration refused: registration resource ID is missing or malformed.',
    );
  }
  const host = String(context.host).toLowerCase();
  if (/(railway|rlwy)/i.test(host)) {
    throw new Error('Railway hosts cannot be rehearsal migration targets.');
  }
  if (
    host === PRODUCTION_HOST ||
    resource.resourceName.toLowerCase() === 'propertylistify-mysql' ||
    context.targetFingerprint === PRODUCTION_FINGERPRINT ||
    context.targetClass === 'production'
  ) {
    throw new Error(
      'Production host or resource cannot be admitted as a rehearsal migration target.',
    );
  }

  const createdAt = Date.parse(String(record.createdAt ?? ''));
  const expiresAt = Date.parse(String(record.expiresAt ?? ''));
  const expectedFingerprint = `mysql://${resource.hostname}:3306/${record.database}`;
  const approval = input.approval;
  const allowedOperations = Array.isArray(record.allowedOperations) ? record.allowedOperations : [];
  const credentialClasses = record.credentialClassesByOperation?.[context.operation];
  if (
    record.status !== 'approved' ||
    String(record.approvedBy ?? '')
      .trim()
      .toLowerCase() !== 'founder' ||
    !Number.isFinite(createdAt) ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= createdAt ||
    expiresAt - createdAt > MAX_REHEARSAL_WINDOW_MS ||
    (input.now ?? Date.now()) < createdAt ||
    (input.now ?? Date.now()) >= expiresAt ||
    record.hostname !== resource.hostname ||
    !String(record.purpose ?? '').trim() ||
    record.engineFamily !== 'MySQL' ||
    !String(record.database ?? '').trim() ||
    !String(record.runtimeMode ?? '').trim() ||
    record.expectedOldHead !== REHEARSAL_EXPECTED_OLD_HEAD ||
    record.expectedNewHead !== REHEARSAL_EXPECTED_NEW_HEAD ||
    record.targetFingerprint !== expectedFingerprint ||
    record.targetFingerprintHash !== fingerprintHash(expectedFingerprint) ||
    !(REHEARSAL_MIGRATION_OPERATIONS as readonly string[]).includes(context.operation) ||
    !allowedOperations.includes(context.operation) ||
    !Array.isArray(credentialClasses) ||
    !credentialClasses.includes(context.credentialClass) ||
    (record.deniedTargetFingerprints ?? []).includes(context.targetFingerprint) ||
    context.targetClass !== 'disposable-rehearsal' ||
    context.targetFingerprint !== expectedFingerprint ||
    context.targetFingerprintHash !== record.targetFingerprintHash ||
    context.host !== resource.hostname ||
    context.databaseName !== record.database ||
    context.rehearsal?.resourceId !== resource.resourceId ||
    context.rehearsal?.purpose !== record.purpose ||
    context.provider !== 'mysql' ||
    context.dialect !== 'mysql' ||
    context.local ||
    context.runtimeMode !== record.runtimeMode ||
    context.environmentSource !== 'explicit-process' ||
    !context.tls.required ||
    !context.tls.certificateVerificationRequired ||
    !approval ||
    typeof approval === 'string' ||
    approval.actor?.trim().toLowerCase() !== 'founder' ||
    approval.reference !== record.purpose ||
    approval.operation !== context.operation ||
    approval.targetFingerprintHash !== context.targetFingerprintHash ||
    (approval.credentialClass != null && approval.credentialClass !== context.credentialClass)
  ) {
    throw new Error(
      'Rehearsal migration refused: exact unexpired Founder registration, release operation and target approval are required.',
    );
  }
}

export function assertRehearsalMigrationScope(input: {
  context: ResolvedDatabaseContext;
  mode: 'plan' | 'apply';
  acceptedOldHead: string | null | undefined;
  expectedNewHead: string | undefined;
  ancestorHead?: string | undefined;
}): void {
  if (input.context.targetClass !== 'disposable-rehearsal') return;
  const expectedOperation = input.mode === 'plan' ? 'release-plan' : 'release-apply';
  const validOldHead =
    input.mode === 'apply'
      ? input.acceptedOldHead === REHEARSAL_EXPECTED_OLD_HEAD
      : input.acceptedOldHead === REHEARSAL_EXPECTED_OLD_HEAD ||
        input.acceptedOldHead === REHEARSAL_EXPECTED_NEW_HEAD;
  if (
    input.context.operation !== expectedOperation ||
    !validOldHead ||
    input.expectedNewHead !== REHEARSAL_EXPECTED_NEW_HEAD ||
    input.ancestorHead !== undefined
  ) {
    throw new Error(
      'Rehearsal refused: migration scope must be the registered 0111-to-0197 release.',
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
  approval?: RehearsalApproval | string,
): void {
  const current = JSON.parse(readFileSync(recordPath, 'utf8'));
  if (
    !Number.isFinite(Date.parse(current.createdAt)) ||
    !Number.isFinite(Date.parse(current.expiresAt)) ||
    current.status !== 'approved' ||
    JSON.stringify(current) !== JSON.stringify(registration) ||
    Date.now() < Date.parse(current.createdAt) ||
    Date.now() >= Date.parse(current.expiresAt)
  ) {
    throw new Error('Rehearsal authorization expired, revoked or changed; review required.');
  }
  if ((REHEARSAL_REFERENCE_OPERATIONS as readonly string[]).includes(context.operation)) {
    assertApprovedRehearsalReferenceTarget({
      context,
      approval: typeof approval === 'string' ? undefined : approval,
      registration: current,
    });
    return;
  }
  if (context.operation === 'diagnostics') {
    assertApprovedRehearsalDiagnosticsTarget({
      context,
      approval: typeof approval === 'string' ? undefined : approval,
      registration: current,
    });
    return;
  }
  if ((REHEARSAL_MIGRATION_OPERATIONS as readonly string[]).includes(context.operation)) {
    assertApprovedRehearsalMigrationTarget({ context, approval, registration: current });
    return;
  }
  if (
    context.operation !== 'rehearsal-regression' ||
    context.targetClass !== 'disposable-rehearsal' ||
    !isRegisteredRehearsal(context.targetFingerprint, context.rehearsal) ||
    context.provider !== 'mysql' ||
    context.dialect !== 'mysql' ||
    context.runtimeMode !== 'test' ||
    context.environmentSource !== 'explicit-caller' ||
    context.credentialClass !== 'runtime' ||
    !context.tls.required ||
    !context.tls.certificateVerificationRequired ||
    (typeof approval === 'string' ? approval : approval?.reference) !== REHEARSAL.purpose
  ) {
    throw new Error(
      'Rehearsal refused: exact explicit target, test mode, TLS and purpose approval required.',
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

/** Read live ARM evidence ourselves; callers cannot supply a claimed identity. */
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
