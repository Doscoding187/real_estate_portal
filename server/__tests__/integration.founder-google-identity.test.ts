import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { eq, inArray, like } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const priorJwt = vi.hoisted(() => {
  const prior = process.env.JWT_SECRET;
  if (!prior) process.env.JWT_SECRET = 'founder-google-disposable-test-session-key';
  return prior;
});
import { users } from '../../drizzle/schema';
import { COOKIE_NAME } from '../../shared/const';
import { getDb, shutdownDb } from '../db-connection';
import { AuthService, authService } from '../_core/auth';
import {
  FounderGoogleIdentityProof,
  founderGooglePrincipal,
  type FounderGoogleState,
  type FounderGoogleStateStore,
} from '../_core/founderGoogleIdentity';
import { registerFounderGoogleIdentityRoutes } from '../_core/founderGoogleIdentityRoutes';
import { FounderGoogleAccountService } from '../services/founderGoogleAccountService';
import { resolveDatabaseAuthority } from '../_core/databaseAuthority/context';
import { authorizeDatabaseOperation } from '../_core/databaseAuthority/authorization';
import { router, superAdminProcedure } from '../_core/trpc';
import { updateUserRoleWithAudit } from '../services/superAdminRoleAuthority';
import { deleteUserById } from '../db';

const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip;
describeWithDatabase(
  'unseeded disposable founder identity authority (real SQL, simulated Google)',
  () => {
    let database: any;
    const prefix = 'founder-google-' + randomUUID();
    const config = (label: string) => ({
      ownerPrincipal: founderGooglePrincipal(prefix + label),
      founderEmail: `${prefix}-${label}@example.test`,
      appOrigin: 'https://www.example.test',
    });
    const ownedRows = () =>
      database
        .select()
        .from(users)
        .where(like(users.email, `${prefix}%@example.test`));
    beforeAll(async () => {
      const authority = resolveDatabaseAuthority({ operation: 'test-fixture' });
      expect(['disposable-worktree', 'disposable-test']).toContain(authority.context.targetClass);
      authorizeDatabaseOperation(authority);
      database = await getDb();
      // Run before the canonical scenario reviewer, never delete or demote it.
      const owners = await database
        .select()
        .from(users)
        .where(eq(users.role, 'super_admin'))
        .limit(1);
      expect(owners).toHaveLength(0);
      expect(await ownedRows()).toHaveLength(0);
    });
    afterEach(async () => {
      vi.unstubAllEnvs();
      if (!database) return;
      const rows = await ownedRows();
      if (rows.length)
        await database.delete(users).where(
          inArray(
            users.id,
            rows.map((row: any) => row.id),
          ),
        );
    });
    afterAll(async () => {
      await shutdownDb();
      if (priorJwt === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = priorJwt;
    });

    it('creates one canonical founder and reuses it without role repair or a password', async () => {
      const c = config('first');
      const service = new FounderGoogleAccountService(c);
      const first = await service.authenticate(c.ownerPrincipal);
      const next = await service.authenticate(c.ownerPrincipal);
      expect(next.id).toBe(first.id);
      expect(first).toMatchObject({
        role: 'super_admin',
        founderAuthority: 'platform_founder',
        loginMethod: 'google-founder',
        passwordHash: null,
        emailVerified: 1,
        sessionVersion: 1,
      });
      expect(await ownedRows()).toHaveLength(1);
      await service.assertSessionBinding(first, c.ownerPrincipal);
      await database.insert(users).values([
        { email: config('customer-one').founderEmail, role: 'visitor' },
        { email: config('customer-two').founderEmail, role: 'visitor' },
      ]);
      expect(await ownedRows()).toHaveLength(3); // Many ordinary NULL authorities remain valid.
    });

    it('serializes independent concurrent first sign-ins with no orphan founders', async () => {
      const c = config('concurrent');
      const results = await Promise.allSettled(
        Array.from({ length: 12 }, () =>
          new FounderGoogleAccountService(c).authenticate(c.ownerPrincipal),
        ),
      );
      const fulfilled = results.filter(result => result.status === 'fulfilled');
      expect(fulfilled.length).toBeGreaterThan(0);
      const replay = await new FounderGoogleAccountService(c).authenticate(c.ownerPrincipal);
      for (const result of fulfilled)
        if (result.status === 'fulfilled') expect(result.value.id).toBe(replay.id);
      expect(await ownedRows()).toHaveLength(1);
    });

    it('cannot create two owners even with different concurrent principal configurations', async () => {
      const a = config('race-a');
      const b = config('race-b');
      const results = await Promise.allSettled([
        new FounderGoogleAccountService(a).authenticate(a.ownerPrincipal),
        new FounderGoogleAccountService(b).authenticate(b.ownerPrincipal),
      ]);
      expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
      expect(await ownedRows()).toHaveLength(1);
    });

    it.each(['email', 'openId', 'other-owner'] as const)(
      'refuses an existing %s identity without linking or promotion',
      async conflict => {
        const c = config('collision');
        await database.insert(users).values({
          email: conflict === 'email' ? c.founderEmail : config('collision-other').founderEmail,
          openId: conflict === 'openId' ? c.ownerPrincipal : null,
          role: conflict === 'other-owner' ? 'super_admin' : 'visitor',
        });
        await expect(
          new FounderGoogleAccountService(c).authenticate(c.ownerPrincipal),
        ).rejects.toMatchObject({ status: 409 });
        const rows = await ownedRows();
        expect(rows).toHaveLength(1);
        expect(rows[0].founderAuthority).toBeNull();
      },
    );

    it('stops on duplicate provider identities rather than selecting the first row', async () => {
      const c = config('duplicates');
      await database.insert(users).values([
        { email: config('duplicate-one').founderEmail, openId: c.ownerPrincipal, role: 'visitor' },
        { email: config('duplicate-two').founderEmail, openId: c.ownerPrincipal, role: 'visitor' },
      ]);
      await expect(
        new FounderGoogleAccountService(c).authenticate(c.ownerPrincipal),
      ).rejects.toMatchObject({ status: 409 });
      expect(await ownedRows()).toHaveLength(2);
    });

    it('rolls back a created account when a later local transaction step fails', async () => {
      const c = config('rollback');
      const faulted = {
        transaction: (callback: any) =>
          database.transaction(async (tx: any) => {
            let selects = 0;
            const seam = new Proxy(tx, {
              get(target, key) {
                if (key === 'select')
                  return (...args: any[]) => {
                    if (++selects === 3) throw new Error('local post-insert failure');
                    return target.select(...args);
                  };
                const value = target[key];
                return typeof value === 'function' ? value.bind(target) : value;
              },
            });
            return callback(seam);
          }),
      };
      await expect(
        new FounderGoogleAccountService(c, async () => faulted).authenticate(c.ownerPrincipal),
      ).rejects.toMatchObject({ status: 503 });
      expect(await ownedRows()).toHaveLength(0);
    });

    it('protects founder role and registration-cleanup deletion without granting another identity', async () => {
      const c = config('protected');
      const owner = await new FounderGoogleAccountService(c).authenticate(c.ownerPrincipal);
      await expect(
        updateUserRoleWithAudit({
          database,
          actorUserId: owner.id,
          targetUserId: owner.id,
          role: 'visitor',
          requestId: 'local-founder-negative',
        }),
      ).rejects.toThrow('separately reviewed');
      await expect(deleteUserById(owner.id)).rejects.toThrow('cannot be removed');
      const rows = await ownedRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ role: 'super_admin', sessionVersion: 1 });
    });

    it('completes the browser callback, authenticates the owner, denies ordinary roles and revokes the session', async () => {
      const c = config('browser');
      const pair = await generateKeyPair('RS256');
      const keys = createLocalJWKSet({
        keys: [{ ...(await exportJWK(pair.publicKey)), kid: 'local', alg: 'RS256' }],
      });
      const records = new Map<string, FounderGoogleState>();
      const saved = new Map<string, FounderGoogleState>();
      const store: FounderGoogleStateStore = {
        save: async (state, record) => {
          records.set(state, record);
          saved.set(state, record);
        },
        consume: async (state, hash) => {
          const record = records.get(state);
          if (!record || record.browserHash !== hash) return null;
          records.delete(state);
          return record;
        },
        close: async () => undefined,
      };
      const app = express();
      const server = app.listen(0, '127.0.0.1');
      await once(server, 'listening');
      const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const proofConfig = {
        clientId: 'local.apps.googleusercontent.com',
        clientSecret: 'local-only',
        founderEmail: c.founderEmail,
        redisUrl: 'redis://127.0.0.1:6379',
        redirectUri: origin + '/api/auth/google/callback',
        secure: false,
      };
      for (const [key, value] of Object.entries({
        FOUNDER_GOOGLE_PROOF_ENABLED: 'true',
        FOUNDER_GOOGLE_LOGIN_ENABLED: 'true',
        GOOGLE_OAUTH_CLIENT_ID: proofConfig.clientId,
        GOOGLE_OAUTH_CLIENT_SECRET: proofConfig.clientSecret,
        GOOGLE_OAUTH_REDIRECT_URI: proofConfig.redirectUri,
        FOUNDER_GOOGLE_EMAIL: c.founderEmail,
        OWNER_OPEN_ID: c.ownerPrincipal,
        APP_URL: origin,
        REDIS_URL: proofConfig.redisUrl,
      }))
        vi.stubEnv(key, value);
      const close = registerFounderGoogleIdentityRoutes(app, {
        config: proofConfig,
        loginConfig: { ...c, appOrigin: origin },
        proofFactory: (config, purpose) =>
          new FounderGoogleIdentityProof(config, store, {
            keys,
            purpose,
            fetcher: (async (_url, init) => {
              const verifier = new URLSearchParams(init?.body as URLSearchParams).get(
                'code_verifier',
              );
              const record = [...saved.values()].find(record => record.verifier === verifier)!;
              const now = Math.floor(Date.now() / 1000);
              const token = await new SignJWT({
                sub: prefix + 'browser',
                iss: 'https://accounts.google.com',
                aud: config.clientId,
                nonce: record.nonce,
                email: c.founderEmail,
                email_verified: true,
                iat: now,
                exp: now + 300,
              })
                .setProtectedHeader({ alg: 'RS256', kid: 'local' })
                .sign(pair.privateKey);
              return new Response(JSON.stringify({ id_token: token }), {
                headers: { 'content-type': 'application/json' },
              });
            }) as typeof fetch,
          }),
      });
      const ownerRouter = router({
        owner: superAdminProcedure.query(({ ctx }) => ({
          userId: ctx.user.id,
          role: ctx.user.role,
        })),
      });
      app.use(
        '/api/trpc',
        createExpressMiddleware({
          router: ownerRouter,
          createContext: async ({ req, res }) => {
            let user = null;
            try {
              user = await authService.authenticateRequest(req);
            } catch {
              /* normal unauthenticated context */
            }
            return { req, res, user } as any;
          },
        }),
      );
      try {
        expect(await (await fetch(origin + '/api/auth/google/status')).json()).toEqual({
          founderLoginAvailable: true,
          identityProofAvailable: true,
        });
        const start = await fetch(origin + '/api/auth/google/start', { redirect: 'manual' });
        const location = new URL(start.headers.get('location')!);
        const binding = start.headers.get('set-cookie')!.split(';')[0];
        const callback =
          origin +
          '/api/auth/google/callback?state=' +
          location.searchParams.get('state') +
          '&code=local-valid';
        const finish = await fetch(callback, { redirect: 'manual', headers: { cookie: binding } });
        expect(finish.status).toBe(303);
        expect(finish.headers.get('location')).toBe(origin + '/admin/overview');
        const session = finish.headers
          .getSetCookie()
          .find(cookie => cookie.startsWith(COOKIE_NAME + '='))!
          .split(';')[0];
        expect(finish.headers.get('cache-control')).toBe('no-store');
        expect(
          (await fetch(callback, { redirect: 'manual', headers: { cookie: binding } })).status,
        ).toBe(400);
        const ownerResponse = await fetch(origin + '/api/trpc/owner', {
          headers: { cookie: session },
        });
        expect(ownerResponse.status).toBe(200);
        const owner = (await ownedRows())[0];
        expect((await ownerResponse.json()).result.data.json).toEqual({
          userId: owner.id,
          role: 'super_admin',
        });
        await expect(new AuthService().forgotPassword(c.founderEmail)).resolves.toBe(false);
        for (const role of ['agent', 'agency_admin', 'property_developer'] as const) {
          const email = config(role).founderEmail;
          const [result] = await database
            .insert(users)
            .values({ email, role, loginMethod: 'email', emailVerified: 1 });
          const token = await authService.createSessionToken(
            Number(result.insertId),
            email,
            role,
            1,
          );
          expect(
            (
              await fetch(origin + '/api/trpc/owner', {
                headers: { cookie: COOKIE_NAME + '=' + token },
              })
            ).status,
          ).toBe(403);
        }
        await authService.revokeSessionFromCookieHeader(session);
        expect(
          (await fetch(origin + '/api/trpc/owner', { headers: { cookie: session } })).status,
        ).toBe(401);
        const next = await new FounderGoogleAccountService(c).authenticate(c.ownerPrincipal);
        expect(next.id).toBe(owner.id);
        expect(next.sessionVersion).toBe(2);
      } finally {
        await close();
        await new Promise<void>((resolve, reject) =>
          server.close(error => (error ? reject(error) : resolve())),
        );
      }
    });
  },
);
