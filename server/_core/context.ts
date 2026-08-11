import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import type { users } from '../../drizzle/schema';
import { authService } from './auth';

export type User = typeof users.$inferSelect;

/**
 * Base tRPC context created for each request.
 * Server-authorized operating identity is applied later by brandContext
 * middleware. A browser header is only a request for that resolution.
 */
export type TrpcContext = {
  req: CreateExpressContextOptions['req'];
  res: CreateExpressContextOptions['res'];
  user: User | null;
  requestId: string;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;
  const requestIdFromReq = (opts.req as any)?.requestId;
  const requestId =
    typeof requestIdFromReq === 'string' && requestIdFromReq.trim().length > 0
      ? requestIdFromReq
      : 'unknown';

  try {
    // Try to authenticate using custom auth service
    user = await authService.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    // If auth fails, user remains null and public endpoints still work.
    console.warn('[AuthContext] authenticateRequest failed', {
      requestId,
      message: (error as any)?.message || String(error),
      code: (error as any)?.code || null,
      name: (error as any)?.name || null,
    });
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    requestId,
  };
}
