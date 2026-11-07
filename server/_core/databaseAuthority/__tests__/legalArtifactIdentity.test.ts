import { generateKeyPairSync, sign } from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  canonicalLegalArtifactIdentityClaims,
  legalArtifactIdentityPacketDigest,
  parseAndVerifyLegalArtifactIdentitySignature,
  verifyLegalArtifactIdentity,
  type LegalArtifactIdentityClaims,
} from '../legalArtifactIdentity';
import { LEGAL_ARTIFACT_IDENTITY_TRUSTED_PUBLIC_KEYS } from '../legalArtifactIdentityTrustRoots';

const now = new Date('2026-11-06T10:05:00.000Z');
const jobId =
  '/subscriptions/384dc69e-9e22-419f-9e3d-83fbac4f58d0/resourceGroups/rg-property-listify/providers/Microsoft.App/jobs/ca-legal-release-test';
const principalId = '1b3bba4a-26a1-47ed-8187-44bf6677d448';
const imageDigest = 'sha256:' + 'a'.repeat(64);
const sourceHead = '0bc387e9a5270f7da40a76d1363c551633133ea2';
const targetFingerprintHash = 'b'.repeat(64);
const packet = { formatVersion: 1, sourceHead, note: 'synthetic test packet' };
const validClaims: LegalArtifactIdentityClaims = {
  formatVersion: 1,
  purpose: 'property-listify-legal-release',
  operation: 'legal-release-plan',
  sourceHead,
  imageDigest,
  manifestDigest: '4995e36715e60856bb87d925dd0eff03bcdccfcc50e1180648684c3bd2787e41',
  modelDigest: '869f441f3131b0f1bf4b56d416d049292bb48204918f8172d3699625c3208da7',
  packetDigest: legalArtifactIdentityPacketDigest(packet),
  planDigest: null,
  targetFingerprintHash,
  jobResourceId: jobId,
  issuedAt: '2026-11-06T10:00:00.000Z',
  expiresAt: '2026-11-06T10:20:00.000Z',
};

let publicKeyPem = '';
let privateKey: ReturnType<typeof generateKeyPairSync>['privateKey'];
beforeAll(() => {
  const pair = generateKeyPairSync('ed25519');
  publicKeyPem = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  privateKey = pair.privateKey;
});

function signedEnvelope(
  claims: LegalArtifactIdentityClaims = validClaims,
  keyId = 'test-key',
) {
  const signature = sign(
    null,
    Buffer.from(canonicalLegalArtifactIdentityClaims(claims)),
    privateKey,
  ).toString('base64url');
  return { formatVersion: 1, keyId, claims, signature };
}

function env(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    IDENTITY_ENDPOINT: 'http://localhost:42356/msi/token',
    IDENTITY_HEADER: 'synthetic-header',
    CONTAINER_APP_JOB_NAME: 'ca-legal-release-test',
    CONTAINER_APP_JOB_EXECUTION_NAME: 'ca-legal-release-test-abc',
    CONTAINER_APP_REPLICA_NAME: 'ca-legal-release-test-abc-0',
    ...overrides,
  };
}

function fetchFor(image = imageDigest, principal = principalId): typeof fetch {
  const accessToken =
    'header.' + Buffer.from(JSON.stringify({ oid: principal })).toString('base64url') + '.signature';
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith('http://localhost:42356/')) {
      return new Response(JSON.stringify({ access_token: accessToken }), { status: 200 });
    }
    if (url.includes('/executions/')) {
      return new Response(
        JSON.stringify({
          id: jobId + '/executions/ca-legal-release-test-abc',
          properties: {
            template: {
              containers: [{ name: 'legal-installer', image: 'acr.example/legal@' + image }],
              initContainers: [],
            },
          },
        }),
        { status: 200 },
      );
    }
    return new Response(
      JSON.stringify({
        id: jobId,
        type: 'Microsoft.App/jobs',
        identity: { type: 'SystemAssigned', principalId },
        properties: {
          template: {
            containers: [{ name: 'legal-installer', image: 'acr.example/legal@' + image }],
            initContainers: [],
          },
        },
      }),
      { status: 200 },
    );
  }) as typeof fetch;
}

