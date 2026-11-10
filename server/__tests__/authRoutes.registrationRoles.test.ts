import express from 'express';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ register: vi.fn() }));
vi.mock('../_core/auth', () => ({ authService: { register: mocks.register } }));
import { REGISTRATION_ALLOWED_ROLES, registerAuthRoutes } from '../_core/authRoutes';

async function register(body: object) {
  const app = express();
  app.use(express.json());
  registerAuthRoutes(app);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await fetch(
      `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/auth/register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

const base = { email: 'person@example.invalid', password: 'Pass123!', name: 'Person' };

describe('registration role gating at launch', () => {
  beforeEach(() => {
    mocks.register.mockReset();
    mocks.register.mockResolvedValue({ userId: 42, verificationEmailSent: true });
  });

  it('allows only visitor and agent', () => {
    expect([...REGISTRATION_ALLOWED_ROLES]).toEqual(['visitor', 'agent']);
  });

  it('accepts visitor and agent', async () => {
    const visitor = await register({ ...base, role: 'visitor' });
    expect(visitor.status).toBe(201);
    expect(mocks.register.mock.calls[0][3]).toBe('visitor');

    const agent = await register({
      ...base,
      role: 'agent',
      agentProfile: { displayName: 'Agent A', phoneNumber: '0820000000' },
    });
    expect(agent.status).toBe(201);
    expect(mocks.register.mock.calls[1][3]).toBe('agent');
  });

  it.each(['agency_admin', 'property_developer', 'service_provider'])(
    'rejects %s with 400 and does not register',
    async role => {
      const result = await register({ ...base, role });
      expect(result.status).toBe(400);
      expect(result.body.error).toBe('This account type is not available yet.');
      expect(mocks.register).not.toHaveBeenCalled();
    },
  );

  it('turns an unknown role string into a visitor', async () => {
    const result = await register({ ...base, role: 'super_admin' });
    expect(result.status).toBe(201);
    expect(mocks.register.mock.calls[0][3]).toBe('visitor');
  });
});
