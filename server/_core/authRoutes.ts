import { COOKIE_NAME } from '@shared/const';
import type { Express, Request, Response } from 'express';
import { getSessionCookieOptions } from './cookies';
import { authService } from './auth';
import { ENV } from './env';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../db';
import { distributionIdentities } from '../../drizzle/schema';

const RESEND_VERIFICATION_COOLDOWN_MS = 60_000;
const resendVerificationLastSentAt = new Map<string, number>();

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

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Invalid input types' });
      }

      // Feature 3: Password Strength Requirements
      const passwordStrengthRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}';:"\\|,.<>/?[\]]).{8,}$/;
      if (!passwordStrengthRegex.test(password)) {
        return res.status(400).json({
          error:
            'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
        });
      }

      // Register user (sends verification email)
      // Allow specific roles if requested, otherwise default to 'visitor'
      const allowedRoles = ['agent', 'agency_admin', 'property_developer', 'visitor'];
      const requestedRole = allowedRoles.includes(role) ? role : 'visitor';

      const normalizedAgentProfile =
        role === 'agent' && agentProfile
          ? {
              ...agentProfile,
              phoneNumber: agentProfile.phoneNumber || agentProfile.phone,
              phone: agentProfile.phone || agentProfile.phoneNumber,
            }
          : undefined;

      const userId = await authService.register(
        email,
        password,
        name,
        requestedRole as any,
        normalizedAgentProfile,
      );

      // Return success message - user must verify email before logging in
      const message =
        role === 'agent'
          ? 'Registration successful! Please check your email to verify your account and complete your profile setup.'
          : 'Registration successful. Please check your email to verify your account.';

      res.status(201).json({
        success: true,
        message,
      });
    } catch (error: any) {
      console.error('[Auth] Registration failed', error);

      if (error.message?.includes('already exists')) {
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
    try {
      console.log('🔐 Login attempt:', req.body);
      const { email, password, rememberMe } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Invalid input types' });
      }

      console.log('🔍 Validating credentials for:', email);
      // Login user
      const { user, sessionToken, entitlements } = await authService.login(
        email,
        password,
        rememberMe,
      );
      console.log('✅ Auth service returned user:', user.email);

      let hasReferrerIdentity = false;
      let hasManagerIdentity = false;
      try {
        const db = await getDb();
        if (db) {
          const identityRows = await db
            .select({
              id: distributionIdentities.id,
              identityType: distributionIdentities.identityType,
            })
            .from(distributionIdentities)
            .where(
              and(eq(distributionIdentities.userId, user.id), eq(distributionIdentities.active, 1)),
            );
          hasReferrerIdentity = identityRows.some(
            row => Boolean(row.id) && row.identityType === 'referrer',
          );
          hasManagerIdentity = identityRows.some(
            row => Boolean(row.id) && row.identityType === 'manager',
          );
        }
      } catch (identityError) {
        console.warn('[Auth] Distribution identity lookup failed (non-fatal):', identityError);
      }

      // Feature 4: "Remember Me" Functionality
      const maxAge = rememberMe
        ? 30 * 24 * 60 * 60 * 1000 // 30 days
        : 24 * 60 * 60 * 1000; // 24 hours

      console.log('🍪 Setting cookie with name:', COOKIE_NAME);
      // Set session cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge,
      });
      console.log('✅ Cookie set successfully');

      const currentPlan = entitlements?.currentPlan || null;
      const trialStatus = entitlements?.trialStatusDetail || {
        status: entitlements?.trialStatus || 'none',
        trialEndsAt: entitlements?.trialEndsAt || null,
        daysRemaining: null,
      };

      // Return success with user info
      res.json({
        success: true,
        current_plan: currentPlan,
        trial_status: trialStatus,
        entitlements: entitlements?.featureFlags || entitlements || null,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          hasReferrerIdentity,
          hasManagerIdentity,
          entitlements,
          currentPlan,
          trialStatus,
        },
      });
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      console.error('Error stack:', error.stack);

      // Handle specific error cases with appropriate status codes
      const errorMessage = error.message || 'Unknown error';

      if (
        errorMessage.includes('Invalid email or password') ||
        errorMessage.includes('verify your email')
      ) {
        return res.status(401).json({ error: errorMessage });
      }

      if (errorMessage.includes('OAuth login')) {
        return res.status(403).json({ error: errorMessage });
      }

      if (errorMessage.includes('JWT_SECRET')) {
        return res
          .status(500)
          .json({ error: 'Server configuration error. Please contact support.' });
      }

      // Database connection errors
      if (errorMessage.includes('connect') || errorMessage.includes('ECONNREFUSED')) {
        return res
          .status(503)
          .json({ error: 'Database service unavailable. Please try again later.' });
      }

      res.status(500).json({
        error: 'Login failed',
        message: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
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
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}';:"\\|,.<>/?[\]]).{8,}$/;
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

      const verifiedUser = await authService.verifyEmail(token);

      if (verifiedUser.role === 'agent') {
        // Auto-create a session so agents can complete onboarding immediately
        // after clicking the email verification link.
        if (verifiedUser.email) {
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours
          const sessionToken = await authService.createSessionToken(
            verifiedUser.id,
            verifiedUser.email,
            verifiedUser.name || verifiedUser.email,
            { expiresInMs: maxAge },
          );
          const cookieOptions = getSessionCookieOptions(req);
          res.cookie(COOKIE_NAME, sessionToken, {
            ...cookieOptions,
            maxAge,
          });
        } else {
          console.warn(
            '[Auth] Verified agent missing email. Skipping auto-login and redirecting to onboarding.',
          );
        }

        res.redirect(`${ENV.appUrl}/onboarding/agent-profile?verified=true`);
        return;
      }

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
   * Resend email verification link.
   * POST /api/auth/resend-verification
   * Body: { email: string }
   */
  app.post('/api/auth/resend-verification', async (req: Request, res: Response) => {
    try {
      const { email } = req.body ?? {};
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'A valid email is required' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const key = `${ip}:${normalizedEmail}`;
      const now = Date.now();
      const lastSentAt = resendVerificationLastSentAt.get(key) || 0;
      const elapsed = now - lastSentAt;

      if (elapsed < RESEND_VERIFICATION_COOLDOWN_MS) {
        const retryAfterSeconds = Math.ceil((RESEND_VERIFICATION_COOLDOWN_MS - elapsed) / 1000);
        res.setHeader('Retry-After', String(retryAfterSeconds));
        return res.status(429).json({
          error: `Please wait ${retryAfterSeconds}s before requesting another verification email.`,
        });
      }

      await authService.resendVerificationEmail(normalizedEmail);
      resendVerificationLastSentAt.set(key, now);

      return res.json({
        success: true,
        message: 'If this account exists and is unverified, a verification email has been sent.',
      });
    } catch (error: any) {
      console.error('[Auth] Resend verification failed', error);
      return res.json({
        success: true,
        message: 'If this account exists and is unverified, a verification email has been sent.',
      });
    }
  });
}
