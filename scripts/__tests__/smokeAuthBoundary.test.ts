import { once } from 'node:events';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveAuthBoundarySmokeOptions, runAuthBoundarySmoke } from '../smokeAuthBoundary';

const ORIGIN = 'https://www.propertylistifysa.co.za';

describe('auth-boundary release smoke', () => {
  const servers: ReturnType<typeof createServer>[] = [];

  afterEach(async () => {
    await Promise.all(
      servers.splice(0).map(
        server =>
          new Promise<void>((resolve, reject) => {
            server.close(error => (error ? reject(error) : resolve()));
          }),
      ),
    );
  });

  it('proves both CORS preflight and an invalid registration reach the auth route', async () => {
    const server = createServer((request, response) => {
      response.setHeader('access-control-allow-origin', ORIGIN);
      response.setHeader('access-control-allow-credentials', 'true');
      response.setHeader('x-request-id', 'auth-boundary-release-smoke');

      if (request.method === 'OPTIONS') {
        response.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
        response.statusCode = 204;
        response.end();
        return;
      }

      response.statusCode = 400;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ error: 'Email and password are required' }));
    });
    servers.push(server);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address() as AddressInfo;

    await expect(
      runAuthBoundarySmoke({
        apiBaseUrl: `http://127.0.0.1:${address.port}`,
        origin: ORIGIN,
        timeoutMs: 1_000,
      }),
    ).resolves.toBeUndefined();
  });

  it('requires explicit usable endpoints and falls back only to configured app values', () => {
    expect(() => resolveAuthBoundarySmokeOptions({})).toThrow('AUTH_BOUNDARY_SMOKE_API_URL');
    expect(
      resolveAuthBoundarySmokeOptions({
        VITE_API_URL: 'https://api.propertylistifysa.co.za/api',
        APP_URL: 'https://www.propertylistifysa.co.za/login',
        AUTH_BOUNDARY_SMOKE_TIMEOUT_MS: '7000',
      }),
    ).toEqual({
      apiBaseUrl: 'https://api.propertylistifysa.co.za',
      origin: ORIGIN,
      timeoutMs: 7_000,
    });
  });
});
