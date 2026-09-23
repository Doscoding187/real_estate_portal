import express from 'express';
import { once } from 'events';
import type { AddressInfo } from 'net';
import { describe, expect, it } from 'vitest';
import { resolveTrustProxySetting } from '../runtimeBootstrap';

describe('Express trusted proxy IP semantics', () => {
  it('uses the rightmost untrusted XFF address and ignores X-Real-IP', async () => {
    const app = express();
    app.set('trust proxy', resolveTrustProxySetting({ TRUST_PROXY: '1' }));
    app.get('/ip', (req, res) => res.json({ ip: req.ip }));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/ip`;
      for (const forged of ['203.0.113.9', '203.0.113.10']) {
        const response = await fetch(url, {
          headers: {
            'X-Forwarded-For': `${forged}, 198.51.100.7`,
            'X-Real-IP': '192.0.2.55',
          },
        });
        expect((await response.json()).ip).toBe('198.51.100.7');
      }
    } finally {
      server.close();
      await once(server, 'close');
    }
  });
});
