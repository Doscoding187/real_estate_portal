import { COOKIE_NAME } from '@shared/const';
import type { Express, Request, Response } from 'express';
import { getSessionCookieOptions } from './cookies';
import { authService } from './auth';
import { ENV } from './env';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../db';
import { distributionIdentities } from '../../drizzle/schema';

const getRequestId = (req: Request): string => {
  const requestId = (req as any).requestId;
  return typeof requestId === 'string' && requestId.trim().length > 0 ? requestId : 'unknown';
};

const isDatabaseQueryError = (message: string): boolean =>
  message.includes('Failed query:') ||
  message.includes('ECONNREFUSED') ||
  message.includes('connect');

/**
 * Register authentication routes
 * This replaces the Manus OAuth routes
 */
export function registerAuthRoutes(app: Express) {
  /**
   * Register a new user
   * POST /api/auth/register
   * Body: { email: string, password: string, name?: string }
   */
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { email, password, name, role, agentProfile } = req.body;
      const normalizedAgentProfile =
        role === 'agent' && agentProfile
          ? {
              ...agentProfile,
              displayName:
                typeof agentProfile.displayName === 'string'
                  ? agentProfile.displayName.trim()
                  : agentProfile.displayName,
              phoneNumber: agentProfile.phoneNumber || agentProfile.phone,
              phone: agentProfile.phone || agentProfile.phoneNumber,
            }
          : undefined;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Invalid input types' });
      }

      // Feature 3: Password Strength Requirements
      const passwordStrengthRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={};':"\\|,.<>/?]).{8,}$/;
      if (!passwordStrengthRegex.test(password)) {
        return res.status(400).json({
          error:
            'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
        });
      }

      // Validate agent profile if role is agent
      if (role === 'agent') {
        if (
          !normalizedAgentProfile ||
          !normalizedAgentProfile.displayName ||
          !normalizedAgentProfile.phoneNumber
        ) {
          return res.status(400).json({
            error:
              'Agent profile with display name and phone number is required for agent registration',
          });
        }
      }

      // Register user (sends verification email)
      // Allow specific roles if requested, otherwise default to 'visitor'
      const allowedRoles = ['agent', 'agency_admin', 'property_developer', 'visitor'];
      const requestedRole = allowedRoles.includes(role) ? role : 'visitor';

      const { verificationEmailSent } = await authService.register(
        email,
        password,
        name,
        requestedRole as any,
        normalizedAgentProfile,
      );

      // Return success message - user must verify email before logging in
      const message =
        role === 'agent'
          ? 'Registration successful! Please check your email to verify your account. Your agent profile will be created after email verification.'
          : 'Registration successful. Please check your email to verify your account.';

      res.status(verificationEmailSent ? 201 : 202).json({
        success: true,
        verificationEmailSent,
        message: verificationEmailSent
          ? message
          : 'Account created, but we could not send the verification email right now. Please use resend verification before logging in.',
      });
    } catch (error: any) {
      console.error('[Auth] Registration failed', error);

      if (
        error.message?.includes('already exists') ||
        error.message?.includes('Multiple accounts found for this email')
      ) {
        return res.status(409).json({ error: error.message });
      }

      res.status(500).json({ error: 'Registration failed' });
    }
  });

  /**
   * Login with email and password
   * POST /api/auth/login
   * Body: { email: string, password: string, rememberMe?: boolean }
   */
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const requestId = getRequestId(req);
    const emailFromBody = req.body?.email;
    const normalizedEmail =
      typeof emailFromBody === 'string' ? emailFromBody.trim().toLowerCase() : null;

    try {
      const { email, password, rememberMe } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Invalid input types' });
      }

      console.info('[Auth][Login] Attempt', { requestId, email: normalizedEmail });

      // Login user
      const { user, sessionToken } = await authService.login(email, password, rememberMe);
      console.info('[Auth][Login] Success', {
        requestId,
        userId: user.id,
        email: user.email || null,
      });

      let hasReferrerIdentity = false;
      try {
        const db = await getDb();
        if (db) {
          const [identity] = await db
            .select({ id: distributionIdentities.id })
            .from(distributionIdentities)
            .where(
              and(
                eq(distributionIdentities.userId, user.id),
                eq(distributionIdentities.identityType, 'referrer'),
                eq(distributionIdentities.active, 1),
              ),
            )
            .limit(1);
          hasReferrerIdentity = Boolean(identity?.id);
        }
      } catch (identityError) {
        console.warn('[Auth] Referrer identity lookup failed (non-fatal):', identityError);
      }

      // Feature 4: "Remember Me" Functionality
      const maxAge = rememberMe
        ? 30 * 24 * 60 * 60 * 1000 // 30 days
        : 24 * 60 * 60 * 1000; // 24 hours

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge,
      });

      // Return success with user info
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          hasReferrerIdentity,
        },
      });
    } catch (error: any) {
      // Handle specific error cases with appropriate status codes
      const errorMessage = error?.message || 'Unknown error';
      const dbErrorMessage = isDatabaseQueryError(errorMessage) ? errorMessage : null;

      console.error('[Auth][Login] Failure', {
        requestId,
        email: normalizedEmail,
        errorMessage,
        dbErrorMessage,
        code: error?.code || null,
        name: error?.name || null,
      });

      if (
        errorMessage.includes('Invalid email or password') ||
        errorMessage.includes('verify your email')
      ) {
        return res.status(401).json({
          error: errorMessage,
          code: errorMessage.includes('verify your email') ? 'EMAIL_UNVERIFIED' : undefined,
          email: errorMessage.includes('verify your email') ? normalizedEmail : undefined,
        });
      }

      if (errorMessage.includes('OAuth login')) {
        return res.status(403).json({ error: errorMessage });
      }

      if (errorMessage.includes('Multiple accounts found for this email')) {
        return res.status(409).json({ error: errorMessage, requestId });
      }

      if (
        errorMessage.includes('pending review') ||
        errorMessage.includes('rejected') ||
        errorMessage.includes('suspended')
      ) {
        return res.status(403).json({ error: errorMessage });
      }

      if (errorMessage.includes('JWT_SECRET')) {
        return res
          .status(500)
          .json({ error: 'Server configuration error. Please contact support.', requestId });
      }

      // Database connection errors
      if (errorMessage.includes('connect') || errorMessage.includes('ECONNREFUSED')) {
        return res
          .status(503)
          .json({ error: 'Database service unavailable. Please try again later.', requestId });
      }

      res.status(500).json({
        error: 'Login failed',
        message: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        requestId,
      });
    }
  });

  /**
   * Logout (clear session cookie)
   * POST /api/auth/logout
   */
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true, message: 'Logged out successfully.' });
  });

  /**
   * Feature 1: Password Reset Functionality - Step 1
   * POST /api/auth/forgot-password
   * Body: { email: string }
   */
  app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'A valid email is required' });
      }

      await authService.forgotPassword(email);

      // Always return a success message to prevent email enumeration attacks
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    } catch (error: any) {
      console.error('[Auth] Forgot password failed', error);
      // Do not reveal internal errors to the client
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }
  });

  /**
   * Feature 1: Password Reset Functionality - Step 2
   * POST /api/auth/reset-password
   * Body: { token: string, newPassword: string }
   */
  app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword || typeof token !== 'string' || typeof newPassword !== 'string') {
        return res.status(400).json({ error: 'A token and a new password are required' });
      }

      // Feature 3: Password Strength Requirements
      const passwordStrengthRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={};':"\\|,.<>/?]).{8,}$/;
      if (!passwordStrengthRegex.test(newPassword)) {
        return res.status(400).json({
          error:
            'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
        });
      }

      await authService.resetPassword(token, newPassword);

      res.json({ success: true, message: 'Your password has been reset successfully.' });
    } catch (error: any) {
      console.error('[Auth] Reset password failed', error);
      res
        .status(400)
        .json({ error: error.message || 'The password reset token is invalid or has expired.' });
    }
  });

  /**
   * Feature 2: Email Verification for New Registrations
   * GET /api/auth/verify-email
   * Query: ?token=<verification_token>
   */
  app.get('/api/auth/verify-email', async (req: Request, res: Response) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res
          .status(400)
          .send(
            '<h1>Email Verification Failed</h1><p>The verification link is missing a token.</p>',
          );
      }

      await authService.verifyEmail(token);

      // Redirect to the login page with a success message
      res.redirect(`${ENV.appUrl}/login?verified=true`);
    } catch (error: any) {
      console.error('[Auth] Email verification failed', error);
      res
        .status(400)
        .send(
          `<h1>Email Verification Failed</h1><p>${error.message || 'The verification link is invalid or has expired.'}</p>`,
        );
    }
  });

  /**
   * Resend verification email for unverified accounts.
   * POST /api/auth/resend-verification
   * Body: { email: string }
   */
  app.post('/api/auth/resend-verification', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'A valid email is required' });
      }

      await authService.resendVerificationEmail(email);

      res.json({
        success: true,
        message: 'If this account exists and is unverified, a verification email has been sent.',
      });
    } catch (error: any) {
      console.error('[Auth] Resend verification failed', error);
      res.status(503).json({
        error: 'Verification email could not be sent right now. Please try again later.',
      });
    }
  });
}
