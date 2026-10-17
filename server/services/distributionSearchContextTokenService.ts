import { createHmac, timingSafeEqual } from 'node:crypto';

type DistributionSearchContextPayload = {
  v: 1;
  purpose: 'distribution_search_results';
  developmentId: number;
  unitTypeId: string;
  issuedAt: number;
  expiresAt: number;
};

const DEFAULT_TTL_SECONDS = 60 * 60 * 24;

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decode(value: string) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;
}

function getSecret(secret?: string | null) {
  const configured = secret ?? process.env.DISTRIBUTION_SEARCH_CONTEXT_SECRET ?? process.env.JWT_SECRET;
  if (configured?.trim()) return configured.trim();
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Distribution search context token secret is not configured.');
  }
  return 'distribution-search-context-dev-only';
}

function signature(encodedPayload: string, secret: string) {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

export function createDistributionSearchContextToken(
  input: { developmentId: number; unitTypeId: string },
  options?: { secret?: string | null; now?: number; ttlSeconds?: number },
) {
  const developmentId = Number(input.developmentId);
  const unitTypeId = input.unitTypeId.trim();
  if (!Number.isSafeInteger(developmentId) || developmentId <= 0 || !unitTypeId || unitTypeId.length > 36) {
    throw new Error('A canonical development and unit are required for search context.');
  }

  const issuedAt = Math.floor((options?.now ?? Date.now()) / 1000);
  const ttlSeconds = Math.floor(options?.ttlSeconds ?? DEFAULT_TTL_SECONDS);
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > DEFAULT_TTL_SECONDS) {
    throw new Error('Distribution search context token lifetime is invalid.');
  }

  const payload: DistributionSearchContextPayload = {
    v: 1,
    purpose: 'distribution_search_results',
    developmentId,
    unitTypeId,
    issuedAt,
    expiresAt: issuedAt + ttlSeconds,
  };
  const encodedPayload = encode(payload);
  return `${encodedPayload}.${signature(encodedPayload, getSecret(options?.secret))}`;
}

export function verifyDistributionSearchContextToken(
  token: string,
  options?: { secret?: string | null; now?: number },
): DistributionSearchContextPayload {
  const [encodedPayload, suppliedSignature, extra] = token.trim().split('.');
  if (!encodedPayload || !suppliedSignature || extra !== undefined) {
    throw new Error('Invalid distribution search context token format.');
  }

  const expectedSignature = signature(encodedPayload, getSecret(options?.secret));
  const supplied = Buffer.from(suppliedSignature, 'utf8');
  const expected = Buffer.from(expectedSignature, 'utf8');
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new Error('Invalid distribution search context token signature.');
  }

  const value = decode(encodedPayload);
  if (!value || typeof value !== 'object') throw new Error('Invalid distribution search context payload.');
  const payload = value as Partial<DistributionSearchContextPayload>;
  const now = Math.floor((options?.now ?? Date.now()) / 1000);
  if (
    payload.v !== 1 ||
    payload.purpose !== 'distribution_search_results' ||
    !Number.isSafeInteger(payload.developmentId) ||
    Number(payload.developmentId) <= 0 ||
    typeof payload.unitTypeId !== 'string' ||
    !payload.unitTypeId.trim() ||
    payload.unitTypeId.length > 36 ||
    !Number.isSafeInteger(payload.issuedAt) ||
    !Number.isSafeInteger(payload.expiresAt) ||
    Number(payload.issuedAt) > now + 60 ||
    Number(payload.expiresAt) <= now ||
    Number(payload.expiresAt) <= Number(payload.issuedAt) ||
    Number(payload.expiresAt) - Number(payload.issuedAt) > DEFAULT_TTL_SECONDS
  ) {
    throw new Error('Distribution search context token is expired or invalid.');
  }

  return payload as DistributionSearchContextPayload;
}
