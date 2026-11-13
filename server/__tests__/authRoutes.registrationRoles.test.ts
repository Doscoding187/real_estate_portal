import express from 'express';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  verifyEmail: vi.fn(),
  createSessionToken: vi.fn(),
}));
vi.mock('../_core/auth', () => ({
  authService: {
    register: mocks.register,
    verifyEmail: mocks.verifyEmail,
    createSessionToken: mocks.createSessionToken,
  },
}));
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

async function verify(token: string) {
  const app = express();
  registerAuthRoutes(app);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await fetch(
      `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/auth/verify-email?token=${encodeURIComponent(token)}`,
      { redirect: 'manual' },
    );
    return response;
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

const base = { email: 'person@example.invalid', password: 'Pass123!', name: 'Person' };

describe('registration role gating at launch', () => {
  beforeEach(() => {
    mocks.register.mockReset();
    mocks.verifyEmail.mockReset();
    mocks.createSessionToken.mockReset();
    mocks.register.mockResolvedValue({ userId: 42, verificationEmailSent: true });
    mocks.verifyEmail.mockResolvedValue({
      id: 42,
      email: 'provider@example.invalid',
      name: 'Provider',
      role: 'service_provider',
      sessionVersion: 1,
    });
    mocks.createSessionToken.mockResolvedValue('verified-provider-session');
  });

  it('allows visitor, agent and service provider', () => {
    expect([...REGISTRATION_ALLOWED_ROLES]).toEqual(['visitor', 'agent', 'service_provider']);
  });

  it('accepts visitor, agent and service provider', async () => {
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

    const serviceProvider = await register({ ...base, role: 'service_provider' });
    expect(serviceProvider.status).toBe(201);
    expect(serviceProvider.body.message).toContain(
      'stay private until it is reviewed and approved',
    );
    expect(mocks.register.mock.calls[2][3]).toBe('service_provider');
  });

  it.each(['agency_admin', 'property_developer'])(
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

  it('sends a verified provider into provider onboarding without changing publication state', async () => {
    const response = await verify('valid-provider-token');

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toMatch(/\/service\/profile\?verified=true$/);
    expect(mocks.verifyEmail).toHaveBeenCalledWith('valid-provider-token');
    expect(mocks.createSessionToken).toHaveBeenCalledWith(
      42,
      'provider@example.invalid',
      'Provider',
      1,
      expect.objectContaining({ expiresInMs: expect.any(Number) }),
    );
  });
});