function verify(
  claims: LegalArtifactIdentityClaims = validClaims,
  options: {
    packet?: unknown;
    operation?: LegalArtifactIdentityClaims['operation'];
    targetFingerprintHash?: string;
    planDigest?: string;
    actualImageDigest?: string;
    env?: NodeJS.ProcessEnv;
  } = {},
) {
  const signed = parseAndVerifyLegalArtifactIdentitySignature({
    envelope: signedEnvelope(claims),
    trustedPublicKeys: { 'test-key': publicKeyPem },
    now,
  });
  return verifyLegalArtifactIdentity({
    signed,
    packet: options.packet ?? packet,
    operation: options.operation ?? claims.operation,
    targetFingerprintHash: options.targetFingerprintHash ?? targetFingerprintHash,
    planDigest: options.planDigest,
    now,
    root: process.cwd(),
    env: options.env ?? env({ BUILD_SHA: 'deliberately-untrusted-label-value' }),
    fetchImpl: fetchFor(options.actualImageDigest ?? imageDigest),
  });
}

describe('signed legal artifact identity', () => {
  it('accepts a valid signature after checking the packet, source manifests, target, and live ARM image', async () => {
    const result = await verify();
    expect(result.claims).toMatchObject({
      sourceHead,
      imageDigest,
      manifestDigest: validClaims.manifestDigest,
      modelDigest: validClaims.modelDigest,
      packetDigest: validClaims.packetDigest,
      targetFingerprintHash,
    });
  });

  it('refuses when no approved signing key is pinned for production', () => {
    expect(Object.keys(LEGAL_ARTIFACT_IDENTITY_TRUSTED_PUBLIC_KEYS)).toHaveLength(0);
    expect(() =>
      parseAndVerifyLegalArtifactIdentitySignature({
        envelope: signedEnvelope(),
        now,
      }),
    ).toThrow('Legal artifact identity signing key is not trusted.');
  });

  it('refuses a missing binding field and a changed signature', () => {
    const missing = { ...signedEnvelope() } as { claims: Record<string, unknown>; signature: string };
    missing.claims = { ...validClaims };
    delete missing.claims.modelDigest;
    expect(() =>
      parseAndVerifyLegalArtifactIdentitySignature({
        envelope: missing,
        trustedPublicKeys: { 'test-key': publicKeyPem },
        now,
      }),
    ).toThrow('Legal artifact identity is missing or malformed.');

    const changed = { ...signedEnvelope(), signature: 'A'.repeat(86) };
    expect(() =>
      parseAndVerifyLegalArtifactIdentitySignature({
        envelope: changed,
        trustedPublicKeys: { 'test-key': publicKeyPem },
        now,
      }),
    ).toThrow('Legal artifact identity signature is invalid.');
  });

  it('refuses each missing claim field and missing envelope identity fields', () => {
    for (const field of Object.keys(validClaims)) {
      const malformed = {
        ...signedEnvelope(),
        claims: { ...validClaims } as Record<string, unknown>,
      };
      delete malformed.claims[field];
      expect(() =>
        parseAndVerifyLegalArtifactIdentitySignature({
          envelope: malformed,
          trustedPublicKeys: { 'test-key': publicKeyPem },
          now,
        }),
      ).toThrow('Legal artifact identity is missing or malformed.');
    }

    const missingKey = { ...signedEnvelope() } as Record<string, unknown>;
    delete missingKey.keyId;
    const missingSignature = { ...signedEnvelope() } as Record<string, unknown>;
    delete missingSignature.signature;
    for (const envelope of [missingKey, missingSignature]) {
      expect(() =>
        parseAndVerifyLegalArtifactIdentitySignature({
          envelope,
          trustedPublicKeys: { 'test-key': publicKeyPem },
          now,
        }),
      ).toThrow('Legal artifact identity is missing or malformed.');
    }
  });

  it('refuses changed signer, format, purpose, image digest, job resource, and time bounds', async () => {
    expect(() =>
      parseAndVerifyLegalArtifactIdentitySignature({
        envelope: signedEnvelope(validClaims, 'untrusted-key'),
        trustedPublicKeys: { 'test-key': publicKeyPem },
        now,
      }),
    ).toThrow('Legal artifact identity signing key is not trusted.');

    expect(() =>
      verify({ ...validClaims, formatVersion: 2 } as unknown as LegalArtifactIdentityClaims),
    ).toThrow('Legal artifact identity is missing or malformed.');
    expect(() =>
      verify({ ...validClaims, purpose: 'other-purpose' } as unknown as LegalArtifactIdentityClaims),
    ).toThrow('Legal artifact identity is missing or malformed.');
    await expect(
      verify({ ...validClaims, imageDigest: 'sha256:' + 'f'.repeat(64) }),
    ).rejects.toThrow('Running Container Apps job image differs from the signed artifact identity.');
    await expect(
      verify({
        ...validClaims,
        jobResourceId:
          '/subscriptions/384dc69e-9e22-419f-9e3d-83fbac4f58d0/resourceGroups/rg-property-listify/providers/Microsoft.App/jobs/other-job',
      }),
    ).rejects.toThrow('Container Apps job name differs from the signed artifact identity.');
    expect(() =>
      parseAndVerifyLegalArtifactIdentitySignature({
        envelope: signedEnvelope({
          ...validClaims,
          issuedAt: '2026-11-06T11:00:00.000Z',
          expiresAt: '2026-11-06T11:20:00.000Z',
        }),
        trustedPublicKeys: { 'test-key': publicKeyPem },
        now,
      }),
    ).toThrow('Legal artifact identity is expired or outside its signed operation window.');
    expect(() =>
      parseAndVerifyLegalArtifactIdentitySignature({
        envelope: signedEnvelope({ ...validClaims, expiresAt: '2026-11-06T10:04:00.000Z' }),
        trustedPublicKeys: { 'test-key': publicKeyPem },
        now,
      }),
    ).toThrow('Legal artifact identity is expired or outside its signed operation window.');
  });

  it('refuses changed source SHA, packet digest, operation, target, and plan digest bindings', async () => {
    await expect(verify({ ...validClaims, sourceHead: '1'.repeat(40) })).rejects.toThrow(
      'Legal release packet differs from the signed artifact identity.',
    );
    await expect(
      verify(validClaims, { packet: { ...packet, note: 'different packet' } }),
    ).rejects.toThrow('Legal release packet differs from the signed artifact identity.');
    await expect(
      verify(validClaims, { operation: 'legal-release-verify' }),
    ).rejects.toThrow('Legal artifact identity operation or target binding differs.');
    await expect(
      verify(validClaims, { targetFingerprintHash: 'c'.repeat(64) }),
    ).rejects.toThrow('Legal artifact identity operation or target binding differs.');

    const applyClaims = {
      ...validClaims,
      operation: 'legal-release-apply' as const,
      planDigest: 'd'.repeat(64),
    };
    await expect(verify(applyClaims, { planDigest: 'e'.repeat(64) })).rejects.toThrow(
      'Legal artifact identity operation or target binding differs.',
    );
  });

  it('refuses changed manifest and model digests', async () => {
    await expect(verify({ ...validClaims, manifestDigest: '0'.repeat(64) })).rejects.toThrow(
      'Legal artifact identity manifest or model digest differs from this image.',
    );
    await expect(verify({ ...validClaims, modelDigest: '0'.repeat(64) })).rejects.toThrow(
      'Legal artifact identity manifest or model digest differs from this image.',
    );
  });

  it('refuses an image digest that differs from the ACA job ARM resource', async () => {
    await expect(verify(validClaims, { actualImageDigest: 'sha256:' + 'f'.repeat(64) })).rejects.toThrow(
      'Running Container Apps job image differs from the signed artifact identity.',
    );
  });

  it('refuses a different job name, missing platform execution markers, and an unsigned image tag', async () => {
    await expect(
      verify(validClaims, { env: env({ CONTAINER_APP_JOB_NAME: 'other-job' }) }),
    ).rejects.toThrow('Container Apps job name differs from the signed artifact identity.');
    await expect(
      verify(validClaims, { env: env({ CONTAINER_APP_JOB_EXECUTION_NAME: '' }) }),
    ).rejects.toThrow('Legal artifact identity requires an active Container Apps job execution.');

    const tagOnlyFetch: typeof fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('http://localhost:42356/')) {
        const accessToken =
          'header.' + Buffer.from(JSON.stringify({ oid: principalId })).toString('base64url') + '.signature';
        return new Response(JSON.stringify({ access_token: accessToken }), { status: 200 });
      }
      if (url.includes('/executions/')) {
        return new Response(
          JSON.stringify({
            id: jobId + '/executions/ca-legal-release-test-abc',
            properties: {
              template: {
                containers: [{ name: 'legal-installer', image: 'acr.example/legal:launch' }],
              },
            },
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          id: jobId,
          type: 'Microsoft.App/jobs',
          identity: { type: 'SystemAssigned', principalId },
          properties: {
            template: { containers: [{ name: 'legal-installer', image: 'acr.example/legal:launch' }] },
          },
        }),
        { status: 200 },
      );
    }) as typeof fetch;
    const signed = parseAndVerifyLegalArtifactIdentitySignature({
      envelope: signedEnvelope(),
      trustedPublicKeys: { 'test-key': publicKeyPem },
      now,
    });
    await expect(
      verifyLegalArtifactIdentity({
        signed,
        packet,
        operation: 'legal-release-plan',
        targetFingerprintHash,
        now,
        root: process.cwd(),
        env: env(),
        fetchImpl: tagOnlyFetch,
      }),
    ).rejects.toThrow('Azure Container Apps job image must be pinned by digest.');
  });

  it('requires the ACA system identity to match the job ARM resource identity', async () => {
    const wrongPrincipal = '2c4dcb5b-37b1-47fa-b20e-74548c1e6397';
    const accessToken =
      'header.' + Buffer.from(JSON.stringify({ oid: wrongPrincipal })).toString('base64url') + '.signature';
    const fetchImpl: typeof fetch = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).startsWith('http://localhost:42356/'))
        return new Response(JSON.stringify({ access_token: accessToken }), { status: 200 });
      if (String(input).includes('/executions/')) {
        return new Response(
          JSON.stringify({
            id: jobId + '/executions/ca-legal-release-test-abc',
            properties: {
              template: {
                containers: [{ name: 'legal-installer', image: 'acr.example/legal@' + imageDigest }],
              },
            },
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          id: jobId,
          type: 'Microsoft.App/jobs',
          identity: { type: 'SystemAssigned', principalId },
          properties: {
            template: {
              containers: [{ name: 'legal-installer', image: 'acr.example/legal@' + imageDigest }],
            },
          },
        }),
        { status: 200 },
      );
    }) as typeof fetch;
    const signed = parseAndVerifyLegalArtifactIdentitySignature({
      envelope: signedEnvelope(),
      trustedPublicKeys: { 'test-key': publicKeyPem },
      now,
    });
    await expect(
      verifyLegalArtifactIdentity({
        signed,
        packet,
        operation: 'legal-release-plan',
        targetFingerprintHash,
        now,
        root: process.cwd(),
        env: env(),
        fetchImpl,
      }),
    ).rejects.toThrow('Azure Container Apps job identity differs from the active execution.');
  });
});
