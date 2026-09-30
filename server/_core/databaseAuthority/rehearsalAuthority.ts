import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import registration from '../../../docs/database-authority/disposable-rehearsal-authorization.json';
import type { ResolvedDatabaseContext } from './types';

export const REHEARSAL = Object.freeze({ ...registration });
export const REHEARSAL_RESOURCE_ID = `/subscriptions/${REHEARSAL.subscriptionId}/resourceGroups/${REHEARSAL.resourceGroup}/providers/${REHEARSAL.provider}/${REHEARSAL.serverName}`;
export const REHEARSAL_FINGERPRINT = `mysql://${REHEARSAL.hostname}:3306/${REHEARSAL.database}`;
const recordPath = new URL(
  '../../../docs/database-authority/disposable-rehearsal-authorization.json',
  import.meta.url,
);

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
  approval?: string,
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
    approval !== REHEARSAL.purpose
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
