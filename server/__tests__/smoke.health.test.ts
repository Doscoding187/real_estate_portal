import express from 'express';
import { once } from 'events';
import type { AddressInfo } from 'net';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb, mockGetCacheHealth } = vi.hoisted(() => {
  return {
    mockGetDb: vi.fn(),
    mockGetCacheHealth: vi.fn(),
  };
});

vi.mock('../db-connection', () => ({
  getDb: mockGetDb,
}));

vi.mock('../_core/cache/redis', () => ({
  getCacheHealth: mockGetCacheHealth,
}));

import { registerHealthEndpoint } from '../_core/health';

describe('GET /api/health smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.GITHUB_SHA = 'deadbeefcafebabe';
    process.env.AWS_REGION = 'eu-north-1';
    process.env.S3_BUCKET_NAME = 'demo-bucket';
    process.env.AWS_ACCESS_KEY_ID = 'demo-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'demo-secret';

    mockGetDb.mockResolvedValue({});
    mockGetCacheHealth.mockResolvedValue({
      status: 'healthy',
      redis: {
        connected: false,
        response_time_ms: 0,
        memory_usage_mb: 0,
      },
      metrics: {
        hit_rate: 0,
        cache_size: 0,
        fallback_mode: true,
      },
    });
  });

  it('returns ok=true with expected health contract shape', async () => {
    const app = express();
    registerHealthEndpoint(app);

    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');

    try {
      const address = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.env).toBe('test');
      expect(payload.build.sha).toBe('deadbeefcafebabe');
      expect(response.headers.get('x-build-sha')).toBe('deadbeefcafebabe');
      expect(typeof payload.db.ok).toBe('boolean');
      expect(typeof payload.cache.ok).toBe('boolean');
      expect(['redis', 'memory']).toContain(payload.cache.mode);
      expect(typeof payload.s3.ok).toBe('boolean');
    } finally {
      server.close();
      await once(server, 'close');
    }
  });
});
