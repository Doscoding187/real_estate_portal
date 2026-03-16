import express from 'express';
import { once } from 'events';
import type { AddressInfo } from 'net';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockLogin, mockVerifyEmail, mockCreateSessionToken } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockVerifyEmail: vi.fn(),
  mockCreateSessionToken: vi.fn(),
}));

vi.mock('../_core/auth', () => ({
  authService: {
    register: vi.fn(),
    login: mockLogin,
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    verifyEmail: mockVerifyEmail,
    resendVerificationEmail: vi.fn(),
    createSessionToken: mockCreateSessionToken,
  },
}));

vi.mock('../_core/env', () => ({
  ENV: {
    appUrl: 'http://localhost:3009',
  },
}));

import { registerAuthRoutes } from '../_core/authRoutes';

describe('auth onboarding flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSessionToken.mockResolvedValue('session-token-for-test');
  });

  it('redirects verified agents to onboarding profile flow', async () => {
    mockVerifyEmail.mockResolvedValue({
      id: 123,
      role: 'agent',
      email: 'agent@example.com',
      name: 'Agent Example',
    });

    const app = express();
    app.use(express.json());
    registerAuthRoutes(app);

    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');

    try {
      const address = server.address() as AddressInfo;
      const res = await fetch(
        `http://127.0.0.1:${address.port}/api/auth/verify-email?token=test-token`,
        {
          redirect: 'manual',
        },
      );

      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe(
        'http://localhost:3009/onboarding/agent-profile?verified=true',
      );
      const setCookieHeader = res.headers.get('set-cookie');
      expect(setCookieHeader).toBeTruthy();
      expect(setCookieHeader).toContain('app_session_id=session-token-for-test');
    } finally {
      server.close();
      await once(server, 'close');
    }
  });

  it('keeps login blocked when email is not verified', async () => {
    mockLogin.mockRejectedValue(new Error('Please verify your email address before logging in.'));

    const app = express();
    app.use(express.json());
    registerAuthRoutes(app);

    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');

    try {
      const address = server.address() as AddressInfo;
      const res = await fetch(`http://127.0.0.1:${address.port}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'agent@example.com', password: 'Password123!' }),
      });

      const body = await res.json();
      expect(res.status).toBe(401);
      expect(String(body.error || '')).toContain('verify your email');
    } finally {
      server.close();
      await once(server, 'close');
    }
  });
});
