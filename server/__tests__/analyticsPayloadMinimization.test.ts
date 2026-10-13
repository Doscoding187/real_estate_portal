import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import analytics from '../routes/analytics';

const app = express();
app.use(express.json());
app.use('/analytics', analytics);
let server: Server;
let origin: string;
beforeAll(async () => {
  await new Promise<void>(resolve => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close(error => (error ? reject(error) : resolve())),
  );
});
const send = (body: unknown) =>
  fetch(`${origin}/analytics/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
afterEach(() => {
  vi.restoreAllMocks();
});

describe('MVP interaction payload minimization', () => {
  it('records only an allow-listed type despite supplied sensitive fields', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await send({
      eventType: 'cta_click',
      userId: 'private-user',
      sessionId: 'private-session',
      page: '/billing?token=secret',
      timestamp: 'untrusted',
      meta: { email: 'private@example.test', paymentProof: 'bank-payload', password: 'secret' },
    });
    expect(result.status).toBe(200);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('[Advertise interaction]', { type: 'cta_click' });
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/private|secret|bank-payload/);
  });
  it.each([{}, { eventType: 'private@example.test' }, { eventType: { value: 'cta_click' } }, null])(
    'rejects malformed or unrecognised events without logging their payload: %j',
    async body => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      const result = await send(body ?? {});
      expect(result.status).toBe(400);
      expect(log).not.toHaveBeenCalled();
    },
  );
});
