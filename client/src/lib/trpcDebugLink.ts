import { TRPCLink } from '@trpc/client';
import type { AppRouter } from '../../../server/routers';

/**
 * Debug link to log tRPC operations in production to catch malformed paths
 */
export const trpcDebugLink = (): TRPCLink<AppRouter> => {
  return () => {
    return ({ next, op }) => {
      console.log(`[tRPC op] type=${op.type} path=${op.path}`);
      return next(op);
    };
  };
};
