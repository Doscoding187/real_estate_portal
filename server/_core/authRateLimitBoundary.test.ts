import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import cors from 'cors';
import express from 'express';
import rateLimit, { type Store } from 'express-rate-limit';
import { describe, expect, it, vi } from 'vitest';
import {
  AuthRateLimitStoreUnavailableError,
  AUTH_RATE_LIMIT_STORE_UNAVAILABLE_CODE,
} from './authRateLimitStore';
import { handleAuthRateLimitStoreUnavailable } from './authRateLimitBoundary';

const APP_ORIGIN = 'https://www.propertylistifysa.co.za';

describe('auth rate-limit availability boundary', () => {
  it('keeps CORS headers and returns a bounded, retryable 503 when Redis is unavailable', async () => {
    const route = vi.fn();
    const unavailableStore: Store = {
      localKeys: false,
      prefix: 'test:auth-rate-limit:',
      increment: async () => {
        throw new AuthRateLimitStoreUnavailableError(5_000);
      },
      decrement: async () => undefined,
      resetKey: async () => undefined,
    };
    const app = express();
    app.use((request, response, next) => {
      (request as { requestId?: string }).requestId = 'auth-boundary-test-request';
      response.setHeader('x-request-id', 'auth-boundary-test-request');
      next();
    });
    app.use(
      cors({
        origin: (origin, callback) => callback(null, origin === APP_ORIGIN),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'x-request-id'],
      }),
    );
    app.use(
      '/api/auth/register',
      rateLimit({
        windowMs: 15 * 60 * 1_000,
        limit: 5,
        standardHeaders: true,
        legacyHeaders: false,
        store: unavailableStore,
      }),
      handleAuthRateLimitStoreUnavailable,
    );
    app.use(express.json());
    app.post('/api/auth/register', (_request, response) => {
      route();
      response.status(201).json({ success: true });
    });

    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');

    try {
      const address = server.address() as AddressInfo;
      const url = `http://127.0.0.1:${address.port}/api/auth/register`;
      const preflight = await fetch(url, {
        method: 'OPTIONS',
        headers: {
          Origin: APP_ORIGIN,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type',
        },
      });
      expect(preflight.status).toBe(204);
      expect(preflight.headers.get('access-control-allow-origin')).toBe(APP_ORIGIN);

      const response = await fetch(url, {
        method: 'POST',
        headers: { Origin: APP_ORIGIN, 'content-type': 'application/json' },
        body: '{}',
      });
      const payload = await response.json();

      expect(response.status).toBe(503);
      expect(response.headers.get('access-control-allow-origin')).toBe(APP_ORIGIN);
      expect(response.headers.get('access-control-allow-credentials')).toBe('true');
      expect(response.headers.get('retry-after')).toBe('5');
      expect(response.headers.get('x-request-id')).toBe('auth-boundary-test-request');
      expect(payload).toEqual({
        error: 'Authentication is temporarily unavailable. Please try again shortly.',
        code: AUTH_RATE_LIMIT_STORE_UNAVAILABLE_CODE,
        requestId: 'auth-boundary-test-request',
      });
      expect(route).not.toHaveBeenCalled();
    } finally {
      server.close();
      await once(server, 'close');
    }
  });
});
