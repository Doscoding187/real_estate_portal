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
import { getDb } from '../db';
import { sql } from 'drizzle-orm';
import { ENV } from './env';
import { sendVerificationEmail, sendPasswordResetEmail } from './email';
import { EmailService } from './emailService';
import { getAgentEntitlementsForUserId } from '../services/agentEntitlementService';
import { initializeAgentStarterTrial } from '../services/planAccessService';

export type SessionPayload = {
  userId: number;
  email: string;
  name: string;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

class AuthService {
  private toDbTimestamp(value: Date): string {
    return value.toISOString().slice(0, 19).replace('T', ' ');
  }

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
  async verifySession(cookieValue: string | undefined | null): Promise<SessionPayload | null> {
    if (!cookieValue) {
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ['HS256'],
      });

      const { userId, email, name } = payload as Record<string, unknown>;

      if (typeof userId !== 'number' || !isNonEmptyString(email)) {
        console.warn('[Auth] Session payload missing required fields');
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
        console.error('[Auth] ❌ INVALID SIGNATURE: Token was signed with a different secret key.');
        console.error('[Auth] This usually means:');
        console.error('[Auth]   1. JWT_SECRET in .env was changed after token was created');
        console.error('[Auth]   2. Token was created by old OAuth system (Manus)');
        console.error('[Auth]   3. Token is corrupted');
        console.error('[Auth] 💡 Solution: Clear browser cookies and login again');
      } else if (error?.code === 'ERR_JWT_EXPIRED') {
        console.warn('[Auth] Token expired');
      } else {
        console.warn('[Auth] Session verification failed:', error?.message || String(error));
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
    console.log('[Auth] authenticateRequest called');
    console.log('[Auth] Cookie header:', req.headers.cookie);

    const cookies = this.parseCookies(req.headers.cookie);
    console.log('[Auth] Parsed cookies:', Array.from(cookies.entries()));

    const sessionCookie = cookies.get(COOKIE_NAME);
    console.log('[Auth] COOKIE_NAME:', COOKIE_NAME);
    console.log('[Auth] sessionCookie value:', sessionCookie ? '(exists)' : '(missing)');
    console.log('[Auth] Session cookie value:', sessionCookie ? '(exists)' : '(missing)');

    const session = await this.verifySession(sessionCookie);
    console.log('[Auth] Session verification result:', session ? 'valid' : 'invalid');

    if (!session) {
      throw ForbiddenError('Invalid or missing session cookie');
    }

    // Get user from database using userId from session
    const user = await db.getUserById(session.userId);
    console.log('[Auth] User from DB:', user ? `${user.email} (role: ${user.role})` : 'not found');

    if (!user) {
      throw ForbiddenError('User not found');
    }

    // Update last signed in timestamp
    await db.updateUserLastSignIn(user.id);

    return user;
  }

  /**
   * Register a new user with email and password
   */
  async register(
    email: string,
    password: string,
    name?: string,
    role: 'visitor' | 'agent' | 'agency_admin' | 'property_developer' = 'visitor',
    agentProfile?: {
      displayName: string;
      phone?: string;
      phoneNumber?: string;
      bio?: string;
      licenseNumber?: string;
      specializations?: string[];
    },
  ): Promise<number> {
    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);
    const isAgent = role === 'agent';
    const now = new Date();
    const trialDaysRaw = Number(process.env.AGENT_TRIAL_DAYS || '30');
    const trialDays = Number.isFinite(trialDaysRaw) && trialDaysRaw > 0 ? trialDaysRaw : 30;
    const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

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
      plan: isAgent ? 'trial' : 'paid',
      trialStatus: isAgent ? 'active' : 'active',
      trialStartedAt: isAgent ? this.toDbTimestamp(now) : null,
      trialEndsAt: isAgent ? this.toDbTimestamp(trialEndsAt) : null,
      isSubaccount: 0,
      emailVerificationToken,
    });

    // Create the agent profile as pending so registration does not depend on
    // a separate pending table schema being present.
    if (role === 'agent' && agentProfile) {
      const normalizedPhone = agentProfile.phone || agentProfile.phoneNumber;
      if (!agentProfile.displayName || !normalizedPhone) {
        throw new Error('Agent profile with display name and phone number is required');
      }

      await db.createAgentProfile({
        userId,
        displayName: agentProfile.displayName,
        phone: normalizedPhone,
        bio: agentProfile.bio,
        licenseNumber: agentProfile.licenseNumber,
        specializations: agentProfile.specializations,
      });
    }

    if (role === 'agent') {
      try {
        await initializeAgentStarterTrial(userId);
      } catch (subscriptionError) {
        console.error('[Auth] Failed to initialize starter trial subscription:', subscriptionError);
      }
    }

    // Get the created user
    const user = await db.getUserById(userId);
    if (!user) {
      throw new Error('Failed to create user');
    }

    // Send verification email
    try {
      await sendVerificationEmail({
        to: user.email!,
        verificationToken: emailVerificationToken,
        name: user.name || undefined,
      });
      console.log('[Auth] Verification email sent successfully');
    } catch (emailError) {
      console.error('[Auth] Failed to send verification email:', emailError);
      // Don't throw error - allow registration to complete even if email fails
    }

    return userId;
  }

  /**
   * Login with email and password
   */
  async login(
    email: string,
    password: string,
    rememberMe?: boolean,
  ): Promise<{
    user: User;
    sessionToken: string;
    entitlements: Awaited<ReturnType<typeof getAgentEntitlementsForUserId>> | null;
  }> {
    // Get user by email
    const user = await db.getUserByEmail(email);
    if (!user) {
      throw ForbiddenError('Invalid email or password');
    }

    // Check if user has password (not OAuth-only)
    if (!user.passwordHash) {
      throw ForbiddenError('This account uses OAuth login. Please use your original login method.');
    }

    // Verify password
    const isValid = await this.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw ForbiddenError('Invalid email or password');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw ForbiddenError('Please verify your email address before logging in.');
    }

    // Update last signed in timestamp
    await db.updateUserLastSignIn(user.id);

    // Create session token
    const expiresInMs = rememberMe
      ? 30 * 24 * 60 * 60 * 1000 // 30 days
      : 24 * 60 * 60 * 1000; // 24 hours

    const sessionToken = await this.createSessionToken(
      user.id,
      user.email!,
      user.name || user.email!,
      { expiresInMs },
    );

    let entitlements: Awaited<ReturnType<typeof getAgentEntitlementsForUserId>> | null = null;
    try {
      entitlements = await getAgentEntitlementsForUserId(user.id);
    } catch (error) {
      console.warn('[Auth] Entitlement projection failed during login; continuing without it.', {
        userId: user.id,
        code: (error as any)?.code,
        message: (error as any)?.message,
      });
    }

    return { user, sessionToken, entitlements };
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

    // Backward compatibility: if an agent profile was staged in a pending table
    // by an older flow, hydrate it now if no profile exists yet.
    if (user.role === 'agent') {
      const existingProfile = await db.getAgentByUserId(user.id);
      if (!existingProfile) {
        const database = await getDb();
        if (database) {
          try {
            const [pendingProfile] = await database.execute(sql`
              SELECT * FROM pending_agent_profiles WHERE userId = ${user.id}
            `);

            if (pendingProfile && pendingProfile.rows && pendingProfile.rows.length > 0) {
              const profileData = pendingProfile.rows[0] as any;
              const pendingPhone = profileData.phone || profileData.phoneNumber;

              if (profileData.displayName && pendingPhone) {
                await db.createAgentProfile({
                  userId: user.id,
                  displayName: profileData.displayName,
                  phone: pendingPhone,
                  bio: profileData.bio,
                  licenseNumber: profileData.licenseNumber,
                  specializations: profileData.specializations
                    ? profileData.specializations.split(',')
                    : undefined,
                });

                await database.execute(sql`
                  DELETE FROM pending_agent_profiles WHERE userId = ${user.id}
                `);
              }
            }
          } catch (pendingProfileError) {
            console.warn(
              '[Auth] Pending agent profile reconciliation failed (non-fatal):',
              pendingProfileError,
            );
          }
        }
      }

      await db.autoApproveAgentByUserId(user.id);
    }

    const verifiedUser = await db.getUserById(user.id);
    return verifiedUser || user;
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await db.getUserByEmail(normalizedEmail);

    // Generic success to avoid account enumeration
    if (!user || user.emailVerified === 1) return;

    let verificationToken = user.emailVerificationToken;
    if (!verificationToken) {
      verificationToken = crypto.randomBytes(32).toString('hex');
      await db.updateUserEmailVerificationToken(user.id, verificationToken);
    }

    await sendVerificationEmail({
      to: user.email!,
      verificationToken,
      name: user.name || undefined,
    });
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
    console.warn('[AuthMiddleware] Unauthorized access attempt:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};
