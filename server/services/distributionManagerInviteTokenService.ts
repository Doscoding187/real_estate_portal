import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_INVITE_TTL_SECONDS = 60 * 60 * 24 * 7;

type ManagerInviteTokenPayload = {
  v: 1;
  registrationId: number;
  email: string;
  iat: number;
  exp: number;
};

function toBase64Url(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function fromBase64Url(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function signPayload(encodedPayload: string, secret: string) {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

function assertSecret(secret: string | null | undefined) {
  if (secret && secret.trim()) {
    return secret.trim();
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Distribution manager invite token secret is not configured.');
  }

  return 'distribution-manager-invite-dev-only';
}

export function createDistributionManagerInviteToken(
  input: { registrationId: number; email: string },
  options?: { secret?: string | null; now?: number; ttlSeconds?: number },
) {
  const secret = assertSecret(options?.secret);
  const now = Math.floor((options?.now ?? Date.now()) / 1000);
  const payload: ManagerInviteTokenPayload = {
    v: 1,
    registrationId: input.registrationId,
    email: input.email.trim().toLowerCase(),
    iat: now,
    exp: now + (options?.ttlSeconds ?? DEFAULT_INVITE_TTL_SECONDS),
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function verifyDistributionManagerInviteToken(
  token: string,
  options?: { secret?: string | null; now?: number },
) {
  const secret = assertSecret(options?.secret);
  const trimmedToken = token.trim();
  const [encodedPayload, signature] = trimmedToken.split('.');

  if (!encodedPayload || !signature) {
    throw new Error('Invalid invite token format.');
  }

  const expectedSignature = signPayload(encodedPayload, secret);
  const actualBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid invite token signature.');
  }

  let payload: ManagerInviteTokenPayload;
  try {
    payload = JSON.parse(fromBase64Url(encodedPayload)) as ManagerInviteTokenPayload;
  } catch {
    throw new Error('Invalid invite token payload.');
  }

  const now = Math.floor((options?.now ?? Date.now()) / 1000);
  if (payload.v !== 1) {
    throw new Error('Unsupported invite token version.');
  }
  if (!Number.isInteger(payload.registrationId) || payload.registrationId <= 0) {
    throw new Error('Invalid invite token registration id.');
  }
  if (!payload.email || typeof payload.email !== 'string') {
    throw new Error('Invalid invite token email.');
  }
  if (!Number.isInteger(payload.exp) || payload.exp <= now) {
    throw new Error('Invite token has expired.');
  }

  return {
    registrationId: payload.registrationId,
    email: payload.email.trim().toLowerCase(),
    issuedAt: payload.iat,
    expiresAt: payload.exp,
  };
}
