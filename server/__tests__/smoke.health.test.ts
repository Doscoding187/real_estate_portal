import express from 'express';
import { once } from 'events';
import type { AddressInfo } from 'net';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAssessReadiness, mockGetCacheHealth } = vi.hoisted(() => ({
  mockAssessReadiness: vi.fn(),
  mockGetCacheHealth: vi.fn(),
}));

vi.mock('../_core/databaseAuthority/readiness', () => ({
  assessRuntimeDatabaseReadiness: mockAssessReadiness,
}));

vi.mock('../_core/cache/redis', () => ({
  getCacheHealth: mockGetCacheHealth,
}));

import { registerHealthEndpoint } from '../_core/health';

function databaseReadiness(applicationReady: boolean) {
  return {
    reportVersion: 1,
    checkedAt: '2026-08-03T00:00:00.000Z',
    targetFingerprintHash: 'a'.repeat(64),
    targetClass: 'disposable-test',
    applicationReady,
    layers: {
      processLiveness: { state: 'ready', code: 'process-alive', detail: 'alive' },
      targetConnectivity: {
        state: applicationReady ? 'ready' : 'not-ready',
        code: applicationReady ? 'target-connected' : 'database-unreachable',
        detail: applicationReady ? 'connected' : 'unreachable',
      },
    },
  };
}

describe('health and readiness endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.GITHUB_SHA = 'deadbeefcafebabe';
    process.env.AWS_REGION = 'eu-north-1';
    process.env.S3_BUCKET_NAME = 'demo-bucket';
    process.env.AWS_ACCESS_KEY_ID = 'demo-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'demo-secret';
    mockAssessReadiness.mockResolvedValue(databaseReadiness(true));
    mockGetCacheHealth.mockResolvedValue({
      status: 'healthy',
      metrics: { fallback_mode: true },
    });
  });

  it('keeps liveness green without evaluating database readiness', async () => {
    const app = express();
    registerHealthEndpoint(app);
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');

    try {
      const address = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload).toMatchObject({ ok: true, kind: 'liveness', env: 'test' });
      expect(payload.db).toBeUndefined();
      expect(mockAssessReadiness).not.toHaveBeenCalled();
      expect(response.headers.get('x-build-sha')).toBe('deadbeefcafebabe');
    } finally {
      server.close();
      await once(server, 'close');
    }
  });

  it('returns 503 when layered database readiness is red', async () => {
    mockAssessReadiness.mockResolvedValueOnce(databaseReadiness(false));
    const app = express();
    registerHealthEndpoint(app);
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');

    try {
      const address = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${address.port}/api/readiness`);
      const payload = await response.json();

      expect(response.status).toBe(503);
      expect(payload.ok).toBe(false);
      expect(payload.kind).toBe('readiness');
      expect(payload.db.applicationReady).toBe(false);
      expect(payload.db.layers.targetConnectivity.code).toBe('database-unreachable');
      expect(payload.cache.ok).toBe(true);
      expect(payload.authRateLimit).toEqual({ ok: true, mode: 'memory' });
      expect(response.headers.get('x-build-sha')).toBe('deadbeefcafebabe');
    } finally {
      server.close();
      await once(server, 'close');
    }
  });
});
