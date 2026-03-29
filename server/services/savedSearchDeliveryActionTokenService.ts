import { createHmac, timingSafeEqual } from 'node:crypto';

export type SavedSearchDeliveryAction = 'pause' | 'unsubscribe_email';

type SavedSearchDeliveryActionTokenPayload = {
  v: 1;
  action: SavedSearchDeliveryAction;
  savedSearchId: number;
  userId: number;
  iat: number;
  exp: number;
};

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

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
    throw new Error('Saved search delivery action token secret is not configured.');
  }

  return 'saved-search-delivery-action-dev-only';
}

export function createSavedSearchDeliveryActionToken(
  input: {
    action: SavedSearchDeliveryAction;
    savedSearchId: number;
    userId: number;
  },
  options?: { secret?: string | null; now?: number; ttlSeconds?: number },
) {
  const secret = assertSecret(options?.secret ?? process.env.SAVED_SEARCH_ACTION_TOKEN_SECRET);
  const now = Math.floor((options?.now ?? Date.now()) / 1000);
  const payload: SavedSearchDeliveryActionTokenPayload = {
    v: 1,
    action: input.action,
    savedSearchId: input.savedSearchId,
    userId: input.userId,
    iat: now,
    exp: now + (options?.ttlSeconds ?? DEFAULT_TOKEN_TTL_SECONDS),
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function verifySavedSearchDeliveryActionToken(
  token: string,
  options?: { secret?: string | null; now?: number },
) {
  const secret = assertSecret(options?.secret ?? process.env.SAVED_SEARCH_ACTION_TOKEN_SECRET);
  const trimmedToken = token.trim();
  const [encodedPayload, signature] = trimmedToken.split('.');

  if (!encodedPayload || !signature) {
    throw new Error('Invalid saved search action token format.');
  }

  const expectedSignature = signPayload(encodedPayload, secret);
  const actualBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid saved search action token signature.');
  }

  let payload: SavedSearchDeliveryActionTokenPayload;
  try {
    payload = JSON.parse(fromBase64Url(encodedPayload)) as SavedSearchDeliveryActionTokenPayload;
  } catch {
    throw new Error('Invalid saved search action token payload.');
  }

  const now = Math.floor((options?.now ?? Date.now()) / 1000);
  if (payload.v !== 1) {
    throw new Error('Unsupported saved search action token version.');
  }
  if (payload.action !== 'pause' && payload.action !== 'unsubscribe_email') {
    throw new Error('Invalid saved search action.');
  }
  if (!Number.isInteger(payload.savedSearchId) || payload.savedSearchId <= 0) {
    throw new Error('Invalid saved search id.');
  }
  if (!Number.isInteger(payload.userId) || payload.userId <= 0) {
    throw new Error('Invalid saved search user id.');
  }
  if (!Number.isInteger(payload.exp) || payload.exp <= now) {
    throw new Error('Saved search action token has expired.');
  }

  return {
    action: payload.action,
    savedSearchId: payload.savedSearchId,
    userId: payload.userId,
    issuedAt: payload.iat,
    expiresAt: payload.exp,
  };
}
