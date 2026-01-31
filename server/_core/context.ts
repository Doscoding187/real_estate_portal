import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import type { users } from '../../drizzle/schema';
import { authService } from './auth';

export type User = typeof users.$inferSelect;

/**
 * Base tRPC context created for each request.
 * Brand emulation context is applied later by brandContext middleware.
 */
export type TrpcContext = {
  req: CreateExpressContextOptions['req'];
  res: CreateExpressContextOptions['res'];
  user: User | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Try to authenticate using custom auth service
    user = await authService.authenticateRequest(opts.req);
  } catch (_error) {
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
