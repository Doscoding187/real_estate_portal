import express from 'express';
import { once } from 'events';
import type { AddressInfo } from 'net';
import { beforeEach, describe, expect, it } from 'vitest';

import { registerVersionEndpoint } from '../_core/health';

describe('GET /api/version smoke', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.GITHUB_SHA = 'abc123def456';
    process.env.BUILD_TIME = '2026-03-03T12:00:00Z';
  });

  it('returns gitSha, buildTime, and env for deploy parity checks', async () => {
    const app = express();
    registerVersionEndpoint(app);

    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');

    try {
      const address = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${address.port}/api/version`);
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload).toEqual({
        gitSha: 'abc123def456',
        buildTime: '2026-03-03T12:00:00Z',
        env: 'test',
      });
    } finally {
      server.close();
      await once(server, 'close');
    }
  });
});
