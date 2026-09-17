import { COOKIE_NAME } from '@shared/const';
import type { Express, Request, Response } from 'express';
import { getSessionCookieOptions } from './cookies';
import { authService } from './auth';
import { ENV } from './env';
import { isTransactionalEmailDeliveryAvailable } from './transactionalEmailConfig';
import { getActiveDistributionIdentityFlags } from '../services/distributionIdentityProjection';

const VERIFIED_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const getRequestId = (req: Request): string => {
  const requestId = (req as any).requestId;
  return typeof requestId === 'string' && requestId.trim().length > 0 ? requestId : 'unknown';
};

const getPostVerificationPath = (role: string | null | undefined): string => {
  switch (role) {
    case 'super_admin':
      return '/admin/overview?verified=true';
    case 'agent':
      return '/agent/setup?verified=true';
    case 'agency_admin':
      return '/agency/setup?verified=true';
    case 'property_developer':
      return '/developer/setup?verified=true';
    case 'service_provider':
      return '/service/profile?verified=true';
    default:
      return '/user/dashboard?verified=true';
  }
};

const RECOVERY_EMAIL_PENDING_MESSAGE =
  'If an account with that email exists, check your inbox for password reset instructions. If no email arrives, try again later.';

const VERIFICATION_EMAIL_PENDING_MESSAGE =
  'If this account exists and is unverified, check your inbox for verification instructions. If no email arrives, try again later.';

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
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
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
      const allowedRoles = [
        'agent',
        'agency_admin',
        'property_developer',
        'service_provider',
        'visitor',
      ];
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
          ? 'Registration successful! Please check your email to verify your account. Your agent profile is pending review and will unlock after verification and approval.'
          : role === 'service_provider'
            ? 'Registration successful! Please verify your email, then complete your partner profile.'
            : 'Registration successful. Please check your email to verify your account.';

      res.status(verificationEmailSent ? 201 : 202).json({
        success: true,
        verificationEmailSent,
        message: verificationEmailSent
          ? message
          : 'Account created, but we could not send the verification email right now. Please use resend verification before logging in.',
      });
    } catch (error: any) {
      console.error('[Auth] Registration failed', {
        requestId: getRequestId(req),
        code: error?.code || null,
        name: error?.name || null,
      });

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

      console.info('[Auth][Login] Attempt', { requestId });

      // Login user
      const { user, sessionToken } = await authService.login(email, password, rememberMe);
      console.info('[Auth][Login] Success', {
        requestId,
        userId: user.id,
      });

      let identityFlags = { hasReferrerIdentity: false, hasManagerIdentity: false };
      try {
        identityFlags = await getActiveDistributionIdentityFlags(user.id);
      } catch {
        // Authentication remains available if this optional projection is unavailable. The client
        // receives explicit false flags rather than stale or partially-resolved identity data.
        console.warn('[Auth] Distribution identity projection failed; returning false flags.', {
          requestId,
          userId: user.id,
        });
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
          ...identityFlags,
        },
      });
    } catch (error: any) {
      // Handle specific error cases with appropriate status codes
      const errorMessage = error?.message || 'Unknown error';

      console.error('[Auth][Login] Failure', {
        requestId,
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

      // This is a deployment-wide state, so returning it before account lookup
      // does not disclose whether the submitted email belongs to a user.
      if (!isTransactionalEmailDeliveryAvailable()) {
        return res.status(503).json({
          error: 'Password reset email is unavailable right now. Please try again later.',
        });
      }

      await authService.forgotPassword(email);

      // Do not claim a message was delivered: an existing account can still
      // encounter a provider-side failure, and that detail must not reveal
      // account existence.
      res.json({
        success: true,
        message: RECOVERY_EMAIL_PENDING_MESSAGE,
      });
    } catch (error: any) {
      console.warn('[Auth] Forgot password failed', {
        requestId: getRequestId(req),
        code: error?.code || null,
        name: error?.name || null,
      });
      // Do not reveal a provider error for one account and not another.
      res.json({
        success: true,
        message: RECOVERY_EMAIL_PENDING_MESSAGE,
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
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
      if (!passwordStrengthRegex.test(newPassword)) {
        return res.status(400).json({
          error:
            'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
        });
      }

      await authService.resetPassword(token, newPassword);

      res.json({ success: true, message: 'Your password has been reset successfully.' });
    } catch (error: any) {
      console.warn('[Auth] Reset password failed', {
        requestId: getRequestId(req),
        code: error?.code || null,
        name: error?.name || null,
      });
      res.status(400).json({ error: 'The password reset token is invalid or has expired.' });
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

      const user = await authService.verifyEmail(token);
      const sessionToken = await authService.createSessionToken(
        user.id,
        user.email || '',
        user.name || user.email || 'User',
        user.sessionVersion,
        { expiresInMs: VERIFIED_SESSION_MAX_AGE_MS },
      );

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: VERIFIED_SESSION_MAX_AGE_MS,
      });

      res.redirect(`${ENV.appUrl}${getPostVerificationPath(user.role)}`);
    } catch (error: any) {
      console.warn('[Auth] Email verification failed', {
        requestId: getRequestId(req),
        code: error?.code || null,
        name: error?.name || null,
      });
      res
        .status(400)
        .send(
          '<h1>Email Verification Failed</h1><p>The verification link is invalid or has expired.</p>',
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

      // As above, fail uniformly before account lookup when the deployed
      // runtime has no usable transactional-email configuration.
      if (!isTransactionalEmailDeliveryAvailable()) {
        return res.status(503).json({
          error: 'Verification email is unavailable right now. Please try again later.',
        });
      }

      await authService.resendVerificationEmail(email);

      res.json({
        success: true,
        message: VERIFICATION_EMAIL_PENDING_MESSAGE,
      });
    } catch (error: any) {
      console.warn('[Auth] Resend verification failed', {
        requestId: getRequestId(req),
        code: error?.code || null,
        name: error?.name || null,
      });
      // Keep the response independent of account existence. A deployed
      // configuration outage was already handled before the lookup above.
      res.json({
        success: true,
        message: VERIFICATION_EMAIL_PENDING_MESSAGE,
      });
    }
  });
}
