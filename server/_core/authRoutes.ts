/**
 * Custom Authentication Routes
 * Replaces Manus OAuth with email/password authentication
 */

import { COOKIE_NAME, ONE_YEAR_MS } from '@shared/const';
import type { Express, Request, Response } from 'express';
import { getSessionCookieOptions } from './cookies';
import { authService } from './auth';

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

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      // Register user
      const { user, sessionToken } = await authService.register(email, password, name);

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      // Return success with user info including role
      res.status(201).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
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
   * Body: { email: string, password: string }
   */
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Invalid input types' });
      }

      // Login user
      const { user, sessionToken } = await authService.login(email, password);

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      // Return success with user info including role
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
      console.error('[Auth] Login failed', error);

      if (error.message?.includes('Invalid email or password')) {
        return res.status(401).json({ error: error.message });
      }

      res.status(500).json({ error: 'Login failed' });
    }
  });

  /**
   * Logout (clear session cookie)
   * POST /api/auth/logout
   */
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });
}
