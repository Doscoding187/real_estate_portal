import { createHash } from 'node:crypto';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type KeyLike } from 'jose';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  FOUNDER_GOOGLE_STATE_TTL_MS,
  FounderGoogleIdentityProof,
  founderGooglePrincipal,
  hashGoogleOpaqueValue,
  resolveFounderGoogleProofConfig,
  type FounderGoogleProofConfig,
  type FounderGoogleState,
  type FounderGoogleStateStore,
} from './founderGoogleIdentity';

const NOW = Date.parse('2026-10-06T21:00:00Z');
const CONFIG: FounderGoogleProofConfig = {
  clientId: 'local-test.apps.googleusercontent.com',
  clientSecret: 'private-local-test-secret',
  founderEmail: 'founder@example.test',
  redisUrl: 'redis://127.0.0.1:6379',
  secure: false,
  redirectUri: 'http://127.0.0.1:1234/api/auth/google/callback',
};

let privateKey: KeyLike;
let wrongPrivateKey: KeyLike;
let keys: ReturnType<typeof createLocalJWKSet>;
beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  wrongPrivateKey = (await generateKeyPair('RS256')).privateKey;
  keys = createLocalJWKSet({
    keys: [{ ...(await exportJWK(pair.publicKey)), kid: 'local', alg: 'RS256' }],
  });
});

/** Disposable unit-test seam only; no in-memory hosted state store exists. */
function harness(
  options: {
    claims?: Record<string, unknown>;
    signingKey?: () => KeyLike;
    missingClaim?: string;
    fetchFailure?: boolean;
    providerStatus?: number;
    purpose?: FounderGoogleState['purpose'];
  } = {},
) {
  let now = NOW;
  const records = new Map<string, FounderGoogleState>();
  const store: FounderGoogleStateStore = {
    save: vi.fn(async (state, value) => {
      records.set(state, value);
    }),
    consume: vi.fn(async (state, browserHash) => {
      const value = records.get(state);
      if (!value || value.browserHash !== browserHash) return null;
      records.delete(state);
      return value;
    }),
    close: vi.fn(async () => undefined),
  };
  let token = '';
  const fetcher = vi.fn(async (_url, init) => {
    if (options.fetchFailure) throw new Error('provider-error-with-secret-and-code');
    const verifier = new URLSearchParams(init?.body as URLSearchParams).get('code_verifier');
    const record = [...saved.values()].find(value => value.verifier === verifier)!;
    const claims: Record<string, unknown> = {
      sub: 'controlled-unit-google-subject',
      iss: 'https://accounts.google.com',
      aud: CONFIG.clientId,
      nonce: record.nonce,
      email: CONFIG.founderEmail,
      email_verified: true,
      iat: NOW / 1000,
      exp: NOW / 1000 + 600,
      ...options.claims,
    };
    if (options.missingClaim) delete claims[options.missingClaim];
    token = await new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'local' })
      .sign(options.signingKey?.() ?? privateKey);
    return new Response(JSON.stringify({ id_token: token, access_token: 'not-persisted' }), {
      status: options.providerStatus ?? 200,
    });
  }) as typeof fetch & ReturnType<typeof vi.fn>;
  const saved = new Map<string, FounderGoogleState>();
  const save = store.save;
  store.save = vi.fn(async (state, value) => {
    saved.set(state, { ...value });
    await save(state, value);
  });
  const proof = new FounderGoogleIdentityProof(CONFIG, store, { keys, fetcher, now: () => now, purpose: options.purpose });
  async function start() {
    const result = await proof.start();
    const url = new URL(result.authorizationUrl);
    return { ...result, url, state: url.searchParams.get('state')!, code: 'local-unit-code' };
  }
  return {
    proof,
    store,
    records,
    fetcher,
    saved,
    start,
    setNow: (value: number) => {
      now = value;
    },
    token: () => token,
  };
}

describe('founder Google identity configuration', () => {
  const env = {
    APP_ENV: 'production',
    NODE_ENV: 'production',
    FOUNDER_GOOGLE_PROOF_ENABLED: 'true',
    GOOGLE_OAUTH_CLIENT_ID: CONFIG.clientId,
    GOOGLE_OAUTH_CLIENT_SECRET: CONFIG.clientSecret,
    GOOGLE_OAUTH_REDIRECT_URI: 'https://api.example.test/api/auth/google/callback',
    FOUNDER_GOOGLE_EMAIL: ' Founder@Example.Test ',
    REDIS_URL: CONFIG.redisUrl,
  };
  it('is disabled by default and requires deliberate complete configuration', () => {
    expect(resolveFounderGoogleProofConfig({})).toBeNull();
    expect(resolveFounderGoogleProofConfig({ FOUNDER_GOOGLE_PROOF_ENABLED: 'false' })).toBeNull();
    expect(resolveFounderGoogleProofConfig(env)).toMatchObject({
      secure: true,
      founderEmail: CONFIG.founderEmail,
    });
  });
  it.each([
    ['GOOGLE_OAUTH_CLIENT_ID', ''],
    ['GOOGLE_OAUTH_CLIENT_SECRET', ''],
    ['FOUNDER_GOOGLE_EMAIL', ''],
    ['REDIS_URL', 'http://redis.example.test'],
    ['FOUNDER_GOOGLE_PROOF_ENABLED', 'TRUE'],
    ['GOOGLE_OAUTH_REDIRECT_URI', 'http://api.example.test/api/auth/google/callback'],
    ['GOOGLE_OAUTH_REDIRECT_URI', 'https://api.example.test/api/auth/google/callback?next=evil'],
    ['GOOGLE_OAUTH_REDIRECT_URI', 'https://api.example.test/not-the-callback'],
    ['GOOGLE_OAUTH_REDIRECT_URI', 'https://user:secret@api.example.test/api/auth/google/callback'],
  ])('fails closed for invalid %s', (key, value) => {
    expect(() => resolveFounderGoogleProofConfig({ ...env, [key]: value })).toThrow(
      'Founder Google identity proof is unavailable.',
    );
  });
});

