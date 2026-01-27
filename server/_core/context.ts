import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import type { User } from '../../drizzle/schema';
import { authService } from './auth';

export type TrpcContext = {
  req: CreateExpressContextOptions['req'];
  res: CreateExpressContextOptions['res'];
  user: User | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  // 🔍 DEBUG: Log everything (Disabled for cleaner logs)
  // console.log('=== TRPC CONTEXT ===');
  // console.log('Path:', opts.req.path);
  // console.log('Raw Cookie Header:', opts.req.headers.cookie);
  // console.log('Parsed Cookies:', opts.req.cookies);
  // console.log('All Cookie Keys:', Object.keys(opts.req.cookies || {}));
  // console.log('SessionId Cookie:', opts.req.cookies?.app_session_id);
  // console.log('===================');

  let user: User | null = null;

  try {
    // Try to authenticate using custom auth service
    user = await authService.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    // If auth fails, user remains null and public endpoints still work.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
