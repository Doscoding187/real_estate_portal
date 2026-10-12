import express from 'express';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ register: vi.fn(), disclosure: vi.fn() }));
vi.mock('../_core/auth', () => ({ authService: { register: mocks.register } }));
vi.mock('../services/registrationLegalAcceptanceService', async original => {
  const actual = await original<typeof import('../services/registrationLegalAcceptanceService')>();
  return { ...actual, getCurrentRegistrationLegalRelease: mocks.disclosure };
});
import { RegistrationLegalError } from '../services/registrationLegalAcceptanceService';
import { registerAuthRoutes } from '../_core/authRoutes';

async function request(path: string, body?: object) {
  const app = express();
  app.use(express.json());
  registerAuthRoutes(app);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await fetch(
      `http://127.0.0.1:${(server.address() as AddressInfo).port}${path}`,
      body
        ? {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        : undefined,
    );
    return {
      status: response.status,
      body: await response.json(),
      cache: response.headers.get('cache-control'),
    };
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}
describe('registration legal HTTP boundary', () => {
  beforeEach(() => {
    mocks.register.mockResolvedValue({ userId: 42, verificationEmailSent: true });
  });
  it('forwards the explicit nested choice without accepting client evidence fields as authority', async () => {
    const choice = { bundleId: 'synthetic-1', termsAccepted: true };
    const result = await request('/api/auth/register', {
      email: 'person@example.invalid',
      password: 'Pass123!',
      name: 'Person',
      role: 'agency_admin',
      legalAcceptance: choice,
      acceptedAt: 'forged',
      userId: 1,
    });
    expect(result.status).toBe(201);
    expect(mocks.register).toHaveBeenCalledWith(
      'person@example.invalid',
      'Pass123!',
      'Person',
      'agency_admin',
      undefined,
      choice,
    );
  });
  it.each([
    ['TERMS_ACCEPTANCE_REQUIRED', 400],
    ['LEGAL_VERSION_STALE', 409],
    ['LEGAL_RELEASE_UNAVAILABLE', 503],
  ] as const)('returns %s as %i', async (code, status) => {
    mocks.register.mockRejectedValue(new RegistrationLegalError(code));
    const result = await request('/api/auth/register', {
      email: 'person@example.invalid',
      password: 'Pass123!',
    });
    expect(result.status).toBe(status);
    expect(result.body).toMatchObject({ code });
    expect(result.body.success).toBeUndefined();
  });
  it('does not cache the current disclosure and fails closed when no approved bundle exists', async () => {
    mocks.disclosure.mockRejectedValue(new RegistrationLegalError('LEGAL_RELEASE_UNAVAILABLE'));
    const result = await request('/api/auth/registration-legal');
    expect(result.status).toBe(503);
    expect(result.cache).toBe('no-store');
  });
  it('loads an archived approved bundle by identity without changing registration policy', async () => {
    mocks.disclosure.mockResolvedValue({ bundleId: 'synthetic-old' });
    const result = await request('/api/legal/releases/synthetic-old');
    expect(result.status).toBe(200);
    expect(result.cache).toBe('no-store');
    expect(mocks.disclosure).toHaveBeenCalledWith('synthetic-old');
    expect(mocks.register).not.toHaveBeenCalled();
  });
  it('reports storage failure separately and logs no raw SQL or copy payload', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.disclosure.mockRejectedValue(
      Object.assign(new Error('private SQL payload'), { code: 'ER_NO_SUCH_TABLE' }),
    );
    const result = await request('/api/auth/registration-legal');
    expect(result.status).toBe(503);
    expect(result.body.code).toBe('LEGAL_RELEASE_STORAGE_UNAVAILABLE');
    expect(JSON.stringify(result.body)).not.toContain('private SQL payload');
    expect(log).toHaveBeenCalledWith('[Legal] Approved-copy lookup failed', {
      requestId: 'unknown',
      code: 'ER_NO_SUCH_TABLE',
      name: 'Error',
    });
  });
});