describe('founder Google identity proof', () => {
  it('binds browser, state, nonce and S256 PKCE and asks for identity claims only', async () => {
    const h = harness();
    const first = await h.start();
    const second = await h.start();
    const record = h.saved.get(first.state)!;
    expect(first.url.origin + first.url.pathname).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );
    expect(first.url.searchParams.get('scope')).toBe('openid email');
    expect(first.url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(first.url.searchParams.get('code_challenge')).toBe(
      createHash('sha256').update(record.verifier).digest('base64url'),
    );
    expect(first.url.searchParams.get('nonce')).toBe(record.nonce);
    expect(first.url.searchParams.has('access_type')).toBe(false);
    expect(first.url.searchParams.has('login_hint')).toBe(false);
    expect(first.authorizationUrl).not.toContain(CONFIG.clientSecret);
    expect(first.state).not.toBe(second.state);
    expect(first.browserBinding).not.toBe(second.browserBinding);
    expect(record.browserHash).toBe(hashGoogleOpaqueValue(first.browserBinding));
  });

  it('verifies signed Google claims, returns a bounded principal and consumes state once', async () => {
    const h = harness();
    const attempt = await h.start();
    const result = await h.proof.finish(attempt);
    expect(result).toEqual({ principal: founderGooglePrincipal('controlled-unit-google-subject') });
    expect(result.principal).toMatch(/^google:[A-Za-z0-9_-]{43}$/);
    expect(result.principal.length).toBeLessThanOrEqual(64);
    expect(h.fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = h.fetcher.mock.calls[0];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    expect(init?.redirect).toBe('error');
    const body = new URLSearchParams(init?.body as URLSearchParams);
    expect(body.get('redirect_uri')).toBe(CONFIG.redirectUri);
    expect(body.get('client_secret')).toBe(CONFIG.clientSecret);
    expect(body.get('code_verifier')).toBe(h.saved.get(attempt.state)?.verifier);
    expect(JSON.stringify(result)).not.toContain(h.token());
    await expect(h.proof.finish(attempt)).rejects.toMatchObject({
      code: 'FOUNDER_GOOGLE_STATE_INVALID',
    });
    expect(h.fetcher).toHaveBeenCalledTimes(1);
  });

  it('rejects a different browser without consuming the legitimate attempt', async () => {
    const h = harness();
    const attempt = await h.start();
    await expect(
      h.proof.finish({ ...attempt, browserBinding: 'Z'.repeat(43) }),
    ).rejects.toMatchObject({ code: 'FOUNDER_GOOGLE_STATE_INVALID' });
    expect(h.fetcher).not.toHaveBeenCalled();
    expect(h.records.has(attempt.state)).toBe(true);
    await expect(h.proof.finish(attempt)).resolves.toHaveProperty('principal');
  });

  it('allows only one of concurrent callbacks to exchange the authorization code', async () => {
    const h = harness();
    const attempt = await h.start();
    const outcomes = await Promise.allSettled([h.proof.finish(attempt), h.proof.finish(attempt)]);
    expect(outcomes.filter(outcome => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(h.fetcher).toHaveBeenCalledTimes(1);
  });

  it('rejects exact expiry and corrupt stored state before contacting Google', async () => {
    const h = harness();
    const attempt = await h.start();
    h.setNow(NOW + FOUNDER_GOOGLE_STATE_TTL_MS);
    await expect(h.proof.finish(attempt)).rejects.toMatchObject({
      code: 'FOUNDER_GOOGLE_STATE_INVALID',
    });
    expect(h.fetcher).not.toHaveBeenCalled();
    const bad = harness();
    const fresh = await bad.start();
    bad.records.get(fresh.state)!.createdAt = NOW + 1;
    await expect(bad.proof.finish(fresh)).rejects.toMatchObject({
      code: 'FOUNDER_GOOGLE_STATE_INVALID',
    });
  });

  it('rejects missing cookie, malformed state and Google cancellation', async () => {
    const h = harness();
    const attempt = await h.start();
    await expect(h.proof.finish({ ...attempt, browserBinding: undefined })).rejects.toMatchObject({
      code: 'FOUNDER_GOOGLE_STATE_INVALID',
    });
    await expect(h.proof.finish({ ...attempt, state: ['malformed'] })).rejects.toMatchObject({
      code: 'FOUNDER_GOOGLE_STATE_INVALID',
    });
    await expect(
      h.proof.finish({ ...attempt, providerError: 'access_denied', code: undefined }),
    ).rejects.toMatchObject({ code: 'FOUNDER_GOOGLE_STATE_INVALID' });
    expect(h.fetcher).not.toHaveBeenCalled();
    expect(h.records.size).toBe(0);
  });

  it.each([
    { iss: 'https://attacker.example.test' },
    { aud: 'wrong-client' },
    { aud: [CONFIG.clientId, 'other-client'] },
    { azp: 'wrong-client' },
    { nonce: 'Z'.repeat(43) },
    { nonce: ['wrong'] },
    { email_verified: false },
    { email_verified: 'true' },
    { email: 'different-person@example.test' },
    { sub: '' },
    { exp: NOW / 1000 },
    { iat: NOW / 1000 - 301 },
    { iat: NOW / 1000 + 30 },
  ])('rejects invalid signed claims %j', async claims => {
    const h = harness({ claims });
    const attempt = await h.start();
    await expect(h.proof.finish(attempt)).rejects.toMatchObject({
      code: 'FOUNDER_GOOGLE_CLAIMS_INVALID',
    });
    expect(h.records.size).toBe(0);
    await expect(h.proof.finish(attempt)).rejects.toMatchObject({
      code: 'FOUNDER_GOOGLE_STATE_INVALID',
    });
  });

  it.each(['sub', 'exp', 'iat', 'nonce', 'email', 'email_verified'])(
    'rejects missing %s',
    async missingClaim => {
      const h = harness({ missingClaim });
      const attempt = await h.start();
      await expect(h.proof.finish(attempt)).rejects.toMatchObject({
        code: 'FOUNDER_GOOGLE_CLAIMS_INVALID',
      });
    },
  );

  it('rejects a forged signature', async () => {
    const h = harness({ signingKey: () => wrongPrivateKey });
    const attempt = await h.start();
    await expect(h.proof.finish(attempt)).rejects.toMatchObject({
      code: 'FOUNDER_GOOGLE_CLAIMS_INVALID',
    });
  });

  it('rejects state that expires during an otherwise valid token exchange', async () => {
    const h = harness({ claims: { iat: NOW / 1000 + 301, exp: NOW / 1000 + 901 } });
    const attempt = await h.start();
    const originalFetch = h.fetcher.getMockImplementation()!;
    h.fetcher.mockImplementation(async (...args: any[]) => {
      h.setNow(NOW + FOUNDER_GOOGLE_STATE_TTL_MS + 1);
      return originalFetch(...args);
    });
    await expect(h.proof.finish(attempt)).rejects.toMatchObject({
      code: 'FOUNDER_GOOGLE_CLAIMS_INVALID',
    });
  });

  it.each([400, 500])('rejects unsuccessful token exchange HTTP %i', async providerStatus => {
    const h = harness({ providerStatus });
    const attempt = await h.start();
    await expect(h.proof.finish(attempt)).rejects.toMatchObject({
      code: 'FOUNDER_GOOGLE_PROVIDER_UNAVAILABLE',
    });
    expect(h.records.size).toBe(0);
  });

  it('fails closed after a provider error, without exposing diagnostics or reusing state', async () => {
    const h = harness({ fetchFailure: true });
    const attempt = await h.start();
    await expect(h.proof.finish(attempt)).rejects.toMatchObject({
      code: 'FOUNDER_GOOGLE_PROVIDER_UNAVAILABLE',
      status: 503,
      message: 'Google sign-in could not complete. Start again.',
    });
    await expect(h.proof.finish(attempt)).rejects.toMatchObject({
      code: 'FOUNDER_GOOGLE_STATE_INVALID',
    });
  });

  it('does not shorten long Google subjects to fit the canonical identity field', () => {
    const long = 'x'.repeat(255);
    expect(founderGooglePrincipal(long)).toHaveLength(50);
    expect(founderGooglePrincipal(long)).not.toBe(founderGooglePrincipal(long.slice(0, 64)));
    expect(() => founderGooglePrincipal('x'.repeat(256))).toThrow();
  });
});

describe('proof/login configuration transition boundary', () => {
  it.each(['founder-proof', 'founder-login'] as const)('refuses a callback initiated for the other purpose: %s', async purpose => {
    const h = harness({ purpose });
    const started = await h.start();
    h.records.get(started.state)!.purpose = purpose === 'founder-proof' ? 'founder-login' : 'founder-proof';
    await expect(h.proof.finish({ state: started.state, code: started.code, browserBinding: started.browserBinding }))
      .rejects.toMatchObject({ status: 400, code: 'FOUNDER_GOOGLE_STATE_INVALID' });
    expect(h.fetcher).not.toHaveBeenCalled();
  });
});
