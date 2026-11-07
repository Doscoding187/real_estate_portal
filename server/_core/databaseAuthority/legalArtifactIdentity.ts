import { createHash, verify as verifySignature } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { loadAndValidateMigrationManifest } from '../../migrations/migrationManifest';
import { LEGAL_ARTIFACT_IDENTITY_TRUSTED_PUBLIC_KEYS } from './legalArtifactIdentityTrustRoots';

const sha256Pattern = /^[a-f0-9]{64}$/;
const imageDigestPattern = /^sha256:[a-f0-9]{64}$/;
const resourceIdPattern =
  /^\/subscriptions\/[0-9a-f-]{36}\/resourceGroups\/[A-Za-z0-9_.()-]{1,90}\/providers\/Microsoft\.App\/jobs\/[A-Za-z0-9_.()-]{1,64}$/i;
const operationSchema = z.enum([
  'legal-release-plan',
  'legal-release-apply',
  'legal-release-verify',
]);
const digest = z.string().regex(sha256Pattern);
const claimsSchema = z
  .object({
    formatVersion: z.literal(1),
    purpose: z.literal('property-listify-legal-release'),
    operation: operationSchema,
    sourceHead: z.string().regex(/^[a-f0-9]{40}$/),
    imageDigest: z.string().regex(imageDigestPattern),
    manifestDigest: digest,
    modelDigest: digest,
    packetDigest: digest,
    planDigest: digest.nullable(),
    targetFingerprintHash: digest,
    jobResourceId: z.string().regex(resourceIdPattern),
    issuedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
  })
  .strict();
const envelopeSchema = z
  .object({
    formatVersion: z.literal(1),
    keyId: z.string().min(1).max(80).regex(/^[A-Za-z0-9._-]+$/),
    claims: claimsSchema,
    signature: z.string().regex(/^[A-Za-z0-9_-]{86}$/),
  })
  .strict();

export type LegalArtifactOperation = z.infer<typeof operationSchema>;
export type LegalArtifactIdentityClaims = z.infer<typeof claimsSchema>;
export type LegalArtifactIdentityEnvelope = z.infer<typeof envelopeSchema>;
type LegalArtifactClaims = LegalArtifactIdentityClaims;
type LegalArtifactEnvelope = LegalArtifactIdentityEnvelope;

export type VerifiedLegalArtifactIdentity = {
  readonly claims: Readonly<LegalArtifactClaims>;
};

export type AzureContainerAppsJobObservation = {
  readonly jobResourceId: string;
  readonly imageDigest: string;
  readonly managedIdentityPrincipalId: string;
};

const signedIdentities = new WeakSet<object>();
const measuredJobs = new WeakSet<object>();
const verifiedIdentities = new WeakSet<object>();

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  const record = value as Record<string, unknown>;
  return (
    '{' +
    Object.keys(record)
      .sort()
      .map(key => JSON.stringify(key) + ':' + canonicalJson(record[key]))
      .join(',') +
    '}'
  );
}

function packetDigest(packet: unknown): string {
  return createHash('sha256').update(canonicalJson(packet)).digest('hex');
}

function safeError(message: string): Error {
  return new Error(message);
}

export function canonicalLegalArtifactIdentityClaims(claims: LegalArtifactClaims): string {
  return canonicalJson(claims);
}

export function parseAndVerifyLegalArtifactIdentitySignature(input: {
  envelope: unknown;
  trustedPublicKeys?: Readonly<Record<string, string>>;
  now?: Date;
}): { readonly envelope: Readonly<LegalArtifactEnvelope> } {
  const parsed = envelopeSchema.safeParse(input.envelope);
  if (!parsed.success) throw safeError('Legal artifact identity is missing or malformed.');
  const envelope = parsed.data;
  const trustedKeys = input.trustedPublicKeys ?? LEGAL_ARTIFACT_IDENTITY_TRUSTED_PUBLIC_KEYS;
  const publicKey = trustedKeys[envelope.keyId];
  if (!publicKey) throw safeError('Legal artifact identity signing key is not trusted.');

  const validSignature = verifySignature(
    null,
    Buffer.from(canonicalJson(envelope.claims)),
    publicKey,
    Buffer.from(envelope.signature, 'base64url'),
  );
  if (!validSignature) throw safeError('Legal artifact identity signature is invalid.');

  const now = (input.now ?? new Date()).getTime();
  const issuedAt = Date.parse(envelope.claims.issuedAt);
  const expiresAt = Date.parse(envelope.claims.expiresAt);
  if (
    !Number.isFinite(now) ||
    !Number.isFinite(issuedAt) ||
    !Number.isFinite(expiresAt) ||
    issuedAt > now + 60_000 ||
    expiresAt <= now ||
    expiresAt <= issuedAt ||
    expiresAt - issuedAt > 30 * 60_000 ||
    (envelope.claims.operation === 'legal-release-apply' && !envelope.claims.planDigest)
  ) {
    throw safeError('Legal artifact identity is expired or outside its signed operation window.');
  }
  const identity = Object.freeze({ envelope });
  signedIdentities.add(identity);
  return identity;
}

