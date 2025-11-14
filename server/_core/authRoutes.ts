import { COOKIE_NAME } from '@shared/const';
import type { Express, Request, Response } from 'express';
import { getSessionCookieOptions } from './cookies';
import { authService } from './auth';
import { ENV } from './env';

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
      const { email, password, name } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Invalid input types' });
      }

      // Feature 3: Password Strength Requirements
      const passwordStrengthRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
      if (!passwordStrengthRegex.test(password)) {
        return res.status(400).json({
          error:
            'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
        });
      }

      // Register user (sends verification email)
      await authService.register(email, password, name);

      // Return success message - user must verify email before logging in
      res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
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
      const { user, sessionToken } = await authService.login(email, password, rememberMe);
      console.log('✅ Auth service returned user:', user.email);

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

      // Return success with user info
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      console.error('Error stack:', error.stack);

      if (error.message?.includes('Invalid') || error.message?.includes('verify')) {
        return res.status(401).json({ error: error.message });
      }

      res.status(500).json({
        error: 'Login failed',
        message: error.message,
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
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
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
}
