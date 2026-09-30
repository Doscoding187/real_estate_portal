import express from 'express';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockForgotPassword, mockResendVerificationEmail } = vi.hoisted(() => ({
  mockForgotPassword: vi.fn(),
  mockResendVerificationEmail: vi.fn(),
}));

vi.mock('../_core/auth', () => ({
  authService: {
    forgotPassword: mockForgotPassword,
    resendVerificationEmail: mockResendVerificationEmail,
  },
}));

vi.mock('../_core/env', () => ({
  ENV: { appUrl: 'https://app.example.test' },
}));

vi.mock('../services/distributionIdentityProjection', () => ({
  getActiveDistributionIdentityFlags: vi.fn(),
}));

import { registerAuthRoutes } from '../_core/authRoutes';

async function withAuthServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  const app = express();
  app.use(express.json());
  registerAuthRoutes(app);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  try {
    const address = server.address() as AddressInfo;
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  }
}

async function post(baseUrl: string, path: string, body: Record<string, string>) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('authentication email delivery boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_ENV', 'production');
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('RESEND_FROM_EMAIL', '');
    vi.stubEnv('EMAIL_FROM', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('fails uniformly before account lookup when deployed transactional email is unavailable', async () => {
    await withAuthServer(async baseUrl => {
      const [forgotResponse, resendResponse] = await Promise.all([
        post(baseUrl, '/api/auth/forgot-password', { email: 'known-or-unknown@example.test' }),
        post(baseUrl, '/api/auth/resend-verification', { email: 'known-or-unknown@example.test' }),
      ]);

      expect(forgotResponse.status).toBe(503);
      expect(await forgotResponse.json()).toEqual({
        error: 'Password reset email is unavailable right now. Please try again later.',
      });
      expect(resendResponse.status).toBe(503);
      expect(await resendResponse.json()).toEqual({
        error: 'Verification email is unavailable right now. Please try again later.',
      });
    });

    expect(mockForgotPassword).not.toHaveBeenCalled();
    expect(mockResendVerificationEmail).not.toHaveBeenCalled();
  });

  it('does not expose provider errors from one account as an account-existence signal', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_not_a_real_key');
    vi.stubEnv('RESEND_FROM_EMAIL', 'Property Listify <no-reply@propertylistify.example.test>');
    mockForgotPassword.mockRejectedValue(new Error('provider timeout'));
    mockResendVerificationEmail.mockRejectedValue(new Error('provider timeout'));

    await withAuthServer(async baseUrl => {
      const [forgotResponse, resendResponse] = await Promise.all([
        post(baseUrl, '/api/auth/forgot-password', { email: 'known@example.test' }),
        post(baseUrl, '/api/auth/resend-verification', { email: 'known@example.test' }),
      ]);

      expect(forgotResponse.status).toBe(200);
      expect(await forgotResponse.json()).toEqual({
        success: true,
        message:
          'If an account with that email exists, check your inbox for password reset instructions. If no email arrives, try again later.',
      });
      expect(resendResponse.status).toBe(200);
      expect(await resendResponse.json()).toEqual({
        success: true,
        message:
          'If this account exists and is unverified, check your inbox for verification instructions. If no email arrives, try again later.',
      });
    });

    expect(mockForgotPassword).toHaveBeenCalledWith('known@example.test');
    expect(mockResendVerificationEmail).toHaveBeenCalledWith('known@example.test');
  });
});
