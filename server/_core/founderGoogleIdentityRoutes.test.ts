import { once } from 'node:events';
import { request } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { describe, expect, it, vi } from 'vitest';
import { COOKIE_NAME } from '../../shared/const';
import { applyApiSecurityHeaders, resolveBrowserSecurityPolicy } from './browserSecurity';
import { registerFounderGoogleIdentityRoutes } from './founderGoogleIdentityRoutes';
import {
  FounderGoogleIdentityError,
  type FounderGoogleProofConfig,
  type FounderGoogleIdentityProof,
} from './founderGoogleIdentity';

async function withServer(
  run: (url: string, proof: any, config: FounderGoogleProofConfig) => Promise<void>,
  options: { disabled?: boolean; secure?: boolean } = {},
) {
  const app = express();
  app.set('trust proxy', 1);
  const policy = resolveBrowserSecurityPolicy({ env: {}, runtimeEnv: 'test' });
  app.use((req, res, next) => applyApiSecurityHeaders(policy, req, res, next));
  const principal = 'google:' + 'P'.repeat(43);
  const proof = {
    start: vi.fn(async () => ({
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?state=local',
      browserBinding: 'B'.repeat(43),
    })),
    finish: vi.fn(async () => ({ principal })),
  };
  const config: FounderGoogleProofConfig = {
    clientId: 'local.apps.googleusercontent.com',
    clientSecret: 'private-local-secret',
    founderEmail: 'founder@example.test',
    redisUrl: 'redis://127.0.0.1:6379',
    secure: options.secure ?? false,
    redirectUri: '',
  };
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  config.redirectUri = `${options.secure ? url.replace('http:', 'https:') : url}/api/auth/google/callback`;
  const close = registerFounderGoogleIdentityRoutes(app, {
    config: options.disabled ? null : config,
    proofFactory: () => proof as unknown as FounderGoogleIdentityProof,
  });
  try {
    await run(url, proof, config);
  } finally {
    await close();
    await new Promise<void>((resolve, reject) =>
      server.close(error => (error ? reject(error) : resolve())),
    );
  }
}

describe('normal browser founder Google identity-proof routes', () => {
  it('redirects to Google and sets a host-only, HttpOnly, short-lived browser binding', async () => {
    await withServer(async (url, proof) => {
      const response = await fetch(
        `${url}/api/auth/google/start?returnTo=https://attacker.example.test`,
        { redirect: 'manual' },
      );
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe(
        'https://accounts.google.com/o/oauth2/v2/auth?state=local',
      );
      const cookie = response.headers.get('set-cookie')!;
      expect(cookie).toContain('pl-founder-google-proof=');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).toContain('Max-Age=300');
      expect(cookie).not.toContain('Domain=');
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('referrer-policy')).toBe('no-referrer');
      expect(proof.start).toHaveBeenCalledTimes(1);
    });
  });

  it('uses the secure __Host cookie in a proxied HTTPS request', async () => {
    await withServer(
      async url => {
        const response = await fetch(`${url}/api/auth/google/start`, {
          redirect: 'manual',
          headers: { 'x-forwarded-proto': 'https' },
        });
        const cookie = response.headers.get('set-cookie')!;
        expect(cookie).toContain('__Host-pl-founder-google-proof=');
        expect(cookie).toContain('Secure');
        expect(cookie).toContain('Path=/');
        expect(cookie).not.toContain('Domain=');
      },
      { secure: true },
    );
  });

  it('returns a nonprivileged proof, never an application session, and clears the binding', async () => {
    await withServer(async (url, proof, config) => {
      const response = await fetch(
        `${url}/api/auth/google/callback?state=local-state&code=local-code`,
        {
          headers: {
            Cookie: `pl-founder-google-proof=${'B'.repeat(43)}; ${COOKIE_NAME}=existing-customer-cookie`,
          },
        },
      );
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
      expect(response.headers.get('x-frame-options')).toBe('DENY');
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
      expect(response.headers.get('cache-control')).toBe('no-store');
      const body = await response.text();
      expect(body).toContain('google:' + 'P'.repeat(43));
      expect(body).toContain('No account or admin session has been created.');
      expect(body).not.toContain(config.founderEmail);
      expect(body).not.toContain(config.clientSecret);
      expect(body).not.toContain('local-code');
      const cookie = response.headers.get('set-cookie')!;
      expect(cookie).toContain('pl-founder-google-proof=;');
      expect(cookie).not.toContain(`${COOKIE_NAME}=`);
      expect(proof.finish).toHaveBeenCalledWith({
        state: 'local-state',
        code: 'local-code',
        browserBinding: 'B'.repeat(43),
        providerError: undefined,
      });
    });
  });

  it('denies use on another host before storing state or exchanging a code', async () => {
    await withServer(async (url, proof) => {
      for (const path of [
        '/api/auth/google/start',
        '/api/auth/google/callback?state=local&code=local',
      ]) {
        const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
          request(url + path, { headers: { Host: 'attacker.example.test' } }, response => {
            let body = '';
            response.on('data', chunk => {
              body += chunk;
            });
            response.on('end', () => resolve({ status: response.statusCode!, body }));
          })
            .on('error', reject)
            .end();
        });
        expect(response.status).toBe(400);
        expect(JSON.parse(response.body)).toMatchObject({ code: 'FOUNDER_GOOGLE_ORIGIN_INVALID' });
      }
      expect(proof.start).not.toHaveBeenCalled();
      expect(proof.finish).not.toHaveBeenCalled();
    });
  });

  it('remains unavailable when not explicitly configured', async () => {
    await withServer(
      async (url, proof) => {
        const response = await fetch(`${url}/api/auth/google/start`);
        expect(response.status).toBe(503);
        expect(response.headers.get('set-cookie')).toBeNull();
        expect(proof.start).not.toHaveBeenCalled();
      },
      { disabled: true },
    );
  });

  it('sanitizes dependency errors and preserves typed fail-closed rejection', async () => {
    await withServer(async (url, proof) => {
      proof.finish.mockRejectedValueOnce(new Error('private-provider-secret-and-token'));
      const first = await fetch(`${url}/api/auth/google/callback`);
      expect(first.status).toBe(503);
      expect(await first.text()).not.toContain('private-provider-secret-and-token');
      proof.finish.mockRejectedValueOnce(
        new FounderGoogleIdentityError(
          'FOUNDER_GOOGLE_CLAIMS_INVALID',
          403,
          'Google identity could not be verified.',
        ),
      );
      const second = await fetch(`${url}/api/auth/google/callback`);
      expect(second.status).toBe(403);
      expect(second.headers.get('set-cookie')).not.toContain(`${COOKIE_NAME}=`);
    });
  });
});
