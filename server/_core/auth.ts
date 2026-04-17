/**
 * Custom Authentication Service
 * Replaces Manus SDK with email/password authentication
 */

import { COOKIE_NAME, ONE_YEAR_MS } from '@shared/const';
import { ForbiddenError } from '@shared/_core/errors';
import type { Request, Response, NextFunction } from 'express';
import { SignJWT, jwtVerify } from 'jose';
import { parse as parseCookieHeader } from 'cookie';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { User } from '../../drizzle/schema';
import * as db from '../db';
import { ENV } from './env';
import { sendVerificationEmail, sendPasswordResetEmail } from './email';
import { EmailService } from './emailService';

export type SessionPayload = {
  userId: number;
  email: string;
  name: string;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const getRequestId = (req: Request): string => {
  const value = (req as any)?.requestId;
  return typeof value === 'string' && value.trim().length > 0 ? value : 'unknown';
};

export const normalizeAuthRole = (role: unknown): User['role'] => {
  const normalized = typeof role === 'string' ? role.trim().toLowerCase() : '';
  if (normalized === 'admin') return 'super_admin';
  if (normalized === 'user') return 'visitor';
  return (role as User['role']) || 'visitor';
};

class AuthService {
  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    if (!secret) {
      throw new Error('JWT_SECRET is required. Set it in your .env file.');
    }
    return new TextEncoder().encode(secret);
  }

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify a password against a hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Create a session token (JWT) for a user
   */
  async createSessionToken(
    userId: number,
    email: string,
    name: string,
    options: { expiresInMs?: number } = {},
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      userId,
      email,
      name,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(Math.floor(issuedAt / 1000))
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  /**
   * Verify a session token from a cookie
   */
  async verifySession(
    cookieValue: string | undefined | null,
    requestId = 'unknown',
  ): Promise<SessionPayload | null> {
    if (!cookieValue) {
      console.warn('[Auth][Session] Cookie missing', { requestId });
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ['HS256'],
      });

      const { userId, email, name } = payload as Record<string, unknown>;

      if (typeof userId !== 'number' || !isNonEmptyString(email)) {
        console.warn('[Auth][Session] Payload missing required fields', {
          requestId,
          hasUserId: typeof userId === 'number',
          hasEmail: isNonEmptyString(email),
        });
        return null;
      }

      return {
        userId,
        email,
        name: isNonEmptyString(name) ? name : email, // Use email as fallback if name is missing
      };
    } catch (error: any) {
      // Provide specific error messages for common JWT issues
      if (error?.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
        console.error('[Auth][Session] JWT signature verification failed', {
          requestId,
          code: error?.code || null,
        });
      } else if (error?.code === 'ERR_JWT_EXPIRED') {
        console.warn('[Auth][Session] JWT expired', { requestId });
      } else {
        console.warn('[Auth][Session] Verification failed', {
          requestId,
          message: error?.message || String(error),
          code: error?.code || null,
          name: error?.name || null,
        });
      }
      return null;
    }
  }

  /**
   * Parse cookies from request header
   */
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  /**
   * Authenticate a request and return the user
   * This is the main authentication method used in tRPC context
   */
  async authenticateRequest(req: Request): Promise<User> {
    const requestId = getRequestId(req);
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    console.info('[Auth][Session] authenticateRequest', {
      requestId,
      hasCookieHeader: Boolean(req.headers.cookie),
      cookieCount: cookies.size,
      hasSessionCookie: Boolean(sessionCookie),
    });

    const session = await this.verifySession(sessionCookie, requestId);

    if (!session) {
      console.warn('[Auth][Session] No valid session', { requestId });
      throw ForbiddenError('Invalid or missing session cookie');
    }

    // Get user from database using userId from session
    const user = await db.getUserById(session.userId);
    console.info('[Auth][Session] User lookup', {
      requestId,
      userId: session.userId,
      userFound: Boolean(user),
    });

    if (!user) {
      throw ForbiddenError('User not found');
    }

    const normalizedRole = normalizeAuthRole(user.role);
    const normalizedUser = {
      ...user,
      role: normalizedRole,
    } as User;

    // Update last signed in timestamp
    await db.updateUserLastSignIn(normalizedUser.id);

    return normalizedUser;
  }

  /**
   * Register a new user with email and password
   */
  async resendVerificationEmail(email: string): Promise<{ sent: boolean }> {
    const user = await db.getUserByEmail(email);
    if (!user || user.emailVerified || !user.email) {
      return { sent: false };
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    await db.updateUserEmailVerificationToken(user.id, verificationToken);

    await sendVerificationEmail({
      to: user.email,
      verificationToken,
      name: user.name || undefined,
    });

    return { sent: true };
  }

  /**
   * Register a new user with email and password
   */
  async register(
    email: string,
    password: string,
    name?: string,
    role:
      | 'visitor'
      | 'agent'
      | 'agency_admin'
      | 'property_developer'
      | 'service_provider' = 'visitor',
    agentProfile?: {
      displayName: string;
      phone?: string;
      phoneNumber?: string;
      bio?: string;
      licenseNumber?: string;
      specializations?: string[];
    },
  ): Promise<{ userId: number; verificationEmailSent: boolean }> {
    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const userId = await db.createUser({
      email,
      passwordHash,
      name: name || email.split('@')[0],
      emailVerified: 0,
      loginMethod: 'email',
      role: role, // Use requested role
      isSubaccount: 0,
      emailVerificationToken,
    });

    const normalizedAgentProfile =
      role === 'agent' && agentProfile
        ? {
            displayName: agentProfile.displayName.trim(),
            phone: agentProfile.phone || agentProfile.phoneNumber,
            bio: agentProfile.bio,
            licenseNumber: agentProfile.licenseNumber,
            specializations: agentProfile.specializations,
          }
        : undefined;

    // Create the pending agent profile immediately so registration does not
    // depend on the optional pending_agent_profiles staging table.
    if (role === 'agent' && normalizedAgentProfile) {
      if (!normalizedAgentProfile.displayName || !normalizedAgentProfile.phone) {
        throw new Error('Agent profile with display name and phone number is required');
      }

      try {
        await db.createAgentProfile({
          userId,
          displayName: normalizedAgentProfile.displayName,
          phone: normalizedAgentProfile.phone,
          bio: normalizedAgentProfile.bio,
          licenseNumber: normalizedAgentProfile.licenseNumber,
          specializations: normalizedAgentProfile.specializations,
        });
      } catch (error) {
        await db.deleteUserById(userId);
        throw error;
      }
    }

    // Get the created user
    const user = await db.getUserById(userId);
    if (!user) {
      throw new Error('Failed to create user');
    }

    // Send verification email
    let verificationEmailSent = false;
    try {
      await sendVerificationEmail({
        to: user.email!,
        verificationToken: emailVerificationToken,
        name: user.name || undefined,
      });
      console.log('[Auth] Verification email sent successfully');
      verificationEmailSent = true;
    } catch (emailError) {
      console.error('[Auth] Failed to send verification email:', emailError);
    }

    return { userId, verificationEmailSent };
  }

  /**
   * Login with email and password
   */
  async login(
    email: string,
    password: string,
    rememberMe?: boolean,
  ): Promise<{ user: User; sessionToken: string }> {
    // Get user by email
    const user = await db.getUserByEmail(email);
    if (!user) {
      throw ForbiddenError('Invalid email or password');
    }

    const normalizedUser = {
      ...user,
      role: normalizeAuthRole(user.role),
    } as User;

    // Check if user has password (not OAuth-only)
    if (!normalizedUser.passwordHash) {
      throw ForbiddenError('This account uses OAuth login. Please use your original login method.');
    }

    // Verify password
    const isValid = await this.verifyPassword(password, normalizedUser.passwordHash);
    if (!isValid) {
      throw ForbiddenError('Invalid email or password');
    }

    // Check if email is verified
    if (!normalizedUser.emailVerified) {
      throw ForbiddenError('Please verify your email address before logging in.');
    }

    // Check agent status if user is an agent
    if (normalizedUser.role === 'agent') {
      const agentProfile = await db.getAgentByUserId(normalizedUser.id);
      if (agentProfile) {
        if (agentProfile.status === 'rejected') {
          const reason = agentProfile.rejectionReason || 'No reason provided';
          throw new Error(`Your agent application was rejected. Reason: ${reason}`);
        }
        if (agentProfile.status === 'suspended') {
          throw new Error('Your agent account has been suspended. Please contact support.');
        }
      }
    }

    // Update last signed in timestamp
    await db.updateUserLastSignIn(normalizedUser.id);

    // Create session token
    const expiresInMs = rememberMe
      ? 30 * 24 * 60 * 60 * 1000 // 30 days
      : 24 * 60 * 60 * 1000; // 24 hours

    const sessionToken = await this.createSessionToken(
      normalizedUser.id,
      normalizedUser.email!,
      normalizedUser.name || normalizedUser.email!,
      { expiresInMs },
    );

    return { user: normalizedUser, sessionToken };
  }

  /**
   * Forgot password - generate and send reset token
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await db.getUserByEmail(email);
    if (!user) {
      // Don't reveal that the user doesn't exist
      return;
    }

    // Generate a random token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Set token expiry to 1 hour from now
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // Store hashed token and expiry in the database
    await db.updateUserPasswordResetToken(user.id, hashedToken, expiresAt);

    // Send email with reset link
    const resetLink = `${ENV.appUrl}/reset-password?token=${token}`;

    await EmailService.sendEmail({
      to: user.email!,
      subject: 'Password Reset Request',
      html: `<p>You requested a password reset. Click the link below to reset your password:</p><a href="${resetLink}">${resetLink}</a><p>This link will expire in 1 hour.</p>`,
      text: `You requested a password reset. Copy and paste this link into your browser to reset your password: ${resetLink}`,
    });
  }

  /**
   * First-time account activation password setup email for onboarding users.
   */
  async sendActivationSetPasswordEmail(email: string): Promise<void> {
    const user = await db.getUserByEmail(email);
    if (!user) {
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Onboarding links can reasonably be valid longer than a standard reset request.
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await db.updateUserPasswordResetToken(user.id, hashedToken, expiresAt);

    const setupLink = `${ENV.appUrl}/set-password?token=${token}`;

    await EmailService.sendEmail({
      to: user.email!,
      subject: 'Activate your account - set your password',
      html: `<p>Your referrer account has been approved. Click the link below to set your password and activate your account:</p><a href="${setupLink}">${setupLink}</a><p>This link will expire in 24 hours.</p>`,
      text: `Your referrer account has been approved. Set your password to activate your account: ${setupLink}`,
    });
  }

  /**
   * Reset password using a token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await db.getUserByPasswordResetToken(hashedToken);

    if (!user || !user.passwordResetTokenExpiresAt) {
      throw new Error('Invalid or expired password reset token.');
    }

    if (new Date() > new Date(user.passwordResetTokenExpiresAt)) {
      throw new Error('Invalid or expired password reset token.');
    }

    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);

    // Update password and clear reset token fields
    await db.updateUserPassword(user.id, passwordHash);
  }

  /**
   * Verify email address using a token
   */
  async verifyEmail(token: string): Promise<User> {
    const user = await db.getUserByEmailVerificationToken(token);

    if (!user) {
      throw new Error('Invalid or expired email verification token.');
    }

    // Verify the email
    await db.verifyUserEmail(user.id);

    // Agent profiles are created directly during registration.
    // Verification should not depend on the legacy pending_agent_profiles table.
    if (user.role === 'agent') {
      const existingProfile = await db.getAgentByUserId(user.id);
      if (!existingProfile) {
        throw new Error('Agent profile is missing for this account. Please contact support.');
      }
    }

    return {
      ...user,
      emailVerified: 1,
      emailVerificationToken: null,
      role: normalizeAuthRole(user.role),
    } as User;
  }
}

export const authService = new AuthService();

/**
 * Express middleware to require authentication
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.authenticateRequest(req);
    // Attach user to request for use in route handlers
    (req as any).user = user;
    next();
  } catch (error) {
    console.warn('[AuthMiddleware] Unauthorized access attempt', {
      requestId: getRequestId(req),
      message: (error as any)?.message || String(error),
      code: (error as any)?.code || null,
      name: (error as any)?.name || null,
    });
    res.status(401).json({ error: 'Unauthorized' });
  }
};
