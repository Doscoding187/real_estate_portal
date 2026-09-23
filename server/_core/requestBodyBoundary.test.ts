import express from 'express';
import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { MAX_PROOF_BASE64_CHARS, MAX_PROOF_BYTES } from '../services/billingFoundationService';
import { registerRequestBodyBoundary, REQUEST_BODY_LIMIT } from './requestBodyBoundary';

describe('request body boundary', () => {
  let server: Server | null = null;

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) =>
      server!.close(error => (error ? reject(error) : resolve())),
    );
    server = null;
  });

  it('returns a bounded 413 response for an oversized request body', async () => {
    const app = express();
    registerRequestBodyBoundary(app);
    app.post('/body', (req, res) => res.json({ accepted: Boolean(req.body) }));
    server = createServer(app);
    await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server has no TCP address.');

    const oversizedBody = Buffer.alloc(14 * 1024 * 1024 + 1, 0x61);
    const response = await fetch(`http://127.0.0.1:${address.port}/body`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: oversizedBody,
    });

    expect(REQUEST_BODY_LIMIT).toBe('14mb');
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: 'Request body is too large.' });
  });

  it('keeps the maximum encoded 10 MiB payment proof below the request ceiling', () => {
    expect(MAX_PROOF_BYTES).toBe(10 * 1024 * 1024);
    expect(MAX_PROOF_BASE64_CHARS).toBe(Math.ceil(MAX_PROOF_BYTES / 3) * 4);
    expect(MAX_PROOF_BASE64_CHARS + 1_024).toBeLessThan(14_000_000);
  });
});
