import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { resolveAppRuntimeEnv } from './runtimeBootstrap';
import { isValidAuthRateLimitRedisUrl } from './authRateLimitStore';

export const FOUNDER_GOOGLE_CALLBACK_PATH = '/api/auth/google/callback';
export const FOUNDER_GOOGLE_STATE_TTL_MS = 5 * 60 * 1000;
const GOOGLE_AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_KEYS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const OPAQUE_VALUE = /^[A-Za-z0-9_-]{43}$/;

export class FounderGoogleIdentityError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'FounderGoogleIdentityError';
  }
}

export type FounderGoogleProofConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  founderEmail: string;
  redisUrl: string;
  secure: boolean;
};

/** Explicit opt-in only. A partially enabled provider must not silently degrade. */
export function resolveFounderGoogleProofConfig(
  env: NodeJS.ProcessEnv = process.env,
): FounderGoogleProofConfig | null {
  const enabled = env.FOUNDER_GOOGLE_PROOF_ENABLED;
  if (!enabled || enabled === 'false') return null;
  const invalid = () =>
    new FounderGoogleIdentityError(
      'FOUNDER_GOOGLE_CONFIGURATION_INVALID',
      503,
      'Founder Google identity proof is unavailable.',
    );
  if (enabled !== 'true') throw invalid();

  const clientId = env.GOOGLE_OAUTH_CLIENT_ID?.trim() || '';
  const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET || '';
  const founderEmail = env.FOUNDER_GOOGLE_EMAIL?.trim().toLowerCase() || '';
  const redirectUri = env.GOOGLE_OAUTH_REDIRECT_URI?.trim() || '';
  const redisUrl = env.REDIS_URL?.trim() || '';
  if (
    !/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId) ||
    !clientSecret.trim() ||
    clientSecret.length > 4096 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(founderEmail) ||
    !isValidAuthRateLimitRedisUrl(redisUrl)
  )
    throw invalid();

  let redirect: URL;
  try {
    redirect = new URL(redirectUri);
  } catch {
    throw invalid();
  }
  const runtime = resolveAppRuntimeEnv(env);
  const secure = runtime === 'production' || runtime === 'staging';
  const localHttp =
    !secure &&
    redirect.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(redirect.hostname);
  if (
    (redirect.protocol !== 'https:' && !localHttp) ||
    redirect.username ||
    redirect.password ||
    redirect.search ||
    redirect.hash ||
    redirect.pathname !== FOUNDER_GOOGLE_CALLBACK_PATH ||
    redirect.href !== redirectUri
  ) {
    throw invalid();
  }
  return { clientId, clientSecret, founderEmail, redirectUri, redisUrl, secure };
}

export type FounderGoogleState = {
  nonce: string;
  verifier: string;
  browserHash: string;
  createdAt: number;
  expiresAt: number;
};

/** Production must atomically validate the browser binding and consume the state. */
export interface FounderGoogleStateStore {
  save(state: string, record: FounderGoogleState): Promise<void>;
  consume(state: string, browserHash: string): Promise<FounderGoogleState | null>;
  close(): Promise<void>;
}

export const hashGoogleOpaqueValue = (value: string) =>
  createHash('sha256').update(value).digest('hex');

/** Provider namespace plus a complete digest; never truncate a provider subject. */
export function founderGooglePrincipal(subject: string): string {
  if (!subject || subject.length > 255)
    throw new FounderGoogleIdentityError(
      'FOUNDER_GOOGLE_CLAIMS_INVALID',
      403,
      'Google identity could not be verified.',
    );
  return `google:${createHash('sha256').update(subject).digest('base64url')}`;
}

function invalidState(): FounderGoogleIdentityError {
  return new FounderGoogleIdentityError(
    'FOUNDER_GOOGLE_STATE_INVALID',
    400,
    'This Google sign-in attempt is invalid or expired. Start again.',
  );
}

function validateState(record: FounderGoogleState, browserHash: string, now: number): boolean {
  return (
    record &&
    typeof record === 'object' &&
    !Array.isArray(record) &&
    typeof record.nonce === 'string' &&
    typeof record.verifier === 'string' &&
    OPAQUE_VALUE.test(record.nonce) &&
    OPAQUE_VALUE.test(record.verifier) &&
    record.browserHash === browserHash &&
    Number.isSafeInteger(record.createdAt) &&
    Number.isSafeInteger(record.expiresAt) &&
    record.createdAt <= now &&
    record.expiresAt > now &&
    record.expiresAt - record.createdAt === FOUNDER_GOOGLE_STATE_TTL_MS
  );
}

