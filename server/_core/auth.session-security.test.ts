import { createHash } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { SignJWT } from 'jose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COOKIE_NAME } from '@shared/const';

const {
  mockGetAgentByUserId,
  mockGetUserByEmail,
  mockGetUserByEmailVerificationTokenHash,
  mockGetUserById,
  mockSendVerificationEmail,
  mockSendPasswordResetEmail,
  mockUpdateUserEmailVerificationTokenHash,
  mockUpdateUserLastSignIn,
  mockVerifyUserEmail,
  mockGetUserByPasswordResetToken,
  mockRevokeUserSessions,
  mockUpdateUserPassword,
  mockUpdateUserPasswordResetToken,
} = vi.hoisted(() => ({
  mockGetAgentByUserId: vi.fn(),
  mockGetUserByEmail: vi.fn(),
  mockGetUserByEmailVerificationTokenHash: vi.fn(),
  mockGetUserById: vi.fn(),
  mockSendVerificationEmail: vi.fn(),
  mockSendPasswordResetEmail: vi.fn(),
  mockUpdateUserEmailVerificationTokenHash: vi.fn(),
  mockUpdateUserLastSignIn: vi.fn(),
  mockVerifyUserEmail: vi.fn(),
  mockGetUserByPasswordResetToken: vi.fn(),
  mockRevokeUserSessions: vi.fn(),
  mockUpdateUserPassword: vi.fn(),
  mockUpdateUserPasswordResetToken: vi.fn(),
}));

vi.mock('../db', () => ({
  getAgentByUserId: mockGetAgentByUserId,
  getUserByEmail: mockGetUserByEmail,
  getUserByEmailVerificationTokenHash: mockGetUserByEmailVerificationTokenHash,
  getUserById: mockGetUserById,
  updateUserEmailVerificationTokenHash: mockUpdateUserEmailVerificationTokenHash,
  updateUserLastSignIn: mockUpdateUserLastSignIn,
  verifyUserEmail: mockVerifyUserEmail,
  getUserByPasswordResetToken: mockGetUserByPasswordResetToken,
  updateUserPassword: mockUpdateUserPassword,
  updateUserPasswordResetToken: mockUpdateUserPasswordResetToken,
  revokeUserSessions: mockRevokeUserSessions,
}));

vi.mock('./env', () => ({
  ENV: {
    appUrl: 'https://www.propertylistifysa.co.za',
    cookieSecret: 'test-session-secret-that-is-long-enough-for-jwt-signing',
    mediaStorageAdapter: 'local',
  },
}));

vi.mock('./email', () => ({
  sendVerificationEmail: mockSendVerificationEmail,
  sendPasswordResetEmail: mockSendPasswordResetEmail,
}));
vi.mock('./emailService', () => ({ EmailService: { sendEmail: vi.fn() } }));

import { AuthService, authService } from './auth';
import { registerAuthRoutes } from './authRoutes';
import { FounderGoogleAccountService } from '../services/founderGoogleAccountService';
import { appRouter } from '../routers';
import { createContext } from './context';

const sessionSecret = new TextEncoder().encode(
  'test-session-secret-that-is-long-enough-for-jwt-signing',
);

function user(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    email: 'agent@example.com',
    name: 'Agent Example',
    passwordHash: 'hash',
    emailVerified: 1,
    role: 'visitor',
    sessionVersion: 1,
    ...overrides,
  } as any;
}

function captureAuthRoutes() {
  const routes = new Map<string, (req: any, res: any) => unknown>();
  const app = {
    post(path: string, handler: (req: any, res: any) => unknown) {
      routes.set(path, handler);
      return this;
    },
    get(path: string, handler: (req: any, res: any) => unknown) {
      routes.set(path, handler);
      return this;
    },
  };
  registerAuthRoutes(app as any);
  return routes;
}

function createRouteResponse() {
  const response: any = {};
  response.clearCookie = vi.fn(() => response);
  response.json = vi.fn(() => response);
  response.status = vi.fn(() => response);
  return response;
}

