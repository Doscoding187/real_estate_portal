import { createHash } from 'node:crypto';
import { SignJWT } from 'jose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
}));

vi.mock('./env', () => ({
  ENV: {
    appUrl: 'https://www.propertylistifysa.co.za',
    cookieSecret: 'test-session-secret-that-is-long-enough-for-jwt-signing',
  },
}));

vi.mock('./email', () => ({
  sendVerificationEmail: mockSendVerificationEmail,
  sendPasswordResetEmail: mockSendPasswordResetEmail,
}));
vi.mock('./emailService', () => ({ EmailService: { sendEmail: vi.fn() } }));

import { AuthService } from './auth';

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