export class FounderGoogleIdentityProof {
  private readonly keys: JWTVerifyGetKey;
  private readonly fetcher: typeof fetch;
  private readonly now: () => number;

  constructor(
    readonly config: FounderGoogleProofConfig,
    private readonly store: FounderGoogleStateStore,
    options: { keys?: JWTVerifyGetKey; fetcher?: typeof fetch; now?: () => number } = {},
  ) {
    this.keys =
      options.keys ?? createRemoteJWKSet(new URL(GOOGLE_KEYS_URL), { timeoutDuration: 2000 });
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? Date.now;
  }

  async start(): Promise<{ authorizationUrl: string; browserBinding: string }> {
    const state = randomBytes(32).toString('base64url');
    const browserBinding = randomBytes(32).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');
    const nonce = randomBytes(32).toString('base64url');
    const now = this.now();
    await this.store.save(state, {
      nonce,
      verifier,
      browserHash: hashGoogleOpaqueValue(browserBinding),
      createdAt: now,
      expiresAt: now + FOUNDER_GOOGLE_STATE_TTL_MS,
    });
    const url = new URL(GOOGLE_AUTHORIZATION_URL);
    url.search = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'openid email',
      state,
      nonce,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
      prompt: 'select_account',
    }).toString();
    return { authorizationUrl: url.href, browserBinding };
  }

  /** Returns an identity proof only: no database, account, privilege or session writes. */
  async finish(input: {
    state: unknown;
    code: unknown;
    browserBinding: unknown;
    providerError?: unknown;
  }): Promise<{ principal: string }> {
    if (
      typeof input.state !== 'string' ||
      !OPAQUE_VALUE.test(input.state) ||
      typeof input.browserBinding !== 'string' ||
      !OPAQUE_VALUE.test(input.browserBinding)
    ) {
      throw invalidState();
    }
    const browserHash = hashGoogleOpaqueValue(input.browserBinding);
    const record = await this.store.consume(input.state, browserHash);
    if (!record || !validateState(record, browserHash, this.now())) throw invalidState();
    if (
      input.providerError !== undefined ||
      typeof input.code !== 'string' ||
      !input.code ||
      input.code.length > 4096
    )
      throw invalidState();

    let token: string;
    try {
      const response = await this.fetcher(GOOGLE_TOKEN_URL, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: input.code,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.config.redirectUri,
          grant_type: 'authorization_code',
          code_verifier: record.verifier,
        }),
      });
      if (!response.ok) throw new Error('Token exchange failed');
      const body = await response.json();
      if (typeof body.id_token !== 'string' || body.id_token.length > 16384) {
        throw new Error('Missing ID token');
      }
      token = body.id_token;
    } catch {
      throw new FounderGoogleIdentityError(
        'FOUNDER_GOOGLE_PROVIDER_UNAVAILABLE',
        503,
        'Google sign-in could not complete. Start again.',
      );
    }

    try {
      const { payload } = await jwtVerify(token, this.keys, {
        algorithms: ['RS256'],
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        audience: this.config.clientId,
        requiredClaims: ['sub', 'exp', 'iat', 'nonce', 'email', 'email_verified'],
        maxTokenAge: 300,
        currentDate: new Date(this.now()),
      });
      const { nonce, sub, email, email_verified, aud, azp } = payload;
      if (
        !validateState(record, browserHash, this.now()) ||
        typeof nonce !== 'string' ||
        !OPAQUE_VALUE.test(nonce) ||
        !timingSafeEqual(Buffer.from(nonce), Buffer.from(record.nonce)) ||
        typeof sub !== 'string' ||
        !sub ||
        sub.length > 255 ||
        typeof email !== 'string' ||
        email.trim().toLowerCase() !== this.config.founderEmail ||
        email_verified !== true ||
        aud !== this.config.clientId ||
        (azp !== undefined && azp !== this.config.clientId)
      ) {
        throw new Error('Invalid claims');
      }
      return { principal: founderGooglePrincipal(sub) };
    } catch {
      throw new FounderGoogleIdentityError(
        'FOUNDER_GOOGLE_CLAIMS_INVALID',
        403,
        'Google identity could not be verified.',
      );
    }
  }
}