function parseJwtObjectId(accessToken: string): string {
  const parts = accessToken.split('.');
  if (parts.length !== 3) throw safeError('Azure managed identity token is invalid.');
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
      oid?: unknown;
    };
    if (typeof payload.oid !== 'string' || !/^[0-9a-f-]{36}$/i.test(payload.oid)) {
      throw new Error('invalid');
    }
    return payload.oid.toLowerCase();
  } catch {
    throw safeError('Azure managed identity token has no valid principal ID.');
  }
}

function assertLocalIdentityEndpoint(value: string): URL {
  let endpoint: URL;
  try {
    endpoint = new URL(value);
  } catch {
    throw safeError('Azure managed identity endpoint is invalid.');
  }
  if (
    endpoint.protocol !== 'http:' ||
    !['localhost', '127.0.0.1', '[::1]', '::1'].includes(endpoint.hostname.toLowerCase()) ||
    endpoint.username ||
    endpoint.password
  ) {
    throw safeError('Azure managed identity endpoint must be the local Container Apps endpoint.');
  }
  return endpoint;
}

/** Read only. It asks the ACA managed identity endpoint for a token and ARM for
 * this exact signed job resource; it never prints either value or the token. */
export async function observeAzureContainerAppsJob(input: {
  jobResourceId: string;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<AzureContainerAppsJobObservation> {
  if (!resourceIdPattern.test(input.jobResourceId))
    throw safeError('Legal artifact identity job resource ID is invalid.');
  const env = input.env ?? process.env;
  const endpointText = String(env.IDENTITY_ENDPOINT ?? '').trim();
  const identityHeader = String(env.IDENTITY_HEADER ?? '').trim();
  const jobName = String(env.CONTAINER_APP_JOB_NAME ?? '').trim();
  const executionName = String(env.CONTAINER_APP_JOB_EXECUTION_NAME ?? '').trim();
  const replicaName = String(env.CONTAINER_APP_REPLICA_NAME ?? '').trim();
  if (
    !endpointText ||
    !identityHeader ||
    !jobName ||
    !/^[A-Za-z0-9_.()-]{1,128}$/.test(executionName) ||
    !replicaName
  )
    throw safeError('Legal artifact identity requires an active Container Apps job execution.');

  const resourceSegments = input.jobResourceId.split('/');
  const expectedName = resourceSegments[resourceSegments.length - 1];
  if (jobName !== expectedName)
    throw safeError('Container Apps job name differs from the signed artifact identity.');
  const endpoint = assertLocalIdentityEndpoint(endpointText);
  endpoint.searchParams.set('resource', 'https://management.azure.com/');
  endpoint.searchParams.set('api-version', '2019-08-01');

  const fetchImpl = input.fetchImpl ?? fetch;
  let tokenResponse: Response;
  try {
    tokenResponse = await fetchImpl(endpoint, {
      method: 'GET',
      headers: { 'X-IDENTITY-HEADER': identityHeader },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw safeError('Azure managed identity token request failed.');
  }
  if (!tokenResponse.ok) throw safeError('Azure managed identity token request was refused.');
  let tokenDocument: { access_token?: unknown };
  try {
    tokenDocument = (await tokenResponse.json()) as { access_token?: unknown };
  } catch {
    throw safeError('Azure managed identity token response is invalid.');
  }
  if (typeof tokenDocument.access_token !== 'string' || !tokenDocument.access_token)
    throw safeError('Azure managed identity token response is incomplete.');
  const principalId = parseJwtObjectId(tokenDocument.access_token);

  const armUrl = new URL('https://management.azure.com' + input.jobResourceId);
  armUrl.searchParams.set('api-version', '2024-03-01');
  let jobResponse: Response;
  try {
    jobResponse = await fetchImpl(armUrl, {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + tokenDocument.access_token },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw safeError('Azure Container Apps job inspection failed.');
  }
  if (!jobResponse.ok) throw safeError('Azure Container Apps job inspection was refused.');
  let job: {
    id?: unknown;
    type?: unknown;
    identity?: { type?: unknown; principalId?: unknown };
    properties?: {
      template?: {
        containers?: Array<{ image?: unknown }>;
        initContainers?: Array<{ image?: unknown }>;
      };
    };
  };
  try {
    job = (await jobResponse.json()) as typeof job;
  } catch {
    throw safeError('Azure Container Apps job response is invalid.');
  }
  if (
    typeof job.id !== 'string' ||
    job.id.toLowerCase() !== input.jobResourceId.toLowerCase() ||
    typeof job.type !== 'string' ||
    job.type.toLowerCase() !== 'microsoft.app/jobs' ||
    typeof job.identity?.principalId !== 'string' ||
    job.identity.principalId.toLowerCase() !== principalId ||
    !String(job.identity.type ?? '').toLowerCase().includes('systemassigned')
  ) {
    throw safeError('Azure Container Apps job identity differs from the active execution.');
  }

  const executionResourceId = input.jobResourceId + '/executions/' + executionName;
  const executionUrl = new URL('https://management.azure.com' + executionResourceId);
  executionUrl.searchParams.set('api-version', '2024-03-01');
  let executionResponse: Response;
  try {
    executionResponse = await fetchImpl(executionUrl, {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + tokenDocument.access_token },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw safeError('Azure Container Apps job execution inspection failed.');
  }
  if (!executionResponse.ok)
    throw safeError('Azure Container Apps job execution inspection was refused.');
  let execution: {
    id?: unknown;
    properties?: {
      template?: {
        containers?: Array<{ image?: unknown }>;
        initContainers?: Array<{ image?: unknown }>;
      };
    };
  };
  try {
    execution = (await executionResponse.json()) as typeof execution;
  } catch {
    throw safeError('Azure Container Apps job execution response is invalid.');
  }
  if (
    typeof execution.id !== 'string' ||
    execution.id.toLowerCase() !== executionResourceId.toLowerCase()
  )
    throw safeError('Azure Container Apps job execution differs from the active execution.');
  const containers = execution.properties?.template?.containers ?? [];
  const initContainers = execution.properties?.template?.initContainers ?? [];
  if (containers.length !== 1 || initContainers.length !== 0)
    throw safeError('Legal artifact identity requires one pinned job image and no init containers.');
  const image = containers[0]?.image;
  if (typeof image !== 'string') throw safeError('Azure Container Apps job image is missing.');
  const match = image.match(/@(sha256:[a-f0-9]{64})$/i);
  if (!match?.[1])
    throw safeError('Azure Container Apps job image must be pinned by digest.');

  const observation = Object.freeze({
    jobResourceId: input.jobResourceId,
    imageDigest: match[1].toLowerCase(),
    managedIdentityPrincipalId: principalId,
  });
  measuredJobs.add(observation);
  return observation;
}

/** Verify signed claims against the packet, source manifests, target context,
 * and measured ARM job image. No environment claim stands in for these checks. */
export async function verifyLegalArtifactIdentity(input: {
  signed: ReturnType<typeof parseAndVerifyLegalArtifactIdentitySignature>;
  packet: unknown;
  operation: LegalArtifactOperation;
  targetFingerprintHash: string;
  planDigest?: string;
  root?: string;
  now?: Date;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<VerifiedLegalArtifactIdentity> {
  if (!signedIdentities.has(input.signed))
    throw safeError('Legal artifact identity signature has not been verified.');
  const claims = input.signed.envelope.claims;
  if (
    claims.operation !== input.operation ||
    claims.targetFingerprintHash !== input.targetFingerprintHash ||
    (input.operation === 'legal-release-apply' &&
      (!input.planDigest || claims.planDigest !== input.planDigest))
  ) {
    throw safeError('Legal artifact identity operation or target binding differs.');
  }
  const now = (input.now ?? new Date()).getTime();
  if (Date.parse(claims.expiresAt) <= now)
    throw safeError('Legal artifact identity expired before protected operation.');
  if (!input.packet || typeof input.packet !== 'object')
    throw safeError('Legal release packet is missing for artifact verification.');
  const packet = input.packet as { sourceHead?: unknown };
  if (
    packet.sourceHead !== claims.sourceHead ||
    packetDigest(input.packet) !== claims.packetDigest
  ) {
    throw safeError('Legal release packet differs from the signed artifact identity.');
  }

  const root = input.root ?? process.cwd();
  const manifest = loadAndValidateMigrationManifest({
    migrationsDirectory: resolve(root, 'server/migrations'),
  });
  const inventory = JSON.parse(
    readFileSync(resolve(root, 'drizzle/schema/canonical-model-inventory.json'), 'utf8'),
  ) as { structuralDigest?: unknown };
  if (
    manifest.manifestDigest !== claims.manifestDigest ||
    inventory.structuralDigest !== claims.modelDigest
  ) {
    throw safeError('Legal artifact identity manifest or model digest differs from this image.');
  }

  const observation = await observeAzureContainerAppsJob({
    jobResourceId: claims.jobResourceId,
    env: input.env,
    fetchImpl: input.fetchImpl,
  });
  if (
    !measuredJobs.has(observation) ||
    observation.jobResourceId.toLowerCase() !== claims.jobResourceId.toLowerCase() ||
    observation.imageDigest !== claims.imageDigest
  ) {
    throw safeError('Running Container Apps job image differs from the signed artifact identity.');
  }

  const verified = Object.freeze({ claims });
  verifiedIdentities.add(verified);
  return verified;
}

export function assertVerifiedLegalArtifactIdentity(
  value: VerifiedLegalArtifactIdentity | undefined,
): Readonly<LegalArtifactClaims> {
  if (!value || !verifiedIdentities.has(value))
    throw safeError('Protected legal release requires a verified digest-bound artifact identity.');
  return value.claims;
}

export function legalArtifactIdentityPacketDigest(packet: unknown): string {
  return packetDigest(packet);
}
