import type { Request, Response, NextFunction } from 'express';

/**
 * Minimal auth gate used by legacy express routes.
 * If your real auth attaches req.user elsewhere, this file still compiles
 * and enforces presence.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
