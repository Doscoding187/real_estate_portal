import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createServer } from 'node:http';
import type { Socket } from 'node:net';
import dotenv from 'dotenv';
import express from 'express';
import mysql from 'mysql2/promise';
import path from 'node:path';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import superjson from 'superjson';
import { COOKIE_NAME } from '../shared/const';
import { authService } from '../server/_core/auth';
import { createContext } from '../server/_core/context';
import { registerAuthRoutes } from '../server/_core/authRoutes';
import { getDb } from '../server/db';
import { appRouter, type AppRouter } from '../server/routers';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false, quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env.playwright.local'), override: true, quiet: true });

const DATABASE = 'listify_prospect_journey_e2e';
const buyerEmail = 'buyer@listify.local';
const secondEmail = 'referrer@listify.local';

function databaseUrl() {
  const value = process.env.LISTIFY_E2E_DATABASE_URL || process.env.DATABASE_URL;
  assert.ok(value, 'Prospect Journey auth verification requires a database URL.');
  const url = new URL(value);
  assert.equal(url.pathname, `/${DATABASE}`, 'Auth verification must use only the disposable E2E database.');
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(url.hostname), 'Auth verification requires local MySQL.');
  return url.toString();
}

function testPassword() {
  const value = process.env.LOCAL_DEMO_AGENCY_PASSWORD;
  assert.ok(value, 'LOCAL_DEMO_AGENCY_PASSWORD is required.');
  return value;
}

function unwrapTrpcResult<T>(value: T): T {
  // createTRPCProxyClient normally deserializes SuperJSON before resolving.
  // Keep this verifier compatible with the repository's direct HTTP adapter,
  // which can surface the SuperJSON envelope in this isolated server setup.
  if (value && typeof value === 'object' && 'json' in (value as Record<string, unknown>)) {
    return (value as Record<string, T>).json;
  }
  return value;
}

async function login(baseUrl: string, email: string) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: testPassword(), rememberMe: false }),
  });
  const payload = await response.json();
  const setCookie = response.headers.get('set-cookie') || '';
  assert.equal(response.status, 200, `Login must succeed for ${email}.`);
  assert.equal(payload.success, true);
  assert.match(setCookie, new RegExp(`^${COOKIE_NAME}=`));
  assert.match(setCookie, /Path=\//i);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
  assert.doesNotMatch(setCookie, /Secure/i, 'Local HTTP cookies must not require Secure.');
  return setCookie.split(';')[0];
}

async function main() {
  const connection = await mysql.createConnection(databaseUrl());
  const app = express();
  const server = createServer(app);
  const sockets = new Set<Socket>();
  let drizzleDb: any = null;

  server.on('connection', socket => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  });

  try {
    const [[buyer]] = await connection.query<mysql.RowDataPacket[]>(
      'SELECT id, passwordHash FROM users WHERE email = ?',
      [buyerEmail],
    );
    assert.ok(buyer?.id && buyer?.passwordHash, 'Seeded Prospect A must exist with a password hash.');
    assert.equal(await authService.verifyPassword(testPassword(), buyer.passwordHash), true);

    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).requestId = 'prospect-journey-auth-verifier';
      next();
    });
    registerAuthRoutes(app);
    app.use('/api/trpc', createExpressMiddleware({ router: appRouter, createContext }));

    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const buyerCookie = await login(baseUrl, buyerEmail);
    const prospectA = createTRPCProxyClient<AppRouter>({
      transformer: superjson,
      links: [httpBatchLink({ url: `${baseUrl}/api/trpc`, headers: () => ({ cookie: buyerCookie }) })],
    });
    const me = unwrapTrpcResult(await prospectA.auth.me.query());
    assert.equal(me.email, buyerEmail, 'auth.me must return the logged-in prospect.');
    const prospectASummary = unwrapTrpcResult(await prospectA.prospectJourney.summary.query());
    const prospectAEnquiries = unwrapTrpcResult(await prospectA.prospectJourney.enquiries.query());
    assert.ok(prospectASummary.activeEnquiries >= 1, 'The authenticated prospect must receive their journey data.');
    assert.ok(prospectAEnquiries.every(item => !('notes' in item) && !('email' in item) && !('phone' in item)));

    const secondCookie = await login(baseUrl, secondEmail);
    const prospectB = createTRPCProxyClient<AppRouter>({
      transformer: superjson,
      links: [httpBatchLink({ url: `${baseUrl}/api/trpc`, headers: () => ({ cookie: secondCookie }) })],
    });
    const prospectBEnquiries = unwrapTrpcResult(await prospectB.prospectJourney.enquiries.query());
    assert.ok(!prospectBEnquiries.some(item => item.propertyTitle === '[E2E Security] Claim scope property'));

    const anonymous = createTRPCProxyClient<AppRouter>({
      transformer: superjson,
      links: [httpBatchLink({ url: `${baseUrl}/api/trpc` })],
    });
    await assert.rejects(() => anonymous.prospectJourney.summary.query());

    console.log('[Prospect Journey auth] login, cookie, auth.me, private journey access, and isolation checks passed.');
  } finally {
    const socketsBeforeClose = sockets.size;
    console.log(`[Prospect Journey auth] HTTP shutdown start (trackedSockets=${socketsBeforeClose}).`);
    // The verifier's fetch/tRPC client can keep local HTTP connections alive.
    // These calls operate only on this disposable in-process test server.
    server.closeIdleConnections?.();
    const closed = new Promise<void>((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
    const grace = new Promise<'timeout'>(resolve => setTimeout(() => resolve('timeout'), 1_000));
    if ((await Promise.race([closed.then(() => 'closed' as const), grace])) === 'timeout') {
      for (const socket of sockets) socket.destroy();
      server.closeAllConnections?.();
      await closed;
    }
    // `server.close` can resolve before every socket's event listener runs.
    // Destroy only the sockets accepted by this test server, then await their
    // close notifications before asserting registry cleanliness.
    const remainingSockets = [...sockets];
    const socketClosed = Promise.all(
      remainingSockets.map(socket =>
        socket.destroyed ? Promise.resolve() : once(socket, 'close').then(() => undefined),
      ),
    );
    for (const socket of remainingSockets) {
      socket.destroy();
      // Node can mark a keep-alive socket destroyed before its queued `close`
      // listener runs. It no longer owns a handle in that state, so remove it
      // from this test-only registry immediately as well.
      if (socket.destroyed) sockets.delete(socket);
    }
    const socketGrace = new Promise<'timeout'>(resolve => setTimeout(() => resolve('timeout'), 1_000));
    if ((await Promise.race([socketClosed.then(() => 'closed' as const), socketGrace])) === 'timeout') {
      throw new Error(`Auth verifier retained ${sockets.size} tracked HTTP socket(s) after shutdown.`);
    }
    for (const socket of [...sockets]) {
      if (socket.destroyed) sockets.delete(socket);
    }
    assert.equal(sockets.size, 0, 'Auth verifier must close every tracked HTTP socket.');
    console.log(`[Prospect Journey auth] HTTP server closed (trackedSockets=${sockets.size}).`);
    await connection.end();
    drizzleDb = await getDb();
    const pool = drizzleDb?.$client;
    if (pool && typeof pool.end === 'function') await pool.end();
  }
}

main().then(
  () => {
    // App-router imports can register unrelated development handles. All
    // verifier-owned resources have been explicitly closed above, so end this
    // disposable child deterministically rather than letting such handles hang
    // the harness indefinitely.
    process.exit(0);
  },
  error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