describe('session security', () => {
  it('accepts an unexpired canonical UTC reset timestamp independently of host timezone', async () => {
    const service = new AuthService();
    vi.spyOn(service, 'hashPassword').mockResolvedValueOnce('new-hash');
    mockGetUserByPasswordResetToken.mockResolvedValueOnce(
      user({
        passwordResetTokenExpiresAt: new Date(Date.now() + 3600000)
          .toISOString()
          .slice(0, 19)
          .replace('T', ' '),
      }),
    );
    await expect(service.resetPassword('reset-token', 'NewPassword!123')).resolves.toBeUndefined();
    expect(mockUpdateUserPassword).toHaveBeenCalledWith(42, 'new-hash');
  });

  it.each(['invalid', '2000-01-01 00:00:00'])(
    'rejects invalid or expired reset timestamp %s before changing credentials',
    async expiry => {
      mockGetUserByPasswordResetToken.mockResolvedValueOnce(
        user({ passwordResetTokenExpiresAt: expiry }),
      );
      await expect(
        new AuthService().resetPassword('reset-token', 'NewPassword!123'),
      ).rejects.toThrow('Invalid or expired');
      expect(mockUpdateUserPassword).not.toHaveBeenCalled();
    },
  );
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAgentByUserId.mockResolvedValue(null);
    mockSendVerificationEmail.mockResolvedValue({ success: true });
    mockSendPasswordResetEmail.mockResolvedValue({ success: true });
    mockRevokeUserSessions.mockResolvedValue(undefined);
  });

  it('revokes the presented session version on logout, invalidating every token for that user', async () => {
    let databaseUser = user();
    mockGetUserById.mockImplementation(async () => databaseUser);
    mockRevokeUserSessions.mockImplementation(async (_userId: number, expectedVersion: number) => {
      if (databaseUser.sessionVersion === expectedVersion) {
        databaseUser = { ...databaseUser, sessionVersion: expectedVersion + 1 };
      }
    });

    const firstToken = await authService.createSessionToken(42, 'agent@example.com', 'Agent Example', 1);
    const rememberedToken = await authService.createSessionToken(42, 'agent@example.com', 'Agent Example', 1);
    const routes = captureAuthRoutes();
    const response = createRouteResponse();

    await routes.get('/api/auth/logout')!({
      headers: { cookie: `${COOKIE_NAME}=${firstToken}` },
    } as any, response as any);

    expect(mockRevokeUserSessions).toHaveBeenCalledWith(42, 1);
    expect(response.clearCookie).toHaveBeenCalledWith(COOKIE_NAME, expect.any(Object));
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      message: 'Logged out successfully.',
    });
    for (const token of [firstToken, rememberedToken]) {
      await expect(
        authService.authenticateRequest({ headers: { cookie: `${COOKIE_NAME}=${token}` } } as any),
      ).rejects.toMatchObject({ statusCode: 403 });
    }
  });

  it.each([undefined, 'not-a-signed-session'])(
    'safely clears logout cookies without database revocation for %s',
    async cookieValue => {
      const routes = captureAuthRoutes();
      const response = createRouteResponse();
      await routes.get('/api/auth/logout')!({
        headers: { cookie: cookieValue ? `${COOKIE_NAME}=${cookieValue}` : undefined },
      } as any, response as any);

      expect(response.clearCookie).toHaveBeenCalledWith(COOKIE_NAME, expect.any(Object));
      expect(response.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully.',
      });
      expect(mockRevokeUserSessions).not.toHaveBeenCalled();
    },
  );

  it('does not report secure logout success if session revocation persistence fails', async () => {
    mockRevokeUserSessions.mockRejectedValueOnce(new Error('database details must not escape'));
    const token = await authService.createSessionToken(42, 'agent@example.com', 'Agent Example', 1);
    const routes = captureAuthRoutes();
    const response = createRouteResponse();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await routes.get('/api/auth/logout')!({
      headers: { cookie: `${COOKIE_NAME}=${token}` },
      requestId: 'logout-test-request',
    } as any, response as any);

    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('Secure logout'),
      requestId: 'logout-test-request',
    }));
    expect(response.clearCookie).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith('[Auth] Logout session revocation failed', expect.any(Object));
  });

  it('requires a session version in every signed session payload', async () => {
    const service = new AuthService();
    const token = await service.createSessionToken(42, 'agent@example.com', 'Agent Example', 3);

    await expect(service.verifySession(token)).resolves.toMatchObject({
      userId: 42,
      email: 'agent@example.com',
      sessionVersion: 3,
    });

    const legacyToken = await new SignJWT({ userId: 42, email: 'agent@example.com' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(sessionSecret);

    await expect(service.verifySession(legacyToken)).resolves.toBeNull();
  });

  it('rejects a session when its database version has been revoked', async () => {
    const service = new AuthService();
    const token = await service.createSessionToken(42, 'agent@example.com', 'Agent Example', 1);
    mockGetUserById.mockResolvedValue(user({ sessionVersion: 2 }));

    await expect(
      service.authenticateRequest({ headers: { cookie: `${COOKIE_NAME}=${token}` } } as any),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(mockUpdateUserLastSignIn).not.toHaveBeenCalled();
  });

  it('rechecks an agent suspension even when a valid session was issued earlier', async () => {
    const service = new AuthService();
    const token = await service.createSessionToken(42, 'agent@example.com', 'Agent Example', 1);
    mockGetUserById.mockResolvedValue(user({ role: 'agent' }));
    mockGetAgentByUserId.mockResolvedValue({ status: 'suspended' });

    await expect(
      service.authenticateRequest({ headers: { cookie: `${COOKIE_NAME}=${token}` } } as any),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(mockUpdateUserLastSignIn).not.toHaveBeenCalled();
  });

  it('stores a digest and expiry rather than a raw resend-verification token', async () => {
    const service = new AuthService();
    mockGetUserByEmail.mockResolvedValue(user({ emailVerified: 0 }));

    await expect(service.resendVerificationEmail('agent@example.com')).resolves.toEqual({
      sent: true,
    });

    const rawToken = mockSendVerificationEmail.mock.calls[0][0].verificationToken;
    const storedDigest = mockUpdateUserEmailVerificationTokenHash.mock.calls[0][1];
    const expiry = mockUpdateUserEmailVerificationTokenHash.mock.calls[0][2] as Date;

    expect(storedDigest).toBe(createHash('sha256').update(rawToken).digest('hex'));
    expect(storedDigest).not.toBe(rawToken);
    expect(expiry.getTime()).toBeGreaterThan(Date.now());
  });

  it('stores only the reset-token digest and sends that exact one-time token through the auth email boundary', async () => {
    const service = new AuthService();
    mockGetUserByEmail.mockResolvedValue(user({ emailVerified: 1 }));

    await expect(service.forgotPassword('agent@example.com')).resolves.toBe(true);

    const sent = mockSendPasswordResetEmail.mock.calls[0][0];
    const storedHash = mockUpdateUserPasswordResetToken.mock.calls[0][1];
    const expiry = mockUpdateUserPasswordResetToken.mock.calls[0][2] as Date;
    expect(sent.to).toBe('agent@example.com');
    expect(storedHash).toBe(createHash('sha256').update(sent.resetToken).digest('hex'));
    expect(storedHash).not.toBe(sent.resetToken);
    expect(expiry.getTime()).toBeGreaterThan(Date.now());
    expect(expiry.getTime()).toBeLessThanOrEqual(Date.now() + 60 * 60 * 1000);
  });

  it('rejects an expired verification token before changing the account', async () => {
    const service = new AuthService();
    mockGetUserByEmailVerificationTokenHash.mockResolvedValue(
      user({ emailVerificationTokenExpiresAt: new Date(Date.now() - 1_000) }),
    );

    await expect(service.verifyEmail('expired-token')).rejects.toThrow(
      'Invalid or expired email verification token.',
    );
    expect(mockVerifyUserEmail).not.toHaveBeenCalled();
  });
});

const founderPrincipal = 'google:' + 'P'.repeat(43);
function founderUser(overrides: Record<string, unknown> = {}) {
  return user({ founderAuthority: 'platform_founder', openId: founderPrincipal, email: 'founder@example.test', role: 'super_admin',
    loginMethod: 'google-founder', passwordHash: null, ...overrides });
}
function enableFounderLogin() {
  for (const [key, value] of Object.entries({
    FOUNDER_GOOGLE_PROOF_ENABLED: 'true', FOUNDER_GOOGLE_LOGIN_ENABLED: 'true',
    GOOGLE_OAUTH_CLIENT_ID: 'unit.apps.googleusercontent.com', GOOGLE_OAUTH_CLIENT_SECRET: 'unit-private',
    GOOGLE_OAUTH_REDIRECT_URI: 'https://api.example.test/api/auth/google/callback',
    FOUNDER_GOOGLE_EMAIL: 'founder@example.test', OWNER_OPEN_ID: founderPrincipal,
    APP_URL: 'https://www.example.test', REDIS_URL: 'redis://127.0.0.1:6379',
  })) vi.stubEnv(key, value);
}
afterEach(() => vi.unstubAllEnvs());
describe('browser tRPC logout session revocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAgentByUserId.mockResolvedValue(null);
  });

  function logoutCaller(cookieHeader?: string) {
    const response = createRouteResponse();
    const caller = appRouter.createCaller({
      user: null,
      req: { headers: { cookie: cookieHeader } } as never,
      res: response,
      requestId: 'browser-logout-regression',
    });
    return { caller, response };
  }

  it.each(['visitor', 'agent', 'agency_admin', 'developer', 'super_admin'])(
    'rejects replay of both browser sessions after %s logout',
    async role => {
      let account = role === 'super_admin' ? founderUser() : user({ role });
      if (role === 'super_admin') {
        enableFounderLogin();
        vi.spyOn(FounderGoogleAccountService.prototype, 'assertSessionBinding').mockResolvedValue();
      }
      mockGetUserById.mockImplementation(async () => account);
      mockRevokeUserSessions.mockImplementation(async (id: number, version: number) => {
        if (account.id === id && account.sessionVersion === version) {
          account = { ...account, sessionVersion: version + 1 };
        }
      });
      const claims = role === 'super_admin' ? { founderPrincipal } : undefined;
      const token = await authService.createSessionToken(42, account.email, account.name, 1, claims);
      const remembered = await authService.createSessionToken(42, account.email, account.name, 1, claims);
      for (const session of [token, remembered]) {
        await expect(authService.authenticateRequest({
          headers: { cookie: `${COOKIE_NAME}=${session}` },
        } as any)).resolves.toMatchObject({ id: 42, role });
      }

      const { caller, response } = logoutCaller(`${COOKIE_NAME}=${token}`);
      await expect(caller.auth.logout()).resolves.toEqual({ success: true });
      expect(response.clearCookie).toHaveBeenCalledWith(COOKIE_NAME, expect.any(Object));
      expect(account.sessionVersion).toBe(2);
      for (const session of [token, remembered]) {
        await expect(authService.authenticateRequest({
          headers: { cookie: `${COOKIE_NAME}=${session}` },
        } as any)).rejects.toThrow('Session has been revoked');
      }
    },
  );

  it('waits for durable revocation before clearing the cookie or returning success', async () => {
    let complete!: () => void;
    mockRevokeUserSessions.mockImplementation(() => new Promise<void>(resolve => {
      complete = resolve;
    }));
    const token = await authService.createSessionToken(42, 'agent@example.com', 'Agent', 1);
    const { caller, response } = logoutCaller(`${COOKIE_NAME}=${token}`);
    const result = caller.auth.logout();
    await vi.waitFor(() => expect(mockRevokeUserSessions).toHaveBeenCalledWith(42, 1));
    expect(response.clearCookie).not.toHaveBeenCalled();
    complete();
    await expect(result).resolves.toEqual({ success: true });
    expect(response.clearCookie).toHaveBeenCalledOnce();
  });

  it('fails closed without clearing the cookie or exposing persistence details', async () => {
    mockRevokeUserSessions.mockRejectedValue(new Error('private database diagnostic'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const token = await authService.createSessionToken(42, 'agent@example.com', 'Agent', 1);
    const { caller, response } = logoutCaller(`${COOKIE_NAME}=${token}`);
    await expect(caller.auth.logout()).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      message: 'Secure logout is temporarily unavailable. Please retry shortly.',
    });
    expect(response.clearCookie).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith('[Auth] Logout session revocation failed', {
      requestId: 'browser-logout-regression', code: null, name: 'Error',
    });
  });

  it.each([undefined, 'not-a-signed-session'])(
    'allows already unauthenticated browser logout for %s',
    async cookieValue => {
      const { caller, response } = logoutCaller(
        cookieValue ? `${COOKIE_NAME}=${cookieValue}` : undefined,
      );
      await expect(caller.auth.logout()).resolves.toEqual({ success: true });
      expect(mockRevokeUserSessions).not.toHaveBeenCalled();
      expect(response.clearCookie).toHaveBeenCalledOnce();
    },
  );

  it('returns HTTP 503 without a cookie clear or private diagnostics when revocation fails', async () => {
    mockGetUserById.mockResolvedValue(user());
    mockRevokeUserSessions.mockRejectedValue(new Error('private database diagnostic'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const token = await authService.createSessionToken(42, 'agent@example.com', 'Agent', 1);
    const app = express();
    app.use(express.json());
    app.use('/api/trpc', createExpressMiddleware({ router: appRouter, createContext }));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      const { port } = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${port}/api/trpc/auth.logout?batch=1`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: `${COOKIE_NAME}=${token}` },
        body: JSON.stringify({ '0': { json: null } }),
      });
      expect(response.status).toBe(503);
      expect(response.headers.get('set-cookie')).toBeNull();
      const body = await response.text();
      expect(body).toContain('SERVICE_UNAVAILABLE');
      expect(body).toContain('Secure logout is temporarily unavailable. Please retry shortly.');
      expect(body).not.toContain('private database diagnostic');
    } finally {
      server.close();
      await once(server, 'close');
    }
  });
});
describe('Google founder uses genuine provider sessions only', () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([{ loginMethod: 'google-founder' }, { loginMethod: 'email', openId: founderPrincipal }])(
    'denies password login even if a password was assigned: %j', async overrides => {
      const service = new AuthService();
      mockGetUserByEmail.mockResolvedValueOnce(founderUser({ passwordHash: 'injected-hash', ...overrides }));
      const check = vi.spyOn(service, 'verifyPassword');
      await expect(service.login('founder@example.test', 'Password!123')).rejects.toThrow('Google sign-in');
      expect(check).not.toHaveBeenCalled();
    },
  );
  it('does not issue a recovery token or activation password link to the founder', async () => {
    const service = new AuthService();
    mockGetUserByEmail.mockResolvedValue(founderUser());
    await expect(service.forgotPassword('founder@example.test')).resolves.toBe(false);
    await expect(service.generatePasswordResetLink('founder@example.test')).resolves.toBeNull();
    await service.sendActivationSetPasswordEmail('founder@example.test');
    expect(mockUpdateUserPasswordResetToken).not.toHaveBeenCalled();
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });
  it('rejects a retained reset token without changing founder credentials', async () => {
    mockGetUserByPasswordResetToken.mockResolvedValueOnce(founderUser({ passwordResetTokenExpiresAt: new Date(Date.now() + 3600000).toISOString() }));
    await expect(new AuthService().resetPassword('unit-reset', 'Password!123')).rejects.toThrow('Invalid or expired');
    expect(mockUpdateUserPassword).not.toHaveBeenCalled();
  });
  it('rejects a native email verification token for a founder account', async () => {
    mockGetUserByEmailVerificationTokenHash.mockResolvedValueOnce(founderUser({ emailVerificationTokenExpiresAt: new Date(Date.now() + 3600000).toISOString() }));
    await expect(new AuthService().verifyEmail('unit-verification')).rejects.toThrow('Invalid or expired');
    expect(mockVerifyUserEmail).not.toHaveBeenCalled();
  });
  it('reserves the enabled founder mailbox before native registration or password hashing', async () => {
    enableFounderLogin();
    const service = new AuthService();
    const hash = vi.spyOn(service, 'hashPassword');
    await expect(service.register(' FOUNDER@example.test ', 'Password!123')).rejects.toThrow('original login method');
    expect(mockGetUserByEmail).not.toHaveBeenCalled();
    expect(hash).not.toHaveBeenCalled();
  });
  it('accepts a verified native founder JWT only after checking its durable binding', async () => {
    enableFounderLogin();
    const service = new AuthService();
    const account = founderUser();
    mockGetUserById.mockResolvedValueOnce(account);
    const binding = vi.spyOn(FounderGoogleAccountService.prototype, 'assertSessionBinding').mockResolvedValueOnce();
    const token = await service.createSessionToken(42, account.email, account.name, 1, { founderPrincipal, expiresInMs: 86400000 });
    await expect(service.authenticateRequest({ headers: { cookie: `${COOKIE_NAME}=${token}` } } as any)).resolves.toMatchObject({ id: 42, role: 'super_admin' });
    expect(binding).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }), founderPrincipal);
  });
  it('rejects an old native session without provider proof for the newly bound founder', async () => {
    enableFounderLogin();
    const service = new AuthService();
    mockGetUserById.mockResolvedValueOnce(founderUser());
    const token = await service.createSessionToken(42, 'founder@example.test', 'Founder', 1);
    await expect(service.authenticateRequest({ headers: { cookie: `${COOKIE_NAME}=${token}` } } as any)).rejects.toThrow('revoked');
    expect(mockUpdateUserLastSignIn).not.toHaveBeenCalled();
  });
  it('rejects a founder session when login is disabled', async () => {
    enableFounderLogin();
    vi.stubEnv('FOUNDER_GOOGLE_LOGIN_ENABLED', 'false');
    const service = new AuthService();
    mockGetUserById.mockResolvedValueOnce(founderUser());
    const token = await service.createSessionToken(42, 'founder@example.test', 'Founder', 1, { founderPrincipal });
    await expect(service.authenticateRequest({ headers: { cookie: `${COOKIE_NAME}=${token}` } } as any)).rejects.toThrow('revoked');
  });
  it('rejects a session if the reviewed owner binding no longer agrees', async () => {
    enableFounderLogin();
    vi.stubEnv('OWNER_OPEN_ID', 'google:' + 'Q'.repeat(43));
    const service = new AuthService();
    mockGetUserById.mockResolvedValueOnce(founderUser());
    const token = await service.createSessionToken(42, 'founder@example.test', 'Founder', 1, { founderPrincipal });
    await expect(service.authenticateRequest({ headers: { cookie: `${COOKIE_NAME}=${token}` } } as any)).rejects.toThrow('conflicts');
  });
  it('retains session-version revocation before any founder binding lookup', async () => {
    enableFounderLogin();
    const service = new AuthService();
    mockGetUserById.mockResolvedValueOnce(founderUser({ sessionVersion: 2 }));
    const binding = vi.spyOn(FounderGoogleAccountService.prototype, 'assertSessionBinding');
    const token = await service.createSessionToken(42, 'founder@example.test', 'Founder', 1, { founderPrincipal });
    await expect(service.authenticateRequest({ headers: { cookie: `${COOKIE_NAME}=${token}` } } as any)).rejects.toThrow('revoked');
    expect(binding).not.toHaveBeenCalled();
  });
  it('rejects malformed founder claims before account lookup', async () => {
    const token = await new SignJWT({ userId: 42, email: 'founder@example.test', name: 'Founder', sessionVersion: 1, founderPrincipal: 'invalid' })
      .setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(sessionSecret);
    await expect(new AuthService().verifySession(token)).resolves.toBeNull();
    expect(mockGetUserById).not.toHaveBeenCalled();
  });
});
